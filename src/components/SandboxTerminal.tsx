import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Copy, ClipboardPaste, LogOut, Menu, Plus, X } from "lucide-react";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { Button } from "@/components/ui/button";
import { DESTINATIONS } from "@/lib/destinations";
import { complete, exec, HOME, newSession, type ShellState } from "@/lib/sandbox-shell";
import { commonPrefix, emptyLine, feed, redraw, type LineState } from "@/lib/line-editor";
import { AGENTS, AGENT_COMMANDS, parseAgentCommand } from "@/lib/agent-commands";
import { agentStatus, askAgent, probeEndpoint } from "@/lib/agent.functions";
import { useAccountUser } from "@/hooks/use-account-user";

const KEY = "honeycomb.sandbox.v3";
const MAX_SESSIONS = 6, MAX_TRANSCRIPT = 120_000;
type Session = { id: string; name: string; state: ShellState; transcript: string };

const termPrompt = (s: ShellState) => `\x1b[1;33mhoneycomb@sandbox\x1b[0m:\x1b[33m${s.cwd.replace(new RegExp(`^${HOME}`), "~") || "/"}\x1b[0m$ `;
const nl = (t: string) => t.replace(/\r?\n/g, "\r\n");
const strip = (t: string) => t.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, "");

function makeSession(n: number): Session {
  return { id: `s${Date.now().toString(36)}${n}`, name: `Sandbox ${n}`, state: newSession(), transcript: "Honeycomb browser sandbox shell — runs in this browser, not your Mac, not iOS. Type help.\r\n" };
}
/** Resolve a semantic CSS token (any color syntax) to #rrggbb for xterm. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); if (!v) return fallback;
  const c = document.createElement("canvas").getContext("2d"); if (!c) return fallback;
  c.fillStyle = fallback; c.fillStyle = v; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return `#${[r, g, b].map((x) => x!.toString(16).padStart(2, "0")).join("")}`;
}

/** Full-viewport xterm.js terminal driving the device-local sandbox shell. */
export function SandboxWorkspace() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [note, setNote] = useState("");
  const [height, setHeight] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessRef = useRef<Session[]>([]); const activeRef = useRef<string | null>(null);
  const lineRef = useRef<LineState>(emptyLine()); const busyRef = useRef<number>(0); const escRef = useRef(0);
  const { user } = useAccountUser(); const userRef = useRef(user); userRef.current = user;
  const navigate = useNavigate(); const router = useRouter();
  const { cmd } = useSearch({ from: "/terminal/sandbox" }); const cmdRef = useRef(cmd);
  const ask = useServerFn(askAgent); const probe = useServerFn(probeEndpoint); const statusFn = useServerFn(agentStatus);
  const fns = useRef({ ask, probe, statusFn }); fns.current = { ask, probe, statusFn };

  // Exit View only leaves the screen; sessions stay saved and nothing is revoked.
  const exitView = () => { if (window.history.length > 1) router.history.back(); else void navigate({ to: "/" }); };
  const exitRef = useRef(exitView); exitRef.current = exitView;

  const cur = () => sessRef.current.find((s) => s.id === activeRef.current) ?? null;
  const commit = (next: Session[], act = activeRef.current) => {
    sessRef.current = next; activeRef.current = act; setSessions(next); setActive(act);
    localStorage.setItem(KEY, JSON.stringify({ active: act, sessions: next }));
  };
  const write = (text: string) => {
    termRef.current?.write(text);
    const s = cur(); if (!s) return;
    s.transcript = (s.transcript + text).slice(-MAX_TRANSCRIPT);
  };
  const showPrompt = () => { const s = cur(); if (s) write(termPrompt(s.state)); };
  const persist = () => commit([...sessRef.current]);

  function paint(s: Session) {
    const t = termRef.current; if (!t) return;
    t.reset(); lineRef.current = emptyLine(s.state.history);
    t.write(s.transcript); t.write(termPrompt(s.state)); s.transcript += termPrompt(s.state);
  }

  async function runAgent(line: string, a: ReturnType<typeof parseAgentCommand>, s: Session) {
    s.state = { ...s.state, history: [...s.state.history, line.trim()].slice(-200) };
    if (a.kind === "exit") { write("logout (view closed; this session stays saved)\r\n"); persist(); exitRef.current(); return; }
    if (a.kind === "text") { write(nl(a.output) + "\r\n"); return; }
    if (a.kind === "disconnect") { write(`${a.provider}: nothing stored on this device to disconnect. Project-level connections are removed by the owner in Connectors.\r\n`); return; }
    if (!userRef.current) { write("Sign in first (Account) — agent commands run on the Honeycomb server for signed-in members only.\r\n"); return; }
    const ticket = Date.now(); busyRef.current = ticket;
    write("\x1b[2m… waiting for server (Ctrl+C to stop waiting)\x1b[0m\r\n");
    let out: string;
    try {
      if (a.kind === "status") { const st = await fns.current.statusFn(); out = `gemini: ${st.gemini}\nclaude: ${st.claude}\nopenai: ${st.openai}\nperplexity: ${st.perplexity}\nmcp/api: connect mcp|api <https url>\ncodex / claude-code CLIs: not built — need the Mac add-on`; }
      else if (a.kind === "ask") { const r = await fns.current.ask({ data: { provider: a.provider, prompt: a.prompt } }); out = `[${r.source}${r.ok ? "" : " · error"}]\n${r.text}`; }
      else if (a.kind === "probe") { const r = await fns.current.probe({ data: { provider: a.provider, url: a.url } }); out = `[${a.provider}${r.ok ? " · reachable" : " · failed"}]\n${r.text}`; }
      else out = "";
    } catch (e) { out = `error: ${e instanceof Error ? e.message : "request failed"}${navigator.onLine ? "" : " (offline)"}`; }
    if (busyRef.current !== ticket) return; // interrupted
    busyRef.current = 0; write(nl(out) + "\r\n"); persist(); showPrompt();
  }

  function onData(data: string) {
    const s = cur(); const t = termRef.current; if (!s || !t) return;
    if (busyRef.current) { if (data.includes("\x03")) { busyRef.current = 0; write("^C\r\n"); showPrompt(); } return; }
    const { state, events } = feed(lineRef.current, data);
    let line = state;
    for (const ev of events) {
      if (ev.type === "escape") {
        const now = Date.now();
        if (!lineRef.current.buf && now - escRef.current < 700) { exitRef.current(); return; }
        escRef.current = now; setNote("Press Esc again (empty line) to exit full screen.");
      } else if (ev.type === "interrupt") { s.transcript += lineRef.current.buf; write("^C\r\n"); showPrompt(); }
      else if (ev.type === "eof") { write("exit\r\n"); closeSession(s.id); return; }
      else if (ev.type === "clear") { t.clear(); s.transcript = ""; }
      else if (ev.type === "tab") {
        const before = lineRef.current.buf.slice(0, lineRef.current.pos);
        const opts = complete(s.state, before, AGENT_COMMANDS);
        const word = before.split(/\s+/).pop() ?? "";
        const pre = commonPrefix(opts);
        if (opts.length === 1 || pre.length > word.length) {
          const add = (opts.length === 1 ? opts[0]! + (opts[0]!.endsWith("/") ? "" : " ") : pre).slice(word.length);
          line = feed(lineRef.current, add).state;
        } else if (opts.length > 1) { write("\r\n" + opts.join("  ") + "\r\n"); }
        lineRef.current = line;
      } else if (ev.type === "submit") {
        s.transcript += lineRef.current.buf; write("\r\n");
        const a = parseAgentCommand(ev.line);
        if (a.kind !== "none") { lineRef.current = emptyLine(s.state.history); void runAgent(ev.line, a, s); persist(); if (busyRef.current) return; }
        else {
          const r = exec(s.state, ev.line); s.state = r.state;
          if (r.clear) { t.clear(); t.write("\x1b[2J\x1b[H"); s.transcript = ""; }
          else if (r.output) write(nl(r.output) + "\r\n");
          persist();
        }
        lineRef.current = emptyLine(s.state.history);
        if (!busyRef.current) showPrompt();
        line = lineRef.current; continue;
      }
      lineRef.current = line;
    }
    if (busyRef.current) return;
    if (!events.some((e) => e.type === "submit" || e.type === "interrupt")) { lineRef.current = line; t.write(redraw(termPrompt(s.state), line)); }
    else if (line.buf) { lineRef.current = line; t.write(redraw(termPrompt(s.state), line)); }
  }
  const onDataRef = useRef(onData); onDataRef.current = onData;

  function switchTo(id: string) { const s = sessRef.current.find((x) => x.id === id); if (!s) return; busyRef.current = 0; commit(sessRef.current, id); paint(s); termRef.current?.focus(); }
  function addSession() {
    if (sessRef.current.length >= MAX_SESSIONS) { setNote(`Up to ${MAX_SESSIONS} sandbox sessions.`); return; }
    const n = Math.max(0, ...sessRef.current.map((s) => Number(s.name.replace(/\D/g, "")) || 0)) + 1;
    const s = makeSession(n); commit([...sessRef.current, s], s.id); paint(s); termRef.current?.focus();
  }
  function closeSession(id: string) {
    const rest = sessRef.current.filter((s) => s.id !== id);
    const next = rest.length ? rest : [makeSession(1)];
    const act = id === activeRef.current || !rest.length ? next[next.length - 1]!.id : activeRef.current;
    commit(next, act); paint(next.find((s) => s.id === act)!);
  }
  const closeRef = useRef(closeSession); closeRef.current = closeSession;

  // Mount xterm.js after hydration (browser-only library).
  useEffect(() => {
    let disposed = false; let ro: ResizeObserver | null = null;
    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit"), import("@xterm/xterm/css/xterm.css")]);
      if (disposed || !hostRef.current) return;
      const bg = token("--background", "#000000"), fg = token("--foreground", "#e8e2d0"), gold = token("--primary", "#d4a93a");
      const t = new Terminal({ cursorBlink: true, convertEol: false, scrollback: 5000, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: window.innerWidth < 640 ? 13 : 14,
        theme: { background: bg, foreground: fg, cursor: gold, cursorAccent: bg, selectionBackground: `${gold}55`, yellow: gold, brightYellow: gold } });
      const fit = new FitAddon(); t.loadAddon(fit); t.open(hostRef.current); fit.fit();
      termRef.current = t; fitRef.current = fit;
      t.onData((d) => onDataRef.current(d));
      ro = new ResizeObserver(() => { try { fit.fit(); } catch { /* hidden */ } }); ro.observe(hostRef.current);
      let restored: Session[] = []; let act: string | null = null;
      try { const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as { sessions: Session[]; active: string } | null; if (p) { restored = p.sessions; act = p.active; } } catch { restored = []; }
      if (!restored.length) restored = [makeSession(1)];
      if (!restored.some((s) => s.id === act)) act = restored[0]!.id;
      commit(restored, act); paint(restored.find((s) => s.id === act)!); t.focus();
      // A connector card may prefill a command; it is typed at the prompt but never auto-run.
      if (cmdRef.current) onDataRef.current(cmdRef.current.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200));
    })();
    return () => { disposed = true; ro?.disconnect(); termRef.current?.dispose(); termRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the visible viewport so the on-screen keyboard never covers the prompt.
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const fit = () => { setHeight(vv.height); requestAnimationFrame(() => { try { fitRef.current?.fit(); } catch { /* */ } }); };
    fit(); vv.addEventListener("resize", fit); return () => vv.removeEventListener("resize", fit);
  }, []);
  useEffect(() => { requestAnimationFrame(() => { try { fitRef.current?.fit(); } catch { /* */ } }); }, [sidebar, launcher]);

  const send = (d: string) => { onDataRef.current(d); termRef.current?.focus(); };
  async function copySel() {
    const t = termRef.current; const s = cur(); const txt = t?.getSelection() || (s ? strip(s.transcript) : "");
    try { await navigator.clipboard.writeText(txt); setNote(t?.hasSelection() ? "Selection copied." : "Whole session copied."); } catch { setNote("Copy blocked — select text and use the system Copy."); }
  }
  async function paste() {
    try { const txt = await navigator.clipboard.readText(); termRef.current?.paste(txt); } catch { setNote("Paste blocked — long-press the terminal and choose Paste."); }
  }

  return (
    <div className="flex w-full flex-col overflow-hidden bg-background text-foreground" style={{ height: height ? `${height}px` : "100dvh" }}>
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-2 py-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="outline" size="icon" className="shrink-0" aria-label={sidebar ? "Hide menu" : "Show menu"} aria-expanded={sidebar} onClick={() => setSidebar((v) => !v)}><Menu className="h-4 w-4" /></Button>
          <h1 className="truncate text-sm font-semibold text-primary sm:text-base">Honeycomb Terminal</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span role="status" className="hidden rounded-full border border-primary px-2 py-0.5 text-[11px] text-primary sm:inline">Browser sandbox · not your Mac</span>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link to="/terminal">Connect Mac</Link></Button>
          <Button variant="outline" size="sm" onClick={exitView} title="Exit Terminal view (or Esc twice on an empty line). Sessions stay saved."><LogOut className="mr-1 h-3.5 w-3.5" />Exit Terminal</Button>
        </div>
      </header>

      <div role="tablist" aria-label="Sessions" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 py-1">
        {sessions.map((s) => (
          <div key={s.id} className={`flex shrink-0 items-center rounded border text-xs ${s.id === active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            <button role="tab" aria-selected={s.id === active} className="px-2 py-1 font-mono" onClick={() => switchTo(s.id)}>{s.name}</button>
            <button aria-label={`Terminate ${s.name}`} className="px-1 py-1 hover:text-primary" onClick={() => closeRef.current(s.id)}><X className="h-3 w-3" /></button>
          </div>
        ))}
        <button aria-label="New session" className="shrink-0 rounded border border-border p-1 text-primary" onClick={addSession}><Plus className="h-3.5 w-3.5" /></button>
        <span className="ml-auto shrink-0 pl-2 text-[11px] text-muted-foreground sm:hidden">sandbox · not your Mac</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {sidebar && (
          <nav aria-label="Main navigation" className="w-48 shrink-0 overflow-y-auto border-r border-border p-2">
            {DESTINATIONS.map((d) => <Link key={d.to} to={d.to} className="block rounded px-2 py-1.5 text-sm hover:bg-muted" activeProps={{ className: "text-primary" }}>{d.label}</Link>)}
          </nav>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={hostRef} aria-label="Terminal" className="min-h-0 flex-1 px-1 pt-1" />
          {launcher && (
            <div role="dialog" aria-label="Agent launcher" className="shrink-0 border-t border-primary bg-card p-2">
              <p className="mb-1 text-[11px] text-muted-foreground">Types the command at the prompt — press Enter to run.</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {AGENTS.map((a) => (
                  <button key={a.id} type="button" className="rounded border border-border p-2 text-left text-xs hover:border-primary" onClick={() => { setLauncher(false); send("\x15" + (a.id === "gemini" || a.id === "perplexity" || a.id === "openai" ? `ask ${a.id} ` : a.id === "claude-api" ? "ask claude " : a.id === "mcp" || a.id === "api" ? `connect ${a.id} https://` : `connect ${a.id}`)); }}>
                    <span className="block text-primary">{a.name}</span><span className="text-muted-foreground">{!a.available ? "Blocked here" : a.needsSetup ? "Setup needed" : "Ready"}</span>
                  </button>))}
              </div>
            </div>)}
          {note && <p className="shrink-0 px-3 text-[11px] text-primary">{note}</p>}
          <div aria-label="Terminal keys" className="flex shrink-0 gap-1 overflow-x-auto border-t border-border px-2 py-1.5">
            {([["Esc", "\x1b"], ["Tab", "\t"], ["Ctrl+C", "\x03"], ["Ctrl+D", "\x04"], ["↑", "\x1b[A"], ["↓", "\x1b[B"], ["←", "\x1b[D"], ["→", "\x1b[C"]] as const).map(([l, d]) => (
              <Button key={l} type="button" variant="outline" size="sm" className="shrink-0 font-mono" onMouseDown={(e) => e.preventDefault()} onClick={() => send(d)}>{l}</Button>))}
            <Button type="button" size="sm" className="shrink-0" onClick={() => setLauncher((v) => !v)} aria-expanded={launcher}><Bot className="mr-1 h-3.5 w-3.5" />Agents</Button>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copySel}><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={paste}><ClipboardPaste className="mr-1 h-3.5 w-3.5" />Paste</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
