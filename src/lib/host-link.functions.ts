import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireActiveAccount } from './account.functions';
import { enrollmentCode, type AccountHost } from './host-enrollment';

export const linkedHosts = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const r = await context.supabase.rpc('hc_my_hosts');
  if (r.error) throw new Error('Linked computers unavailable. Check your connection and sign-in.');
  return (r.data ?? []) as AccountHost[];
});

export const createHostLink = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const value = enrollmentCode();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const p_code_hash = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  const r = await context.supabase.rpc('hc_create_host_enrollment', { p_code_hash });
  if (r.error || typeof r.data !== 'string' || !Number.isFinite(Date.parse(r.data))) throw new Error('Link code not created. Check your connection and sign in again; an active invitation is required.');
  return { value, expires: r.data };
});

export const revokeLinkedHost = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ context, data }) => {
  const r = await context.supabase.rpc('hc_revoke_host', { p_host: data.id });
  if (r.error) throw new Error('Revoke not confirmed. Check your connection and retry.');
  return { ok: true };
});