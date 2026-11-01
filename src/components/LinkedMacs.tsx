import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { hostState, type AccountHost } from "@/lib/host-enrollment";
import { createHostLink, linkedHosts, revokeLinkedHost } from "@/lib/host-link.functions";
import { requestSequence } from "@/lib/request-sequence";

/** Account-linked Macs from the backend. Status reflects the Mac helper's own check-ins, never a guess. */
export function LinkedMacs() {
  const list = useServerFn(linkedHosts), issue = useServerFn(createHostLink), revokeHost = useServerFn(revokeLinkedHost);
  const sequence = useRef(requestSequence()), creating = useRef(false), alive = useRef(true);
  const [hosts, setHosts] = useState<AccountHost[] | null>(null);
  const [code, setCode] = useState<{ value: string; expires: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const id = sequence.current.begin();
    try { const data = await list(); if (sequence.current.isCurrent(id) && alive.current) setHosts(data); }
    catch { if (sequence.current.isCurrent(id) && alive.current) setError("Couldn't load your linked computers. Check your connection and sign-in."); }
  }, [list]);
  useEffect(() => { alive.current = true; void refresh(); const t = setInterval(() => { setNow(Date.now()); void refresh(); }, 15000); return () => { alive.current = false; sequence.current.invalidate(); clearInterval(t); }; }, [refresh]);

  async function create() {
    if (creating.current) return;
    creating.current = true;
    setBusy(true); setError("");
    setCode(null);
    try { const result = await issue(); if (alive.current) setCode(result); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Code request failed. Try again."); }
    finally { creating.current = false; if (alive.current) setBusy(false); }
  }
  async function revoke(h: AccountHost) {
    if (!confirm(`Revoke ${h.name}? Its Honeycomb helper disconnects every phone within about a minute and stops pairing.`)) return;
    setBusy(true); setError("");
    try { await revokeHost({ data: { id: h.id } }); await refresh(); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Revoke failed. Try again."); }
    finally { if (alive.current) setBusy(false); }
  }

  const active = (hosts ?? []).filter((h) => !h.revoked_at);
  return (
    <section aria-labelledby="linked-h" className="rounded-md border border-primary bg-card p-4 space-y-3">
      <h2 id="linked-h" className="font-medium text-primary">Macs linked to your account</h2>
      {hosts === null && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
      {hosts && active.length === 0 && <p className="text-sm text-muted-foreground">None yet. Start Honeycomb on your Mac, then link it here once.</p>}
      <ul className="space-y-2">
        {(hosts ?? []).map((h) => {
          const st = hostState(h, now);
          return (
            <li key={h.id} className="rounded border border-border p-3 text-sm space-y-1">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{h.name}</span>
                <span className={st.tone}>{st.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{st.detail}</p>
              <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Advanced</summary>Certificate SHA-256 {h.fingerprint} — must match Safari's certificate details and the Mac window.</details>
              {!h.revoked_at && <Button disabled={busy} variant="outline" size="sm" onClick={() => void revoke(h)}>Revoke this Mac</Button>}
            </li>
          );
        })}
      </ul>
      {code ? (
        <div className="rounded border border-primary p-3 space-y-1">
          <p className="text-sm">In the Mac's Honeycomb window type:</p>
          {Date.parse(code.expires) > now ? <p className="font-mono text-lg text-primary break-all">link {code.value}</p> : <p role="status" className="text-sm text-warning">Account link code expired — request a new one.</p>}
          <p className="text-xs text-muted-foreground">Account link only · one use · expires {new Date(code.expires).toLocaleTimeString()}. This is not the 8-character Mac shell pairing code.</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>I typed it — refresh</Button>
          <Button disabled={busy} variant="outline" size="sm" onClick={() => void create()}>Request new link code</Button>
        </div>
      ) : (
        <Button disabled={busy} onClick={() => void create()}>{busy ? "Requesting code…" : "Link this Mac"}</Button>
      )}
      {busy && <p role="status" className="text-sm text-muted-foreground">Waiting for account confirmation…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
