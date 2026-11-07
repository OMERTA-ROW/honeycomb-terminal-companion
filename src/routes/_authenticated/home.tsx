import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Lock, OctagonX, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAccountUser } from "@/hooks/use-account-user";
import { omniSelfTest } from "@/lib/omni.functions";
import {
  CHECK_LABEL, DEFAULT_IDLE_MS, OMNI_STATE_LABEL, canSendInput, clampIdle, fillSnippet, omniState, parseSnippets, placeholders, shouldLock,
  type SelfTest, type Snippet,
} from "@/lib/omni";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Honeycomb" },
      { name: "description", content: "Honeycomb home: OMNI connection, self-test, Stop, snippets and auto-lock." },
      { property: "og:title", content: "Home — Honeycomb" },
      { property: "og:description", content: "Your Honeycomb home, powered by OMNI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

function Home() {
  const testFn = useServerFn(omniSelfTest);
  const { user } = useAccountUser();
  const [test, setTest] = useState<SelfTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [locked, setLocked] = useState(false);
  const [idleMs, setIdleMs] = useState(DEFAULT_IDLE_MS);
  const [snips, setSnips] = useState<Snippet[]>([]);
  const [name, setName] = useState(""); const [cmd, setCmd] = useState("");
  const [line, setLine] = useState("");
  const [now, setNow] = useState(Date.now());
  const last = useRef(Date.now());
  const k = (s: string) => `hc-omni:${s}:${user?.id}`;

  useEffect(() => {
    if (!user) return;
    setSnips(parseSnippets(localStorage.getItem(k("snippets"))));
    setIdleMs(clampIdle(Number(localStorage.getItem(k("idle")) ?? DEFAULT_IDLE_MS)));
  }, [user?.id]);

  useEffect(() => {
    const bump = () => { last.current = Date.now(); };
    const vis = () => { if (document.hidden) setLocked(true); };
    const t = setInterval(() => {
      setNow(Date.now());
      if (shouldLock({ hidden: document.hidden, lastActivity: last.current, now: Date.now(), idleMs })) setLocked(true);
    }, 5000);
    ["pointerdown", "keydown"].forEach((e) => window.addEventListener(e, bump));
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); ["pointerdown", "keydown"].forEach((e) => window.removeEventListener(e, bump)); document.removeEventListener("visibilitychange", vis); };
  }, [idleMs]);

  async function run() {
    setBusy(true); setErr("");
    try { setTest(await testFn()); } catch { setErr("Self-test could not run. Check your sign-in and try again."); setTest(null); }
    setBusy(false);
  }
  useEffect(() => { void run(); }, []);

  const state = omniState(test, locked, now);
  const saveSnips = (n: Snippet[]) => { setSnips(n); localStorage.setItem(k("snippets"), JSON.stringify(n)); };
  const insert = (s: Snippet) => {
    const vals: Record<string, string> = {};
    for (const p of placeholders(s.command)) vals[p] = window.prompt(`Value for {${p}}`) ?? `{${p}}`;
    setLine(fillSnippet(s.command, vals));
  };

  if (locked) {
    return (
      <AppShell>
        <section className="mx-auto max-w-md space-y-4 text-center">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <p className="text-muted-foreground">Honeycomb locked because the screen went to sleep or you were away.</p>
          <p className="text-sm text-muted-foreground">Passkey unlock is not set up yet, so unlocking only reopens this screen. It does not grant OMNI access.</p>
          <Button onClick={() => { last.current = Date.now(); setLocked(false); }}>Unlock</Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Engine</p>
            <p className={state === "connected" ? "font-semibold text-primary" : state === "stopped" ? "font-semibold text-destructive" : "font-semibold"}>
              {OMNI_STATE_LABEL[state]}
            </p>
          </div>
          <Button variant="destructive" disabled={!canSendInput(state)} title={canSendInput(state) ? "Stop current OMNI job" : "Nothing running on OMNI"}>
            <OctagonX className="mr-1 h-4 w-4" /> Stop
          </Button>
        </section>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">OMNI self-test</h2>
            <Button size="sm" variant="outline" onClick={run} disabled={busy}><RefreshCw className="mr-1 h-4 w-4" />{busy ? "Testing…" : "Run"}</Button>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {test && !test.configured && (
            <p className="text-sm text-muted-foreground">OMNI's secure link isn't set up yet. It needs OMNI's address and shared link secret on Honeycomb's server. Nothing was sent.</p>
          )}
          <ul className="space-y-1 text-sm">
            {test?.checks.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>{CHECK_LABEL[c.id]}</span>
                <span className={c.pass ? "text-primary" : "text-destructive"}>{c.pass ? "Pass" : "Fail"} · {c.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h2 className="font-semibold">Command line</h2>
          <input value={line} onChange={(e) => setLine(e.target.value)} disabled={!canSendInput(state)} placeholder={canSendInput(state) ? "Type a command" : "Not connected to OMNI"}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm" />
          <p className="text-xs text-muted-foreground">Sessions, approvals and push alerts open once OMNI passes the self-test. Want to try things now? Use the <Link to="/terminal/sandbox" className="underline">Demo shell</Link> (simulated).</p>
        </section>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h2 className="font-semibold">Snippets</h2>
          <p className="text-xs text-muted-foreground">Inserting a snippet only fills the command line; you always run it yourself. Use {"{name}"} for blanks.</p>
          <ul className="space-y-1">
            {snips.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <button className="flex-1 truncate text-left font-mono hover:text-primary" onClick={() => insert(s)}>{s.name}: {s.command}</button>
                <button className="text-xs text-muted-foreground" onClick={() => saveSnips(snips.filter((x) => x.id !== s.id))}>Delete</button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm" />
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="git status" className="flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-sm" />
            <Button size="sm" disabled={!name.trim() || !cmd.trim()} onClick={() => { saveSnips([...snips, { id: crypto.randomUUID(), name: name.trim(), command: cmd.trim() }]); setName(""); setCmd(""); }}>Save</Button>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h2 className="font-semibold">Settings</h2>
          <label className="flex items-center justify-between gap-2 text-sm">
            Auto-lock after
            <select value={idleMs} onChange={(e) => { const v = clampIdle(Number(e.target.value)); setIdleMs(v); localStorage.setItem(k("idle"), String(v)); }}
              className="rounded-md border border-input bg-background px-2 py-1">
              {[1, 2, 5, 10, 15, 30].map((m) => <option key={m} value={m * 60_000}>{m} min</option>)}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">Also locks whenever the screen sleeps or you switch apps.</p>
          <p className="text-xs text-muted-foreground">Optional: <Link to="/terminal" className="underline">Connect a computer</Link>. Honeycomb · powered by OMNI.</p>
        </section>
      </div>
    </AppShell>
  );
}
