import { createServerFn, createMiddleware } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { profileSchema } from './account-schema';
import { z } from 'zod';

export const requireActiveAccount = createMiddleware({ type: 'function' }).middleware([requireSupabaseAuth]).server(async ({ next, context }) => {
  const { data, error } = await context.supabase.rpc('hc_session_allowed');
  if (error || data !== true) throw new Error('Session expired or revoked. Sign in again.');
  return next({ context });
});
export const readAccount = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).handler(async ({ context }) => {
  const profile = await context.supabase.from('profiles').select('display_name,preferences').eq('id', context.userId).single();
  const audit = await context.supabase.from('hc_account_audit').select('id,event,created_at').eq('owner_id', context.userId).order('created_at', { ascending: false }).limit(50);
  if (profile.error || audit.error) throw new Error('Account unavailable. Try signing in again.');
  return { profile: profile.data, audit: audit.data };
});
export const saveProfile = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(profileSchema).handler(async ({ context, data }) => {
  const result = await context.supabase.from('profiles').update(data).eq('id', context.userId).select('display_name,preferences').single();
  if (result.error) throw new Error('Profile could not be saved.');
  return result.data;
});
export const revokeAccountSessions = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ all: z.boolean() }).strict()).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('hc_revoke_sessions', { p_all: data.all });
  if (result.error) throw new Error('Sessions could not be revoked. Try again.');
  return { revoked: true };
});