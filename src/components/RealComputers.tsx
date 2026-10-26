import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { useAccountUser } from '@/hooks/use-account-user';
import { myHosts } from '@/lib/members.functions';

/** Real, account-owned computer records. Only a verified companion could add one; none exists yet. */
export function RealComputers() {
  const { user, ready } = useAccountUser();
  const load = useServerFn(myHosts);
  const [hosts, setHosts] = useState<Awaited<ReturnType<typeof myHosts>> | null>(null), [err, setErr] = useState(false);
  useEffect(() => { setHosts(null); setErr(false); if (user) void load().then(setHosts).catch(() => setErr(true)); }, [user?.id]);
  return (
    <section aria-label="Your real computers" className="mb-8 rounded-md border border-border p-4">
      <h2 className="font-medium text-primary">Your computers · real account</h2>
      {!ready ? <p className="text-sm text-muted-foreground mt-1">Checking account…</p>
        : !user ? <p className="text-sm text-muted-foreground mt-1"><Link to="/account" search={{ redirect: '/' }} className="underline">Sign in</Link> to see computers registered to your account.</p>
        : err ? <p className="text-sm text-warning mt-1">Unavailable — your session may be revoked or you have no membership.</p>
        : hosts === null ? <p className="text-sm text-muted-foreground mt-1">Loading…</p>
        : hosts.length === 0 ? <p className="text-sm text-muted-foreground mt-1">No computers yet. A real computer appears here only after the Mac companion app (not yet built) is installed and paired. The hive below is Demo data.</p>
        : <ul className="mt-2 text-sm space-y-1">{hosts.map((h) => <li key={h.id}>{h.name} · {h.os} · {h.revoked_at ? 'revoked' : h.last_seen ? `last seen ${new Date(h.last_seen).toLocaleString()}` : 'never connected'}</li>)}</ul>}
    </section>
  );
}
