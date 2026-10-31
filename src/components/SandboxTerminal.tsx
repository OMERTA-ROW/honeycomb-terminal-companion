import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { exec, newSession, prompt, type ShellState } from "@/lib/sandbox-shell";

const KEY = "honeycomb.sandbox.v1";
type Line = { kind: "in" | "out"; text: string };

/** Real command execution against a device-local sandbox file tree. Not macOS/iOS, no network. */
export function SandboxTerminal() {
  const [state, setState] = useState<ShellState | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const outRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved) { const p = JSON.parse(saved) as { state: ShellState; lines: Line[] }; setState(p.state); setLines(p.lines); return; } } catch { /* start fresh */ }
  }, []);
  useEffect(() => { if (state) localStorage.setItem(KEY, JSON.stringify({ state, lines: lines.slice(-300) })); }, [state, lines]);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [lines]);

  function start() { setState(newSession()); setLines([{ kind: "out", text: "Browser sandbox session started. Type help." }]); }
  function terminate() { localStorage.removeItem(KEY); setState(null); setLines([]); setInput(""); }
  function submit() {
    if (!state) return;
    const r = exec(state, input);
    setState(r.state); setCursor(null);
    setLines((l) => r.clear ? [] : [...l, { kind: "in", text: `${prompt(state)} ${input}` }, ...(r.output ? [{ kind: "out" as const, text: r.output }] : [])]);
    setInput("");
  }
  function key(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!state) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault(); const h = state.history; if (!h.length) return;
      const next = e.key === "ArrowUp" ? Math.max(0, (cursor ?? h.length) - 1) : Math.min(h.length, (cursor ?? h.length) + 1);
      setCursor(next); setInput(next === h.length ? "" : h[next]!);
    }
  }

  return (
    <section aria-labelledby="sandbox-h" className="rounded-md border border-primary bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sandbox-h" className="font-medium text-primary">Browser sandbox terminal</h2>
        <span role="status" className="rounded-full border border-primary px-3 py-1 text-xs text-primary">{state ? "Sandbox session running" : "No session"}</span>
      </div>
      <p className="text-xs text-muted-foreground">Commands really run here, against a small private file area on this device. It is not your Mac, not iOS and has no internet. For your Mac's real shell, use Connect Mac below.</p>
      {state ? (
        <>
          <pre ref={outRef} aria-label="Sandbox output" aria-live="polite" className="h-64 overflow-auto rounded border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap">
            {lines.map((l, i) => <div key={i} className={l.kind === "in" ? "text-primary" : ""}>{l.text}</div>)}
          </pre>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="sandbox-in">Command</label>
            <span className="self-center font-mono text-xs text-primary">{prompt(state)}</span>
            <input id="sandbox-in" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={key} autoCapitalize="off" autoCorrect="off" spellCheck={false} maxLength={2000}
              className="flex-1 rounded border border-border bg-background px-2 py-2 font-mono text-sm" placeholder="pwd" />
            <Button onClick={submit}>Run</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["pwd", "ls", "help"].map((c) => <Button key={c} variant="outline" size="sm" onClick={() => setInput(c)}>{c}</Button>)}
            <Button variant="outline" size="sm" onClick={start}>New session</Button>
            <Button variant="outline" size="sm" onClick={terminate}>Terminate</Button>
          </div>
        </>
      ) : <Button size="lg" onClick={start}>Start sandbox session</Button>}
    </section>
  );
}
