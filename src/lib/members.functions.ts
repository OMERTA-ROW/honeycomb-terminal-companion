import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireActiveAccount } from './account.functions';
import { inviteSchema, tokenSchema } from './members-schema';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { membershipState, ownerClaimAllowed, type MembershipState } from './owner-claim';

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function origin() {
  const url = new URL(getRequest().url);
  const fwd = url.hostname === 'localhost' ? getRequest().headers.get('x-forwarded-host') : null;
  return fwd ? `https://${fwd}` : url.origin;
}
const GENERIC = 'Request could not be completed.';

export const myRole = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const r = await context.supabase.rpc('hc_my_role');
  return { role: (r.data ?? null) as 'owner' | 'admin' | 'member' | null };
});

export const adminOverview = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const r = await context.supabase.rpc('hc_admin_overview');
  if (r.error) throw new Error('Not authorized.');
  return r.data as { role: string; members: { user_id: string; role: string; email: string; display_name: string | null }[]; invites: { id: string; email: string; role: string; expires_at: string; state: string }[] };
});

export const createInvite = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(inviteSchema).handler(async ({ context, data }) => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = await context.supabase.rpc('hc_create_invite', { p_email: data.email, p_role: data.role, p_token_hash: await sha256Hex(token), p_hours: data.hours });
  if (r.error) throw new Error(r.error.message.includes('authorized') ? 'Not authorized to create this invitation.' : 'Invitation could not be created.');
  // The raw token is shown once to the inviter and never stored.
  return { link: `${origin()}/invite?token=${token}` };
});

export const revokeInvite = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ id: z.string().uuid() }).strict()).handler(async ({ context, data }) => {
  const r = await context.supabase.rpc('hc_revoke_invite', { p_id: data.id });
  if (r.error) throw new Error('Invitation could not be revoked.');
  return { ok: true };
});

export const setMemberRole = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ user: z.string().uuid(), role: z.enum(['admin', 'member']) }).strict()).handler(async ({ context, data }) => {
  const r = await context.supabase.rpc('hc_set_role', { p_user: data.user, p_role: data.role });
  if (r.error) throw new Error('Owner only.');
  return { ok: true };
});

export const removeMember = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ user: z.string().uuid() }).strict()).handler(async ({ context, data }) => {
  const r = await context.supabase.rpc('hc_remove_member', { p_user: data.user });
  if (r.error) throw new Error('Owner only.');
  return { ok: true };
});

/** Public: the invitation token itself is the credential; email ownership is then proven by the emailed link. */
export const acceptInvite = createServerFn({ method: 'POST' }).inputValidator(tokenSchema).handler(async ({ data }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const consumed = await supabaseAdmin.rpc('hc_consume_invite', { p_token_hash: await sha256Hex(data.token), p_email: data.email });
  const inv = consumed.data as { id?: string; role?: 'admin' | 'member'; error?: string } | null;
  if (consumed.error || !inv?.id || !inv.role) return { error: inv?.error ?? 'Invitation invalid, expired, revoked or already used.' };
  const sent = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${origin()}/reset-password` });
  if (sent.error || !sent.data.user) {
    await supabaseAdmin.from('hc_invitations').update({ used_at: null }).eq('id', inv.id);
    return { error: 'The sign-in email could not be sent (the address may already have an account, or the hourly email limit was reached). The invitation is still valid.' };
  }
  await supabaseAdmin.rpc('hc_finish_invite', { p_invite: inv.id, p_user: sent.data.user.id, p_role: inv.role });
  return { sent: true };
});

async function ownerEligibility(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [u, exists] = await Promise.all([supabaseAdmin.auth.admin.getUserById(userId), supabaseAdmin.rpc('hc_owner_exists')]);
  const user = u.data.user;
  return { supabaseAdmin, allowed: !u.error && !exists.error && ownerClaimAllowed({ configured: process.env['HC_OWNER_EMAIL'], email: user?.email, emailVerified: Boolean(user?.email_confirmed_at), ownerExists: exists.data === true, hasRole: false }) };
}

/** Signed-in only: tells the caller whether they are a member, revoked, or have no membership. Owner eligibility is only ever true for the verified configured owner address. */
export const accountStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<MembershipState> => {
  const [role, allowed] = await Promise.all([context.supabase.rpc('hc_my_role'), context.supabase.rpc('hc_session_allowed')]);
  if (role.error || allowed.error) throw new Error(GENERIC);
  if (role.data) return membershipState(role.data, allowed.data === true, false);
  const { allowed: claimable } = await ownerEligibility(context.userId);
  return membershipState(null, false, claimable);
});

/** Signed-in only: one-time owner bootstrap for the verified configured owner identity. Others get a generic denial. */
export const claimOwner = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const mine = await context.supabase.rpc('hc_my_role');
  if (mine.data === 'owner') return { ok: true as const };
  if (mine.error || mine.data) return { ok: false as const, message: GENERIC };
  const { supabaseAdmin, allowed } = await ownerEligibility(context.userId);
  if (!allowed) return { ok: false as const, message: GENERIC };
  const boot = await supabaseAdmin.rpc('hc_bootstrap_owner', { p_user: context.userId });
  return boot.error ? { ok: false as const, message: GENERIC } : { ok: true as const };
});

export const myHosts = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const r = await context.supabase.from('hc_hosts').select('id,name,os,last_seen,revoked_at').order('created_at');
  if (r.error) throw new Error('Computers unavailable.');
  return r.data;
});
