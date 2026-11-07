import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { OctagonX, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { accountStatus } from "@/lib/members.functions";
import { useAccountUser } from "@/hooks/use-account-user";
import {
  DEFAULT_SETTINGS, LOCAL_CAPABILITIES, LOCAL_LIMITS, OMNI_SCOPES, emergencyStop, gates, modeState, parseSettings,
  type AutonomyEvidence, type AutonomyMode, type AutonomySettings,
} from "@/lib/autonomy";

export const Route = createFileRoute("/_authenticated/autonomy")({
  head: () => ({
    meta: [
      { title: "Autonomous modes — Honeycomb" },
      { name: "description", content: "Owner switches, gates and Emergency Stop for local and OMNI autonomous modes. Off until verified." },
      { property: "og:title", content: "Autonomous modes — Honeycomb" },
      { property: "og:description", content: "Fail-closed owner controls for autonomous work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Autonomy,
});

const key = (id: string) => `hc-autonomy:${id}`;

function Autonomy() {
  const statusFn = useServerFn(accountStatus);
  const { user } = useAccountUser();
  const [s, setS] = useState<AutonomySettings>(DEFAULT_SETTINGS);
  const [ev, setEv] = useState<AutonomyEvidence>({ isOwner: false, sessionActive: false, deviceRevoked: false, connectionTestedAt: {}, omniConfigured: false, safetyVerified: {}, now: Date.now() });
  const [msg, setMsg] = useState("");

  useEffect(() => { if (user) setS(parseSettings(localStorage.getItem(key(user.id)))); }, [user?.id]);
  const save = (n: AutonomySettings) => { setS(n); if (user) localStorage.setItem(key(user.id), JSON.stringify(n)); };

  async function check() {
    let isOwner = false, active = false, revoked = false;
    try {
      const r = await statusFn();
      active = r.state === "member"; revoked = r.state === "revoked";
      isOwner = r.state === "member" && r.role === "owner";
    } catch { /* fail closed */ }
    setEv((e) => ({ ...e, isOwner, sessionActive: active, deviceRevoked: revoked, now: Date.now() }));
  }
  useEffect(() => { void check(); }, [user?.id]);

  function test(mode: AutonomyMode) {
    // No verified executor exists for either mode, so a test cannot pass. Never record a success.
    setMsg(mode === "omni"
      ? "OMNI test: FAILED — no OMNI Docking Bay connection is configured for this account. Nothing was sent."
      : "Local test: FAILED — no verified local executor exists yet. Nothing ran.");
  }

  const toggle = (m: AutonomyMode) => save({ ...s, requested: { ...s.requested, [m]: !s.requested[m] } });
  const scope = (m: AutonomyMode, id: string) => {
    const cur = s.scopes[m];
    save({ ...s, scopes: { ...s.scopes, [m]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } });
  };

  const card = (m: AutonomyMode, title: string, blurb: string, opts: readonly { id: string; label: string }[]) => {
    const state = modeState(m, s, ev);
    return (
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-display text-lg">{title}</h2><p className="text-sm text-muted-foreground">{blurb}</p></div>
          <span className={`rounded-full border px-3 py-1 text-xs ${state === "active" ? "border-primary text-primary" : state === "blocked" ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`}>
            {state === "active" ? "Active" : state === "blocked" ? "Blocked" : "Off"}
          </span>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={s.requested[m]} onChange={() => toggle(m)} disabled={s.emergencyStop} aria-label={`Request ${title}`} />
          Owner request to switch on (stays blocked until every gate passes)
        </label>
        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-wide text-muted-foreground">Permissions</legend>
          {opts.map((o) => (
            <label key={o.id} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={s.scopes[m].includes(o.id)} onChange={() => scope(m, o.id)} />{o.label}
            </label>
          ))}
        </fieldset>
        <ul className="space-y-1 text-sm">
          {gates(m, s, ev).map((g) => (
            <li key={g.id} className="flex gap-2">
              <span className={g.ok ? "text-primary" : "text-destructive"}>{g.ok ? "✓" : "✗"}</span>
              <span>{g.label}{!g.ok && <span className="text-muted-foreground"> — {g.next}</span>}</span>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" onClick={() => test(m)}>Test connection</Button>
      </section>
    );
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">Autonomous modes</h1>
            <p className="text-sm text-muted-foreground">Both modes are off. They can only run after owner approval, a real connection test, a budget, permissions and verified safety checks.</p>
          </div>
          <Button variant="destructive" onClick={() => { save(emergencyStop(s)); setMsg("Emergency Stop pressed. Both modes are off."); }}>
            <OctagonX className="mr-2 h-4 w-4" />Emergency Stop
          </Button>
        </header>
        {s.emergencyStop && (
          <div className="flex items-center justify-between rounded-xl border border-destructive p-3 text-sm">
            Emergency Stop is on. Nothing can run.
            <Button size="sm" variant="outline" onClick={() => save({ ...s, emergencyStop: false })}>Release</Button>
          </div>
        )}
        <label className="flex items-center gap-3 text-sm">
          Job budget per run
          <input type="number" min={0} max={50} value={s.budgetJobs} onChange={(e) => save({ ...s, budgetJobs: Math.min(Math.max(Math.trunc(Number(e.target.value) || 0), 0), 50) })}
            className="w-20 rounded-lg border border-border bg-background px-2 py-1" />
          <Button size="sm" variant="ghost" onClick={() => void check()}><RefreshCw className="mr-1 h-4 w-4" />Recheck</Button>
        </label>
        {msg && <p role="status" className="rounded-xl border border-border p-3 text-sm">{msg}</p>}
        {card("local", "Local autonomous mode", "Only what this phone, tablet or browser allows. Not a device shell.", LOCAL_CAPABILITIES)}
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{LOCAL_LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
        {card("omni", "OMNI remote mode", "Sends scoped jobs to your existing OMNI backend through the Docking Bay, with logs, stop and per-device revoke.", OMNI_SCOPES)}
      </div>
    </AppShell>
  );
}
