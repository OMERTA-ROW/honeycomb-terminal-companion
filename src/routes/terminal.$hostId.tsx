import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useHosts } from "@/hooks/use-hosts";
import { DEFAULT_SHORTCUTS, SHORTCUTS_KEY, STATUS_INFO, isDestructive, simulate, type Shortcut } from "@/lib/terminal";

export const Route = createFileRoute("/terminal/$hostId")({
  head: () => ({
    meta: [
      { title: "Terminal — Honeycomb Terminal" },
      { name: "description", content: "Simulated remote shell session." },
      { property: "og:title", content: "Terminal — Honeycomb Terminal" },
      { property: "og:description", content: "Simulated remote shell session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terminal,
});

function Terminal() {
  const { hostId } = Route.useParams();
  const { hosts } = useHosts();
  const host = hosts.find((h) => h.id === hostId);
  const [lines, setLines] = useState<string[]>(["[simulated session] Connected to sample host. Type 'help'."]);
  const [input, setInput] = useState("");
  const [ctrl, setCtrl] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [pending, setPending] = useState<Shortcut | null>(null);
  const [manage, setManage] = useState(false);
  const [dropped, setDropped] = useState(false);
  const [draft, setDraft] = useState({ label: "", command: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    if (raw) setShortcuts(JSON.parse(raw));
  }, []);
  useEffect(() => { outRef.current?.scrollTo(0, 1e9); }, [lines]);
  useEffect(() => {
    const off = () => setDropped(true);
    window.addEventListener("offline", off);
    return () => window.removeEventListener("offline", off);
  }, []);

  const saveShortcuts = (s: Shortcut[]) => { setShortcuts(s); localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(s)); };

  if (!host || !STATUS_INFO[host.status].canOpen) {
    const info = host ? STATUS_INFO[host.status] : null;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-xl border bg-card p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold">{host ? `${host.name}: ${info!.label}` : "Computer not found"}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{info?.next ?? "It may have been removed."}</p>
          <Link to="/" className="inline-block mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Back to computers</Link>
        </div>
      </div>
    );
  }

  const run = (cmd: string) => {
    if (cmd.trim() === "clear") { setLines([]); setInput(""); return; }
    const out = simulate(cmd);
    setLines((l) => [...l, `$ ${cmd}`, ...(out ? out.split("\n") : [])]);
    if (cmd.trim()) setHistory((h) => [cmd, ...h]);
    setHIdx(-1);
    setInput("");
  };

  const sendKey = (key: string) => {
    if (key === "Esc") setLines((l) => [...l, "^[ (Escape sent — simulated)"]);
    if (key === "Tab") setInput((v) => (v.startsWith("gi") ? "git status" : v.startsWith("l") ? "ls -la" : v + "\t"));
    if (key === "Up") { const i = Math.min(hIdx + 1, history.length - 1); if (i >= 0) { setHIdx(i); setInput(history[i]); } }
    if (key === "Down") { const i = hIdx - 1; setHIdx(i); setInput(i >= 0 ? history[i] : ""); }
    if (key === "Ctrl") { setCtrl((c) => !c); }
    inputRef.current?.focus();
  };

  const ctrlCombo = (k: string) => {
    setCtrl(false);
    if (k === "c") { setLines((l) => [...l, `$ ${input}^C`]); setInput(""); }
    else if (k === "l") setLines([]);
    else if (k === "u") setInput("");
    else setLines((l) => [...l, `^${k.toUpperCase()} (sent — simulated)`]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); run(input); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sendKey("Up"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sendKey("Down"); }
    else if (e.key === "Tab") { e.preventDefault(); sendKey("Tab"); }
    else if (e.key === "Escape") { e.preventDefault(); sendKey("Esc"); }
    else if ((e.ctrlKey || ctrl) && e.key.length === 1) { e.preventDefault(); ctrlCombo(e.key.toLowerCase()); }
  };

  const triggerShortcut = (s: Shortcut) => setPending(s);
  const confirmShortcut = () => { if (pending) run(pending.command); setPending(null); };

  const copySel = async () => {
    const t = window.getSelection()?.toString() || lines.join("\n");
    await navigator.clipboard?.writeText(t).catch(() => {});
    setLines((l) => [...l, "[copied to clipboard]"]);
  };
  const paste = async () => {
    const t = await navigator.clipboard?.readText().catch(() => "");
    if (t) setInput((v) => v + t);
    inputRef.current?.focus();
  };

  const keyBtn = "min-w-11 h-11 px-3 rounded-md bg-secondary text-sm font-mono active:bg-accent";

  return (
    <div className="h-dvh flex flex-col bg-terminal">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-background text-sm gap-2">
        <Link to="/" className="text-muted-foreground">← Computers</Link>
        <span className="truncate">{host.name} <span className="text-warning text-xs">· simulated</span></span>
        <div className="flex gap-1">
          <button onClick={() => setDropped(true)} className="text-xs border rounded px-2 py-1">Simulate drop</button>
          <button onClick={() => setManage(true)} aria-label="Manage shortcuts" className="text-xs border rounded px-2 py-1">★</button>
        </div>
      </header>

      {dropped && (
        <div className="bg-warning/15 text-warning text-sm px-3 py-2 flex justify-between items-center">
          Connection lost. Your session keeps running on the computer (planned).
          <button onClick={() => { setDropped(false); setLines((l) => [...l, "[reconnected — session resumed (simulated)]"]); }} className="underline">Reconnect</button>
        </div>
      )}

      <div ref={outRef} onClick={() => !window.getSelection()?.toString() && inputRef.current?.focus()} className="flex-1 overflow-auto p-3 font-mono text-sm text-terminal-foreground whitespace-pre-wrap select-text" data-testid="output">
        {lines.map((l, i) => <div key={i}>{l}</div>)}
        <div className="flex">
          <span className="text-primary">$&nbsp;</span>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Command input" className="flex-1 bg-transparent outline-none" autoFocus />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-2 pt-2 bg-background">
        {shortcuts.map((s) => (
          <button key={s.id} onClick={() => triggerShortcut(s)} className={`shrink-0 h-9 px-3 rounded-full border text-xs ${s.destructive ? "border-destructive text-destructive" : ""}`}>{s.label}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto p-2 bg-background" role="toolbar" aria-label="Keyboard accessory">
        <button className={keyBtn} onClick={() => sendKey("Esc")}>Esc</button>
        <button className={`${keyBtn} ${ctrl ? "bg-primary text-primary-foreground" : ""}`} aria-pressed={ctrl} onClick={() => sendKey("Ctrl")}>Ctrl</button>
        <button className={keyBtn} onClick={() => sendKey("Tab")}>Tab</button>
        <button className={keyBtn} aria-label="Arrow up" onClick={() => sendKey("Up")}>↑</button>
        <button className={keyBtn} aria-label="Arrow down" onClick={() => sendKey("Down")}>↓</button>
        <button className={keyBtn} aria-label="Arrow left" onClick={() => inputRef.current?.focus()}>←</button>
        <button className={keyBtn} aria-label="Arrow right" onClick={() => inputRef.current?.focus()}>→</button>
        <button className={keyBtn} onClick={copySel}>Copy</button>
        <button className={keyBtn} onClick={paste}>Paste</button>
      </div>

      {pending && (
        <div className="fixed inset-0 bg-background/80 flex items-end sm:items-center justify-center p-4" role="dialog" aria-label="Command preview">
          <div className="bg-popover rounded-xl border p-5 w-full max-w-md">
            <h2 className="font-medium">{pending.destructive || isDestructive(pending.command) ? "⚠ Confirm risky command" : "Run command?"}</h2>
            <pre className="font-mono text-sm bg-terminal text-terminal-foreground p-3 rounded mt-3">{pending.command}</pre>
            {(pending.destructive || isDestructive(pending.command)) && <p className="text-sm text-destructive mt-2">This may delete or change data on your computer.</p>}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setPending(null)} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
              <button onClick={confirmShortcut} className={`px-4 py-2 rounded-md text-sm ${pending.destructive || isDestructive(pending.command) ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>Run</button>
            </div>
          </div>
        </div>
      )}

      {manage && (
        <div className="fixed inset-0 bg-background/80 flex items-end sm:items-center justify-center p-4" role="dialog" aria-label="Manage shortcuts">
          <div className="bg-popover rounded-xl border p-5 w-full max-w-md max-h-[80vh] overflow-auto">
            <h2 className="font-medium mb-3">Shortcuts</h2>
            <ul className="space-y-2">
              {shortcuts.map((s) => (
                <li key={s.id} className="flex justify-between items-center text-sm gap-2">
                  <span className="truncate">{s.label} <code className="text-muted-foreground font-mono">{s.command}</code></span>
                  <button onClick={() => saveShortcuts(shortcuts.filter((x) => x.id !== s.id))} className="text-destructive text-xs">Remove</button>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <input placeholder="Name" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="w-full bg-input/40 rounded px-3 py-2 text-sm" />
              <input placeholder="Command" value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value })} className="w-full bg-input/40 rounded px-3 py-2 text-sm font-mono" />
              {draft.command && <p className="text-xs text-muted-foreground">Preview: <code className="font-mono">{draft.command}</code>{isDestructive(draft.command) && <span className="text-destructive"> — will require confirmation</span>}</p>}
              <button disabled={!draft.label || !draft.command} onClick={() => { saveShortcuts([...shortcuts, { id: crypto.randomUUID(), ...draft, destructive: isDestructive(draft.command) }]); setDraft({ label: "", command: "" }); }} className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50">Add shortcut</button>
            </div>
            <button onClick={() => setManage(false)} className="mt-3 w-full border rounded-md py-2 text-sm">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
