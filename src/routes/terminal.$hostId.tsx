import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HiveBackdrop } from "@/components/HiveBackdrop";
import { historyIndex, insertAtSelection, KEY_COMBINATIONS, moveCursor } from "@/lib/command-entry";
import { useHosts } from "@/hooks/use-hosts";
import { DEFAULT_SHORTCUTS, SHORTCUTS_KEY, STATUS_INFO, isDestructive, simulate, type Shortcut } from "@/lib/terminal";
import { EXECUTION_TARGETS, type ExecutionTargetId } from "@/lib/jobs";

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

export function Terminal() {
  const { hostId } = Route.useParams();
  const { hosts } = useHosts();
  const host = hosts.find((h) => h.id === hostId);
  const [lines, setLines] = useState<string[]>(["[simulated session] Connected to sample host. Type 'help'."]);
  const [input, setInput] = useState("");
  const [ctrl, setCtrl] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const historyDraft = useRef("");
  const selectionRef = useRef({ start: 0, end: 0 });
  const [notice, setNotice] = useState("");
  const [hIdx, setHIdx] = useState(-1);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [pending, setPending] = useState<Shortcut | null>(null);
  const [manage, setManage] = useState(false);
  const [dropped, setDropped] = useState(false);
  const [draft, setDraft] = useState({ label: "", command: "", keyCombo: "" });
  const [target, setTarget] = useState<ExecutionTargetId>("host");
  const inputRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHORTCUTS_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(stored) && stored.every((s) => s && typeof s.id === "string" && typeof s.label === "string" && typeof s.command === "string" && typeof s.destructive === "boolean" && (s.keyCombo === undefined || KEY_COMBINATIONS.some((key) => key === s.keyCombo)))) setShortcuts(stored);
    } catch { setNotice("Saved shortcuts could not be read. Default shortcuts are shown."); }
  }, []);
  useEffect(() => { outRef.current?.scrollTo(0, 1e9); }, [lines]);
  useEffect(() => {
    setDropped(!navigator.onLine);
    const off = () => setDropped(true);
    window.addEventListener("offline", off);
    return () => window.removeEventListener("offline", off);
  }, []);

  const saveShortcuts = (s: Shortcut[]) => {
    setShortcuts(s);
    try { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(s)); }
    catch { setNotice("Shortcuts work for this visit, but could not be saved on this device."); }
  };

  if (!host || !STATUS_INFO[host.status].canOpen) {
    const info = host ? STATUS_INFO[host.status] : null;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-lg border bg-card p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold">{host ? `${host.name}: ${info?.label}` : "Computer not found"}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{info?.next ?? "It may have been removed."}</p>
          <Link to="/" className="inline-block mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Back to computers</Link>
        </div>
      </div>
    );
  }

  const pickTarget = (id: ExecutionTargetId) => {
    const t = EXECUTION_TARGETS.find((x) => x.id === id);
    if (!t) return;
    if (!t.available) { setNotice(`${t.label}: ${t.note}`); return; }
    setTarget(id);
    setNotice("");
  };

  const run = (cmd: string) => {
    if (dropped) { setNotice("Reconnect before entering commands. This session is simulated."); return; }
    if (target !== "host") { setNotice("Only the paired computer target is available in this preview, and it is simulated."); return; }
    if (cmd.trim() === "clear") { setLines([]); setInput(""); return; }
    const out = simulate(cmd);
    setLines((l) => [...l, `$ ${cmd}`, ...(out ? out.split("\n") : [])]);
    if (cmd.trim()) setHistory((h) => [cmd, ...h]);
    setHIdx(-1);
    setInput("");
  };

  const rememberSelection = () => {
    const el = inputRef.current;
    if (el) selectionRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
  };
  const insertText = (text: string) => {
    const { start, end } = selectionRef.current;
    const edit = insertAtSelection(input, start, end, text);
    setInput(edit.value);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(edit.cursor, edit.cursor); rememberSelection(); });
  };
  const navigateHistory = (direction: "up" | "down") => {
    if (hIdx === -1 && direction === "up") historyDraft.current = input;
    const index = historyIndex(hIdx, direction, history.length);
    setHIdx(index);
    setInput(index >= 0 ? (history[index] ?? "") : historyDraft.current);
  };
  const sendKey = (key: string) => {
    if (dropped) return;
    if (key === "Left" || key === "Right") {
      rememberSelection();
      const { start, end } = selectionRef.current;
      const position = moveCursor(input, start, end, key === "Left" ? "left" : "right");
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
      rememberSelection();
      return;
    }
    if (key === "Esc") setLines((l) => [...l, "^[ (Escape sent — simulated)"]);
    if (key === "Tab") setInput((v) => (v.startsWith("gi") ? "git status" : v.startsWith("l") ? "ls -la" : v + "\t"));
    if (key === "Up") navigateHistory("up");
    if (key === "Down") navigateHistory("down");
    if (key === "Ctrl") { setCtrl((c) => !c); }
    inputRef.current?.focus();
  };

  const ctrlCombo = (k: string) => {
    if (dropped) return;
    setCtrl(false);
    if (k === "c") { setLines((l) => [...l, `$ ${input}^C`]); setInput(""); }
    else if (k === "l") setLines([]);
    else if (k === "u") setInput("");
    else setLines((l) => [...l, `^${k.toUpperCase()} (sent — simulated)`]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    rememberSelection();
    if (e.key === "Enter") { e.preventDefault(); run(input); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sendKey("Up"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); sendKey("Down"); }
    else if (e.key === "Tab") { e.preventDefault(); sendKey("Tab"); }
    else if (e.key === "Escape") { e.preventDefault(); sendKey("Esc"); }
    else if ((e.ctrlKey || ctrl) && e.key.length === 1) { e.preventDefault(); ctrlCombo(e.key.toLowerCase()); }
  };

  const triggerShortcut = (s: Shortcut) => setPending(s);
  const confirmShortcut = () => {
    if (pending && !dropped) {
      if (pending.keyCombo?.startsWith("Ctrl+")) ctrlCombo(pending.keyCombo.slice(-1).toLowerCase());
      else if (pending.keyCombo) sendKey(pending.keyCombo.replace("Arrow", "").replace("Escape", "Esc"));
      else run(pending.command);
    }
    setPending(null);
  };

  const copySel = async () => {
    const text = window.getSelection()?.toString() || lines.join("\n");
    try {
      if (!navigator.clipboard) throw new Error("unavailable");
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch { setNotice("Copy was blocked. Allow clipboard access or copy selected text using your device’s menu."); }
  };
  const paste = async () => {
    rememberSelection();
    try {
      if (!navigator.clipboard) throw new Error("unavailable");
      const text = await navigator.clipboard.readText();
      if (text) insertText(text);
      else setNotice("Clipboard is empty.");
    } catch { setNotice("Paste was blocked. Allow clipboard access or paste using your device’s menu."); }
  };

  const keyBtn = "min-w-11 h-11 px-3 rounded-md bg-secondary text-sm font-mono active:bg-accent";

  return (
    <div className="h-dvh flex flex-col bg-terminal relative">
      <HiveBackdrop className="z-0" />
      <header className="relative z-10 flex items-center justify-between flex-wrap px-3 py-2 border-b bg-background text-sm gap-2">
        <Link to="/" className="text-muted-foreground">← Computers</Link>
        <span className="truncate">{host.name} <span className="text-warning text-xs">· simulated</span></span>
        <div className="flex gap-1">
          <Button variant="outline" onClick={() => setDropped(true)} className="text-xs border rounded px-2 py-1">Simulate drop</Button>
          <Button variant="outline" onClick={() => setManage(true)} aria-label="Manage shortcuts" className="text-xs border rounded px-2 py-1">★</Button>
        </div>
      </header>

      {dropped && (
        <div className="relative z-10 bg-warning/15 text-warning text-sm px-3 py-2 flex justify-between items-center">
          Connection lost (simulated). Check this device’s network, then reconnect; no real host session exists.
          <Button variant="outline" onClick={() => { if (!navigator.onLine) { setNotice("This device is offline. Restore its network, then reconnect."); return; } setDropped(false); setNotice(""); setLines((l) => [...l, "[reconnected — session resumed (simulated)]"]); }} className="underline">Reconnect</Button>
        </div>
      )}

      <div className="relative z-10 flex gap-1.5 overflow-x-auto px-3 py-1.5 bg-background border-b text-xs items-center" role="group" aria-label="Execution target">
        <span className="text-muted-foreground shrink-0">Run on:</span>
        {EXECUTION_TARGETS.map((t) => (
          <Button
            variant="outline"
            key={t.id}
            onClick={() => pickTarget(t.id)}
            aria-pressed={target === t.id}
            className={`shrink-0 h-7 px-2.5 rounded-full border text-xs ${target === t.id ? "border-primary text-primary" : ""} ${!t.available ? "opacity-50" : ""}`}
          >
            {t.label}{!t.available && " · soon"}
          </Button>
        ))}
      </div>

      {notice && <p role="status" className="relative z-10 bg-secondary px-3 py-2 text-sm">{notice}</p>}
      <div ref={outRef} onClick={() => !window.getSelection()?.toString() && inputRef.current?.focus()} className="relative z-10 flex-1 overflow-auto p-3 font-mono text-sm text-terminal-foreground whitespace-pre-wrap select-text" data-testid="output">
        {lines.map((l, i) => <div key={i}>{l}</div>)}
        <div className="flex">
          <span className="text-primary">$&nbsp;</span>
          <input ref={inputRef} value={input} onSelect={rememberSelection} onKeyUp={rememberSelection} onClick={rememberSelection} onChange={(e) => { setInput(e.target.value); selectionRef.current = { start: e.target.selectionStart ?? 0, end: e.target.selectionEnd ?? 0 }; }} onKeyDown={onKeyDown} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Command input" disabled={dropped} className="min-w-0 flex-1 bg-transparent outline-none" autoFocus />
        </div>
      </div>

      <div className="relative z-10 flex gap-1.5 overflow-x-auto px-2 pt-2 bg-background">
        {shortcuts.map((s) => (
          <Button variant="outline" key={s.id} onClick={() => triggerShortcut(s)} className={`shrink-0 h-9 px-3 rounded-md border text-xs ${s.destructive ? "border-destructive text-destructive" : ""}`}>{s.label}</Button>
        ))}
      </div>
      <div className="relative z-10 flex gap-1.5 overflow-x-auto p-2 bg-background" role="toolbar" aria-label="Keyboard accessory">
        <Button variant="outline" className={keyBtn} onClick={() => sendKey("Esc")}>Esc</Button>
        <Button variant="outline" className={`${keyBtn} ${ctrl ? "bg-primary text-primary-foreground" : ""}`} aria-pressed={ctrl} onClick={() => sendKey("Ctrl")}>Ctrl</Button>
        <Button variant="outline" className={keyBtn} onClick={() => sendKey("Tab")}>Tab</Button>
        <Button variant="outline" className={keyBtn} aria-label="Arrow up" onClick={() => sendKey("Up")}>↑</Button>
        <Button variant="outline" className={keyBtn} aria-label="Arrow down" onClick={() => sendKey("Down")}>↓</Button>
        <Button variant="outline" className={keyBtn} aria-label="Arrow left" onMouseDown={(e) => e.preventDefault()} onClick={() => sendKey("Left")}>←</Button>
        <Button variant="outline" className={keyBtn} aria-label="Arrow right" onMouseDown={(e) => e.preventDefault()} onClick={() => sendKey("Right")}>→</Button>
        <Button variant="outline" className={keyBtn} onClick={copySel}>Copy</Button>
        <Button variant="outline" className={keyBtn} onMouseDown={(e) => e.preventDefault()} onClick={paste}>Paste</Button>
      </div>

      {pending && (
        <div className="fixed inset-0 z-20 bg-background/80 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") { setPending(null); setManage(false); } }} aria-label="Command preview">
          <div className="bg-popover rounded-lg border p-5 w-full max-w-md">
            <h2 className="font-medium">{pending.destructive || isDestructive(pending.command) ? "⚠ Confirm risky command (simulated)" : "Preview shortcut · simulated"}</h2>
            <pre className="whitespace-pre-wrap break-all font-mono text-sm bg-terminal text-terminal-foreground p-3 rounded mt-3">{pending.keyCombo || pending.command}</pre>
            {(pending.destructive || isDestructive(pending.command)) && <p className="text-sm text-destructive mt-2">This may delete or change data on your computer.</p>}
            <p className="text-xs text-muted-foreground mt-2">Nothing executes on a real computer in this preview.</p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setPending(null)} className="px-4 py-2 rounded-md border text-sm">Cancel</Button>
              <Button variant="outline" disabled={dropped} onClick={confirmShortcut} className={`px-4 py-2 rounded-md text-sm ${pending.destructive || isDestructive(pending.command) ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>Run</Button>
            </div>
          </div>
        </div>
      )}

      {manage && (
        <div className="fixed inset-0 z-20 bg-background/80 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" onKeyDown={(e) => { if (e.key === "Escape") { setPending(null); setManage(false); } }} aria-label="Manage shortcuts">
          <div className="bg-popover rounded-lg border p-5 w-full max-w-md max-h-[80vh] overflow-auto">
            <h2 className="font-medium mb-3">Shortcuts</h2>
            <ul className="space-y-2">
              {shortcuts.map((s) => (
                <li key={s.id} className="flex justify-between items-center text-sm gap-2">
                  <span className="truncate">{s.label} <code className="text-muted-foreground font-mono">{s.keyCombo || s.command}</code></span>
                  <Button variant="outline" onClick={() => saveShortcuts(shortcuts.filter((x) => x.id !== s.id))} className="text-destructive text-xs">Remove</Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <input aria-label="Shortcut name" placeholder="Name" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="w-full bg-input/40 rounded px-3 py-2 text-sm" />
              <select aria-label="Shortcut type" value={draft.keyCombo} onChange={(e) => setDraft({ ...draft, keyCombo: e.target.value, command: "" })} className="w-full bg-background border rounded px-3 py-2 text-sm"><option value="">Command</option>{KEY_COMBINATIONS.map((key) => <option key={key} value={key}>{key}</option>)}</select>
              <input disabled={Boolean(draft.keyCombo)} aria-label="Shortcut command" placeholder="Command" value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value })} className="w-full bg-input/40 rounded px-3 py-2 text-sm font-mono" />
              {draft.command && <p className="text-xs text-muted-foreground">Preview: <code className="font-mono">{draft.command}</code>{isDestructive(draft.command) && <span className="text-destructive"> — will require confirmation</span>}</p>}
              <Button variant="outline" disabled={!draft.label.trim() || (!draft.command.trim() && !draft.keyCombo)} onClick={() => { saveShortcuts([...shortcuts, { id: crypto.randomUUID(), ...draft, destructive: isDestructive(draft.command) }]); setDraft({ label: "", command: "", keyCombo: "" }); }} className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm disabled:opacity-50">Add shortcut</Button>
            </div>
            <Button variant="outline" onClick={() => setManage(false)} className="mt-3 w-full border rounded-md py-2 text-sm">Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
