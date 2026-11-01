import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { requestSequence } from '@/lib/request-sequence';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { accountStatus, myHosts } from '@/lib/members.functions';
import { deriveStatuses, hostState, STATE_LABEL, type FeatureState, type HostRecord, type StatusInput } from '@/lib/feature-status';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [{ title: 'Owner dashboard — Honeycomb Terminal' }, { name: 'description', content: 'Private, truthful status of your account, Mac link, terminal and connectors.' }, { property: 'og:title', content: 'Owner dashboard — Honeycomb Terminal' }, { property: 'og:description', content: 'Live, pending, simulated and failed features with evidence and next steps.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: Dashboard,
});

const TONE: Record<FeatureState, string> = { live: 'border-primary text-primary', pending: 'border-warning text-warning', simulated: 'border-muted-foreground text-muted-foreground', failed: 'border-destructive text-destructive' };

function Dashboard() {
  const status = useServerFn(accountStatus), hostsFn = useServerFn(myHosts);
  const [input, setInput] = useState<StatusInput | null>(null);
  const sequence = useRef(requestSequence());
  async function refresh() {
    const id = sequence.current.begin();
    setInput(null);
    let membership: StatusInput['membership'] = 'error', role: string | null = null;
    try { const s = await status(); membership = s.state === 'member' ? 'member' : s.state === 'revoked' ? 'revoked' : 'none'; if (s.state === 'member') role = s.role; } catch { /* stays error */ }
    let hosts: HostRecord[] | null = null, hostsError = false;
    if (membership === 'member') { try { hosts = await hostsFn(); } catch { hostsError = true; } }
    if (sequence.current.isCurrent(id)) setInput({ membership, role, hosts, hostsError, now: Date.now() });
  }
  useEffect(() => { void refresh(); const t = setInterval(() => setInput(i => i ? { ...i, now: Date.now() } : i), 15000); return () => { sequence.current.invalidate(); clearInterval(t); }; }, []);
  const rows = input ? deriveStatuses(input) : [];
  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold text-primary">Owner dashboard</h1><p className="text-sm text-muted-foreground">Checked against the server each time you open or refresh this page.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()}>Refresh</Button><Button asChild><Link to="/terminal/sandbox">Open Terminal</Link></Button></div>
      </div>
      {!input ? <p className="mt-6 text-sm text-muted-foreground">Checking…</p> : (
        <ul className="mt-6 space-y-3" aria-label="Feature status">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{r.name}</h2><span className={`rounded-full border px-2 py-0.5 text-xs ${TONE[r.state]}`}>{STATE_LABEL[r.state]}</span></div>
              <p className="mt-1 text-sm text-muted-foreground"><span className="text-foreground">Evidence:</span> {r.evidence}</p>
              <p className="text-sm"><span className="text-muted-foreground">Next:</span> {r.to ? <Link to={r.to} className="underline">{r.next}</Link> : r.next}</p>
            </li>))}
        </ul>)}
      {input?.hosts && input.hosts.length > 0 && <section className="mt-6"><h2 className="font-medium text-primary">Enrolled computers</h2><ul className="mt-2 space-y-1 text-sm">{input.hosts.map((h) => <li key={h.id}>{h.name} · {h.os} · {STATE_LABEL[hostState(h, input.now)]}{h.last_seen ? ` · last heartbeat ${new Date(h.last_seen).toLocaleString()}` : ' · never connected'}</li>)}</ul></section>}
    </AppShell>
  );
}
