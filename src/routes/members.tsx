import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useAccountUser } from '@/hooks/use-account-user';
import { adminOverview, createInvite, revokeInvite, setMemberRole, removeMember } from '@/lib/members.functions';

export const Route = createFileRoute('/members')({
  head: () => ({ meta: [{ title: 'Members & invitations — Honeycomb Terminal' }, { name: 'description', content: 'Owner and admin management of private Honeycomb Terminal accounts.' }, { property: 'og:title', content: 'Members & invitations — Honeycomb Terminal' }, { property: 'og:description', content: 'Invite private testers and manage roles.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Members,
});

type Overview = Awaited<ReturnType<typeof adminOverview>>;

function Members() {
  const { user, ready } = useAccountUser();
  const load = useServerFn(adminOverview), invite = useServerFn(createInvite), revoke = useServerFn(revokeInvite), setRole = useServerFn(setMemberRole), remove = useServerFn(removeMember);
  const [data, setData] = useState<Overview | null>(null), [denied, setDenied] = useState(false);
  const [email, setEmail] = useState(''), [role, setR] = useState<'member' | 'admin'>('member'), [hours, setHours] = useState(72);
  const [link, setLink] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = () => load().then((d) => { setData(d); setDenied(false); }).catch(() => setDenied(true));
  useEffect(() => { setData(null); setLink(''); if (user) void refresh(); }, [user?.id]);
  async function act(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { setBusy(false); } }
  const field = 'mt-1 block w-full rounded-md border bg-background p-2 text-sm';

  if (!ready) return <AppShell><p className="text-muted-foreground">Checking account…</p></AppShell>;
  if (!user) return <AppShell><h1 className="text-2xl font-semibold">Members & invitations</h1><p className="mt-3 text-muted-foreground">Sign in as the owner or an admin to manage members.</p><Button asChild className="mt-4"><Link to="/account" search={{ redirect: '/members' }}>Sign in</Link></Button></AppShell>;
  if (denied) return <AppShell><h1 className="text-2xl font-semibold">Members & invitations</h1><p role="alert" className="mt-3 text-warning">Only the owner and admins can manage members.</p></AppShell>;
  if (!data) return <AppShell><p className="text-muted-foreground">Loading members…</p></AppShell>;
  const owner = data.role === 'owner';
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Members & invitations</h1>
      <p className="text-sm text-muted-foreground mt-1">You are {data.role}. {owner ? 'You can invite admins or members, change roles and remove people.' : 'Admins can invite members only.'} No email is sent until the invitee opens the link and asks for it.</p>
      {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end max-w-3xl" onSubmit={(e) => { e.preventDefault(); void act(async () => { const r = await invite({ data: { email, role, hours } }); setLink(r.link); setEmail(''); }); }}>
        <label className="text-sm">Invitee email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
        <label className="text-sm">Role<select value={role} onChange={(e) => setR(e.target.value as 'member' | 'admin')} className={field}><option value="member">Member</option>{owner && <option value="admin">Admin</option>}</select></label>
        <label className="text-sm">Expires (hours)<input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={field} /></label>
        <Button disabled={busy}>Create invitation</Button>
      </form>
      {link && <div className="mt-4 rounded-md border border-primary/50 p-3 text-sm max-w-3xl"><p>Single-use link for that email only. Shown once — copy it and send it privately.</p><code className="block mt-2 break-all text-xs">{link}</code><Button variant="outline" className="mt-2" onClick={() => void navigator.clipboard.writeText(link)}>Copy link</Button></div>}
      <section className="mt-6 border-t pt-4"><h2 className="font-medium">Members ({data.members.length})</h2>
        <ul className="mt-3 space-y-2 text-sm">{data.members.map((m) => <li key={m.user_id} className="flex flex-wrap items-center gap-2"><span className="break-all">{m.display_name || m.email}</span><span className="text-xs text-muted-foreground">{m.role}</span>
          {owner && m.role !== 'owner' && <><Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => setRole({ data: { user: m.user_id, role: m.role === 'admin' ? 'member' : 'admin' } }))}>{m.role === 'admin' ? 'Make member' : 'Make admin'}</Button><Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => confirm(`Remove ${m.email}? Their sessions and devices are revoked.`) && void act(() => remove({ data: { user: m.user_id } }))}>Remove</Button></>}</li>)}</ul></section>
      <section className="mt-6 border-t pt-4"><h2 className="font-medium">Invitations</h2>
        {data.invites.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No invitations yet.</p> :
        <ul className="mt-3 space-y-2 text-sm">{data.invites.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2"><span className="break-all">{i.email}</span><span className="text-xs text-muted-foreground">{i.role} · {i.state} · expires {new Date(i.expires_at).toLocaleString()}</span>{i.state === 'pending' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => revoke({ data: { id: i.id } }))}>Revoke</Button>}</li>)}</ul>}
      </section>
    </AppShell>
  );
}
