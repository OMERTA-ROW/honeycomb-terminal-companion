import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, ClipboardPaste, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DESTINATIONS } from "@/lib/destinations";
import { exec, newSession, prompt, type ShellState } from "@/lib/sandbox-shell";

const KEY = "honeycomb.sandbox.v2";
const OLD_KEY = "honeycomb.sandbox.v1";
const MAX_SESSIONS = 6;
type Line = { kind: "in" | "out"; text: string };
type Session = { id: string; name: string; state: ShellState; lines: Line[] };

function makeSession(n: number): Session {
  return { id: `s${Date.now().toString(36)}${n}`, name: `Sandbox ${n}`, state: newSession(), lines: [{ kind: "out", text: "Browser sandbox session started. Type help." }] };
}

/** Full-viewport workspace: real command execution against a device-local sandbox file tree. Not macOS/iOS, no network. */
export function SandboxWorkspace() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [note, setNote] = useState("");
  const [height, setHeight] = useState<number | null>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  // Restore (and migrate the single-session format), or start one session so the shell is ready on open.
  useEffect(() => {
    let restored: Session[] = []; let act: string | null = null;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { const p = JSON.parse(saved) as { sessions: Session[]; active: string }; restored = p.sessions; act = p.active; }
      else { const old = localStorage.getItem(OLD_KEY); if (old) { const p = JSON.parse(old) as { state: ShellState; lines: Line[] }; restored = [{ id: "s1", name: "Sandbox 1", state: p.state, lines: p.lines }]; localStorage.removeItem(OLD_KEY); } }
    } catch { restored = []; }
    if (!restored.length) restored = [makeSession(1)];
    setSessions(restored); setActive(restored.some((s) => s.id === act) ? act : restored[0]!.id); setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify({ active, sessions: sessions.map((s) => ({ ...s, lines: s.lines.slice(-300) })) })); }, [loaded, sessions, active]);

  // Follow the visible viewport so the on-screen keyboard never covers the prompt.
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const fit = () => setHeight(vv.height);
    fit(); vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); };
  }, []);

  const cur = sessions.find((s) => s.id === active) ?? null;
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [cur?.lines.length, active, height]);

  function update(id: string, f: (s: Session) => Session) { setSessions((all) => all.map((s) => (s.id === id ? f(s) : s))); }
  function addSession() {
    if (sessions.length >= MAX_SESSIONS) { setNote(`Up to ${MAX_SESSIONS} sandbox sessions.`); return; }
    const n = Math.max(0, ...sessions.map((s) => Number(s.name.replace(/\D/g, "")) || 0)) + 1;
    const s = makeSession(n); setSessions((a) => [...a, s]); setActive(s.id); setInput(""); inRef.current?.focus();
  }
  function closeSession(id: string) {
    const rest = sessions.filter((s) => s.id !== id);
    const next = rest.length ? rest : [makeSession(1)];
    setSessions(next); if (id === active || !rest.length) setActive(next[next.length - 1]!.id);
  }
  function submit() {
    if (!cur) return;
    const before = cur.state; const cmd = input;
    const r = exec(before, cmd);
    update(cur.id, (s) => ({ ...s, state: r.state, lines: r.clear ? [] : [...s.lines, { kind: "in", text: `${prompt(before)} ${cmd}` }, ...(r.output ? [{ kind: "out" as const, text: r.output }] : [])] }));
    setInput(""); setCursor(null); inRef.current?.focus();
  }
  function key(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!cur) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault(); const h = cur.state.history; if (!h.length) return;
      const next = e.key === "ArrowUp" ? Math.max(0, (cursor ?? h.length) - 1) : Math.min(h.length, (cursor ?? h.length) + 1);
      setCursor(next); setInput(next === h.length ? "" : h[next]!);
    }
  }
  async function copyOutput() {
    if (!cur) return;
    try { await navigator.clipboard.writeText(cur.lines.map((l) => l.text).join("\n")); setNote("Output copied."); } catch { setNote("Copy not allowed here — select the text and copy instead."); }
  }
  async function paste() {
    try { const t = await navigator.clipboard.readText(); setInput((v) => (v + t.replace(/\r?\n/g, " ")).slice(0, 2000)); setNote("Pasted into the prompt — nothing runs until you tap Run."); inRef.current?.focus(); }
    catch { setNote("Paste not allowed here — long-press the prompt and choose Paste."); }
  }

  return (
    <div className="flex w-full flex-col overflow-hidden bg-background text-foreground" style={{ height: height ? `${height}px` : "100dvh" }}>
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-2 py-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="outline" size="icon" className="shrink-0" aria-label={sidebar ? "Hide menu" : "Show menu"} aria-expanded={sidebar} onClick={() => setSidebar((v) => !v)}><Menu className="h-4 w-4" /></Button>
          <h1 className="truncate text-sm font-semibold text-primary sm:text-base">Honeycomb Terminal</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span role="status" className="rounded-full border border-primary px-2 py-0.5 text-[11px] text-primary">Browser sandbox · running</span>
          <Button asChild variant="outline" size="sm"><Link to="/terminal">Connect Mac</Link></Button>
        </div>
      </header>

      <div role="tablist" aria-label="Sessions" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 py-1">
        {sessions.map((s) => (
          <div key={s.id} className={`flex shrink-0 items-center rounded border text-xs ${s.id === active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            <button role="tab" aria-selected={s.id === active} className="px-2 py-1 font-mono" onClick={() => { setActive(s.id); setInput(""); setCursor(null); }}>{s.name}</button>
            <button aria-label={`Terminate ${s.name}`} className="px-1 py-1 hover:text-primary" onClick={() => closeSession(s.id)}><X className="h-3 w-3" /></button>
          </div>
        ))}
        <button aria-label="New session" className="shrink-0 rounded border border-border p-1 text-primary" onClick={addSession}><Plus className="h-3.5 w-3.5" /></button>
      </div>

      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <nav aria-label="Main navigation" className="w-48 shrink-0 overflow-y-auto border-r border-border p-2">
            {DESTINATIONS.map((d) => <Link key={d.to} to={d.to} className="block rounded px-2 py-1.5 text-sm hover:bg-muted" activeProps={{ className: "text-primary" }}>{d.label}</Link>)}
          </nav>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={outRef} aria-label="Terminal output" aria-live="polite" onClick={() => inRef.current?.focus()}
            className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words select-text sm:text-sm">
            {cur?.lines.map((l, i) => <div key={i} className={l.kind === "in" ? "text-primary" : ""}>{l.text}</div>)}
          </div>
          <p className="shrink-0 px-3 text-[11px] text-muted-foreground">Real commands on a private file area in this browser — not your Mac, not iOS, no internet.{note && <span className="ml-2 text-primary">{note}</span>}</p>
          <form className="flex shrink-0 items-center gap-2 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <span className="hidden shrink-0 font-mono text-xs text-primary sm:inline">{cur ? prompt(cur.state) : ""}</span>
            <label className="sr-only" htmlFor="sandbox-in">Command</label>
            <input id="sandbox-in" ref={inRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={key} autoFocus autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} maxLength={2000} enterKeyHint="send"
              className="min-w-0 flex-1 rounded border border-border bg-card px-2 py-2 font-mono text-base sm:text-sm" placeholder="pwd" />
            <Button type="submit">Run</Button>
          </form>
          <div className="flex shrink-0 gap-1 overflow-x-auto px-2 pb-2">
            {["pwd", "ls", "help", "history", "clear"].map((c) => <Button key={c} type="button" variant="outline" size="sm" className="font-mono" onClick={() => { setInput(c); inRef.current?.focus(); }}>{c}</Button>)}
            <Button type="button" variant="outline" size="sm" onClick={copyOutput}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
            <Button type="button" variant="outline" size="sm" onClick={paste}><ClipboardPaste className="mr-1 h-3.5 w-3.5" />Paste</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
