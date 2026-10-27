import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { amrFromAccessToken, recoveryAllowed } from '@/lib/recovery-session';
export const Route = createFileRoute('/reset-password')({ head: () => ({ meta: [{ title:'Reset password — Honeycomb Terminal' },{ name:'description',content:'Set a new password using your Honeycomb recovery email.' },{ property:'og:title',content:'Reset password — Honeycomb Terminal' },{ property:'og:description',content:'Secure email recovery for your Terminal account.' },{ property:'og:type',content:'website' },{ name:'twitter:card',content:'summary' }] }), component: Reset });
function Reset() {
  const [valid,setValid]=useState(false),[checking,setChecking]=useState(true),[linkError,setLinkError]=useState(''),[signedIn,setSignedIn]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    // The auth client consumes the link's #hash before this effect runs, so decide from the session itself:
    // only a session created by a recovery/invite email link within the last hour may set a password.
    const q = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    if (q.get('error_code') || q.get('error')) setLinkError(q.get('error_code') === 'otp_expired' ? 'This email link has expired or was already used.' : 'This email link is invalid or was already used.');
    let alive = true;
    const check = async () => { const { data } = await supabase.auth.getSession(); const s = data.session; if (!alive) return; setSignedIn(Boolean(s)); setValid(Boolean(s) && recoveryAllowed(amrFromAccessToken(s?.access_token), Math.floor(Date.now()/1000))); setChecking(false); };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN' || ev === 'PASSWORD_RECOVERY' || ev === 'INITIAL_SESSION') void check(); });
    return () => { alive = false; subscription.unsubscribe(); };
  },[]);
  return <AppShell><h1 className="text-2xl font-semibold">Set password</h1>
    {checking ? <p className="mt-4 text-muted-foreground">Checking your email link…</p>
    : !valid ? <div className="mt-4 space-y-2 max-w-md"><p role="alert" className="text-warning">{linkError || (signedIn ? 'You are signed in, but not through a recent recovery or invitation link, so a password cannot be set here.' : 'Open a valid recovery or invitation email link to set your password.')}</p><p className="text-sm text-muted-foreground">Email links work once. If yours was already opened, use Account → Forgot password once for a fresh link and open it in the same browser.</p></div>
    : <form className="mt-5 space-y-4 max-w-md" onSubmit={async e=>{e.preventDefault(); if(password!==confirm){setNote('Passwords do not match.');return;} setBusy(true); const r=await supabase.auth.updateUser({password}); setBusy(false); setPassword('');setConfirm('');setNote(r.error?'Password could not be set. Request a new recovery email.':'Password set. You are signed in.');if(!r.error)setValid(false);}}>{['New password','Confirm password'].map((label,i)=><label key={label} className="block">{label}<input required type="password" minLength={8} autoComplete="new-password" value={i?confirm:password} onChange={e=>i?setConfirm(e.target.value):setPassword(e.target.value)} className="block mt-1 w-full rounded-md border bg-background p-2"/></label>)}<Button disabled={busy}>Set password</Button></form>}
    {note&&<p role="status" className="mt-4">{note}</p>}<Button asChild variant="link" className="mt-4"><Link to="/account">Back to account</Link></Button></AppShell>;
}
