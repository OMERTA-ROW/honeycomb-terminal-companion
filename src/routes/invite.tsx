import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { z } from 'zod';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { acceptInvite } from '@/lib/members.functions';

export const Route = createFileRoute('/invite')({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({ meta: [{ title: 'Accept invitation — Honeycomb Terminal' }, { name: 'description', content: 'Accept a private Honeycomb Terminal invitation.' }, { property: 'og:title', content: 'Accept invitation — Honeycomb Terminal' }, { property: 'og:description', content: 'Join a private Honeycomb Terminal test.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'referrer', content: 'no-referrer' }] }),
  component: Invite,
});

function Invite() {
  const { token } = Route.useSearch();
  const accept = useServerFn(acceptInvite);
  const [email, setEmail] = useState(''), [msg, setMsg] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      {!token ? <p className="mt-3 text-warning">This page needs the invitation link the owner sent you.</p> : ok ? (
        <p role="status" className="mt-4">Check your email and open the link to set your own password. You'll then be signed in.</p>
      ) : (
        <form className="mt-5 max-w-md space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(''); try { const r = await accept({ data: { token, email } }); if ('sent' in r) setOk(true); else setMsg(r.error); } catch { setMsg('Invitation link is malformed or the request failed.'); } finally { setBusy(false); } }}>
          <p className="text-sm text-muted-foreground">Enter the email address this invitation was issued to. We'll email you a link to set your password; no one else ever sees it.</p>
          <label className="block">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" /></label>
          <Button disabled={busy}>Send my sign-in email</Button>
          {msg && <p role="alert" className="text-destructive text-sm">{msg}</p>}
        </form>
      )}
      <Button asChild variant="link" className="mt-4"><Link to="/account">Already have an account? Sign in</Link></Button>
    </AppShell>
  );
}
