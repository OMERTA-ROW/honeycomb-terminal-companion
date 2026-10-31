import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { enrollmentCode, hostState, type AccountHost } from "@/lib/host-enrollment";

async function sha256Hex(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Account-linked Macs from the backend. Status reflects the Mac helper's own check-ins, never a guess. */
export function LinkedMacs() {
  const [hosts, setHosts] = useState<AccountHost[] | null>(null);
  const [code, setCode] = useState<{ value: string; expires: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("hc_my_hosts");
    if (error) { setError("Couldn't load your linked computers. Check your connection and sign-in."); return; }
    setHosts((data ?? []) as AccountHost[]);
  }, []);
  useEffect(() => { void refresh(); const t = setInterval(() => { setNow(Date.now()); void refresh(); }, 15000); return () => clearInterval(t); }, [refresh]);

  async function create() {
    setBusy(true); setError("");
    const value = enrollmentCode();
    const { data, error } = await supabase.rpc("hc_create_host_enrollment", { p_code_hash: await sha256Hex(value) });
    setBusy(false);
    if (error) { setError("Couldn't create a link code. Your account may need an invitation or a fresh sign-in."); return; }
    setCode({ value, expires: data as string });
  }
  async function revoke(h: AccountHost) {
    if (!confirm(`Revoke ${h.name}? Its Honeycomb helper disconnects every phone within about a minute and stops pairing.`)) return;
    const { error } = await supabase.rpc("hc_revoke_host", { p_host: h.id });
    if (error) setError("Revoke failed. Try again.");
    await refresh();
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
              {!h.revoked_at && <Button variant="outline" size="sm" onClick={() => void revoke(h)}>Revoke this Mac</Button>}
            </li>
          );
        })}
      </ul>
      {code ? (
        <div className="rounded border border-primary p-3 space-y-1">
          <p className="text-sm">In the Mac's Honeycomb window type:</p>
          <p className="font-mono text-lg text-primary break-all">link {code.value}</p>
          <p className="text-xs text-muted-foreground">One use · expires {new Date(code.expires).toLocaleTimeString()}. Then refresh this list.</p>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>I typed it — refresh</Button>
        </div>
      ) : (
        <Button disabled={busy} onClick={() => void create()}>Link this Mac</Button>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
