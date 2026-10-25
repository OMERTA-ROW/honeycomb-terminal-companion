import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAccountUser } from '@/hooks/use-account-user';
import { readAccount, saveProfile, revokeAccountSessions } from '@/lib/account.functions';

export const Route = createFileRoute('/account')({ head: () => ({ meta: [{ title: 'Your account — Honeycomb Terminal' }, { name: 'description', content: 'Manage your private Honeycomb Terminal profile and account sessions.' }, { property: 'og:title', content: 'Your account — Honeycomb Terminal' }, { property: 'og:description', content: 'Private account, basic preferences and security history.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: Account });
function Account() {
  const { user, ready } = useAccountUser(); const load = useServerFn(readAccount), save = useServerFn(saveProfile), revoke = useServerFn(revokeAccountSessions);
  const query = useQueryClient(), navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [displayName, setDisplayName] = useState(''), [wifi, setWifi] = useState(true);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof readAccount>>['audit']>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [note, setNote] = useState('');
  useEffect(() => { let alive = true; setAudit([]); setDisplayName(''); setPassword(''); if (user) void load().then(r => { if (alive) { setDisplayName(r.profile.display_name); setWifi((r.profile.preferences as { wifi_only?: boolean }).wifi_only ?? true); setAudit(r.audit); } }).catch(() => { if (alive) setError('Account unavailable or session revoked. Sign in again.'); }); return () => { alive = false; }; }, [user?.id]);
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setNote(''); try { await fn(); } catch { setError('Request failed. Check your details or try again.'); } finally { setBusy(false); setPassword(''); } }
  async function submit() {
    if (mode === 'recovery') { const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (r.error) throw r.error; setNote('If this address has an account, check its email for a reset link.'); return; }
    if (mode === 'signup') { const r = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (r.error) throw r.error; setNote(r.data.session ? 'Signed in.' : 'Check your email to confirm your account before signing in.'); return; }
    const r = await supabase.auth.signInWithPassword({ email, password }); if (r.error) throw r.error;
  }
  async function signout(all: boolean) {
    if (all && !window.confirm('Sign out every Honeycomb Terminal account session? Device trust remains separate.')) return;
    await revoke({ data: { all } }); await query.cancelQueries(); query.clear();
    const r = await supabase.auth.signOut({ scope: all ? 'global' : 'local' });
    if (r.error) setNote('Application access revoked. Provider sign-out could not be confirmed; retry signing out.');
    await navigate({ to: '/account', replace: true });
  }
  const field = 'block w-full mt-1 border rounded-md bg-background p-2 text-sm';
  return <AppShell><h1 className="text-2xl font-semibold">Your account</h1>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}{note && <p role="status" className="mt-3 text-success">{note}</p>}
    {!ready ? <p className="mt-4 text-muted-foreground">Checking account…</p> : !user ? <section className="mt-5 max-w-md">
      <div className="flex flex-wrap gap-2 mb-4">{(['login','signup','recovery'] as const).map(m => <Button key={m} variant={mode===m?'default':'outline'} onClick={() => { setMode(m); setError(''); setNote(''); }}>{m==='login'?'Sign in':m==='signup'?'Create account':'Forgot password'}</Button>)}</div>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run(submit); }}><label className="block">Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={field}/></label>{mode!=='recovery' && <label className="block">Password<input type="password" required minLength={mode==='signup'?8:1} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className={field}/></label>}<Button disabled={busy} type="submit">{mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset email'}</Button></form>
      <div className="mt-5 flex flex-wrap gap-2">{(['google','lovable'] as const).map(provider => <Button key={provider} disabled={busy} variant="outline" onClick={() => void run(async () => { const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin+'/account' }); if (r.error) throw r.error; })}>Sign in with {provider==='google'?'Google':'Lovable'}</Button>)}</div>
    </section> : <>
      <p className="mt-3 text-sm break-all">{user.email}</p><section className="mt-5 max-w-md"><form className="space-y-4" onSubmit={e=>{e.preventDefault(); void run(async()=>{await save({data:{display_name:displayName,preferences:{wifi_only:wifi}}}); const r=await load(); setAudit(r.audit); setNote('Profile saved.');});}}><label className="block">Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={60} className={field}/></label><label className="flex gap-2"><input type="checkbox" checked={wifi} onChange={e=>setWifi(e.target.checked)}/>Prefer Wi-Fi for Honeycomb transfers</label><p className="text-xs text-warning">Saved preference only. Browsers cannot reliably enforce Wi-Fi-only transfers.</p><Button type="submit" disabled={busy}>Save profile</Button></form></section>
      <section className="mt-6 border-t pt-4"><h2 className="font-medium">Account sessions</h2><div className="flex flex-wrap gap-2 mt-3"><Button variant="outline" disabled={busy} onClick={()=>void run(()=>signout(false))}>Sign out this session</Button><Button variant="outline" disabled={busy} onClick={()=>void run(()=>signout(true))}>Sign out all sessions</Button></div><p className="text-xs text-muted-foreground mt-3">Subsequent Terminal account and transfer requests are denied after revocation. Provider tokens can remain valid until expiry; device trust is revoked separately.</p><Button asChild variant="link"><Link to="/transfer">Manage trusted devices</Link></Button></section>
      <section className="mt-6 border-t pt-4"><h2 className="font-medium">Security history</h2><ul className="mt-3 text-xs space-y-2 text-muted-foreground">{audit.map(a=><li key={a.id}>{new Date(a.created_at).toLocaleString()} · {a.event.replaceAll('_',' ')}</li>)}</ul></section>
    </>}
  </AppShell>;
}