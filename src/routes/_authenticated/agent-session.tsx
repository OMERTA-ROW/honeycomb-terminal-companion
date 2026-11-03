import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Send, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { workspaceStatus } from "@/lib/workspace-providers.functions";
import { recordWav, transcribeClip } from "@/lib/voice-client";
import { AGENTS, agentPrompt, agentState, checkShell, needsApproval, parseMessage, sharedContext, type AgentId, type ShellCheck, type Turn } from "@/lib/agent-session";

export const Route = createFileRoute("/_authenticated/agent-session")({
  head: () => ({
    meta: [
      { title: "Agent session — Honeycomb" },
      { name: "description", content: "Talk to Codex, Claude and OMNI together in one shared, signed-in session with approvals and stop controls." },
      { property: "og:title", content: "Agent session — Honeycomb" },
      { property: "og:description", content: "Multi-agent shared session with honest provider status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Session,
});

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const label = (w: Turn["who"]) => (w === "you" ? "You" : w === "runner" ? "Runner" : AGENTS.find((a) => a.id === w)!.label);

function Session() {
  const statusFn = useServerFn(workspaceStatus);
  const [ai, setAi] = useState<boolean | null>(null), [statusErr, setStatusErr] = useState("");
  const [selected, setSelected] = useState<AgentId[]>(["claude"]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState<AgentId[]>([]);
  const [pending, setPending] = useState<{ cmd: string; check: ShellCheck } | null>(null);
  const [rec, setRec] = useState<{ stop: () => Promise<File>; cancel: () => void } | null>(null), [voiceMsg, setVoiceMsg] = useState("");
  const aborts = useRef(new Map<AgentId, AbortController>());
  const turnsRef = useRef<Turn[]>([]);
  const end = useRef<HTMLDivElement>(null);
  turnsRef.current = turns;

  async function refresh() {
    setStatusErr("");
    try { setAi((await statusFn()).lovableAi); } catch (e) { setStatusErr(e instanceof Error ? e.message : "Status unavailable."); setAi(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns]);

  const push = (t: Omit<Turn, "at">) => setTurns((ts) => { const n = [...ts, { ...t, at: Date.now() }]; turnsRef.current = n; return n; });
  const appendTo = (idx: number, s: string) => setTurns((ts) => ts.map((t, i) => (i === idx ? { ...t, text: t.text + s } : t)));
  const stateOf = (id: AgentId) => (ai === null ? "checking" : agentState(id, { lovableAi: ai }));

  async function askAgent(id: AgentId, text: string, peers: AgentId[], from?: AgentId) {
    if (stateOf(id) !== "ready") { push({ who: id, text: `[not connected] ${id === "omni" ? "OMNI has no connection configured; nothing was sent." : "AI is not enabled; nothing was sent."}` }); return; }
    const context = sharedContext(turnsRef.current);
    let idx = -1;
    setTurns((ts) => { idx = ts.length; const n = [...ts, { who: id, text: "", at: Date.now() }]; turnsRef.current = n; return n; });
    const ctl = new AbortController(); aborts.current.set(id, ctl); setRunning((r) => [...r, id]);
    try {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) throw new Error("Sign in again.");
      const r = await fetch("/api/agent-stream", { method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify({ provider: id, prompt: agentPrompt(id, text, peers, from), context }) });
      if (!r.ok || !r.body) { const j = (await r.json().catch(() => null)) as { error?: string } | null; throw new Error(j?.error ?? `Request failed (${r.status}).`); }
      const reader = r.body.getReader(), dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; appendTo(idx, dec.decode(value, { stream: true })); }
    } catch (e) {
      appendTo(idx, ctl.signal.aborted ? "\n[stopped]" : `\n✗ ${e instanceof Error ? e.message : "Request failed."}`);
    } finally { aborts.current.delete(id); setRunning((r) => r.filter((x) => x !== id)); }
  }

  function shell(cmd: string) {
    const check = checkShell(cmd);
    push({ who: "you", text: `$ ${cmd}` });
    if (check.risk === "blocked") return push({ who: "runner", text: `✗ Blocked: ${check.reason}` });
    if (needsApproval(check.risk)) return setPending({ cmd, check });
    runShell(cmd, check, false);
  }
  function runShell(cmd: string, check: ShellCheck, approved: boolean) {
    setPending(null);
    push({ who: "runner", text: `✗ Not run${approved ? " (approved)" : ""}: no hosted runner is connected, so "${cmd}" did not execute anywhere. Risk: ${check.risk}. Use your paired Mac terminal or wait for the hosted runner.` });
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const m = parseMessage(input, selected);
    if (m.shell !== null) { setInput(""); return shell(m.shell); }
    if (!m.text || !m.targets.length) return;
    setInput(""); push({ who: "you", text: input.trim() });
    await Promise.all(m.targets.map((id) => askAgent(id, m.text, m.targets)));
  }

  function handoff(from: AgentId, to: AgentId) {
    const last = [...turnsRef.current].reverse().find((t) => t.who === from);
    if (!last) return;
    push({ who: "you", text: `Handoff ${label(from)} → ${label(to)}` });
    void askAgent(to, `Continue this work from ${label(from)}:\n${last.text.slice(0, 6000)}`, [to], from);
  }

  const stopAll = () => aborts.current.forEach((c) => c.abort());

  async function voice() {
    setVoiceMsg("");
    if (rec) {
      setRec(null); setVoiceMsg("Transcribing…");
      try { const f = await rec.stop(); const t = await transcribeClip(f, (d) => setInput(d)); setInput(t); setVoiceMsg("Review and press Send."); }
      catch (e) { setVoiceMsg(e instanceof Error ? e.message : "Voice failed."); }
      return;
    }
    try { setRec(await recordWav()); setVoiceMsg("Listening… tap again to stop."); }
    catch (e) { setVoiceMsg(e instanceof Error ? e.message : "Microphone unavailable."); }
  }

  const toggle = (id: AgentId) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Agent session</h1>
            <p className="text-sm text-muted-foreground">Talk to several assistants in one shared conversation. Agents only reply with text; shell tasks need a hosted runner, which is <b>not connected</b>. <Link to="/workspace-shell" className="underline">Dev workspace</Link> · <Link to="/dashboard" className="underline">Dashboard</Link> · <Link to="/terminal" className="underline">Mac terminal</Link></p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="mr-1 h-4 w-4" />Status</Button>
            <Button size="sm" variant="destructive" onClick={stopAll} disabled={!running.length}><Square className="mr-1 h-4 w-4" />Stop all</Button>
          </div>
        </header>
        {statusErr && <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">{statusErr}</p>}

        <div className="grid gap-2 sm:grid-cols-4">
          {AGENTS.map((a) => {
            const s = stateOf(a.id);
            return (
              <label key={a.id} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm ${selected.includes(a.id) ? "border-primary bg-card" : "border-border"}`}>
                <span className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} /> <b>{a.label}</b>
                  <span className={`ml-auto rounded-full px-2 text-[11px] ${s === "ready" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{s === "ready" ? (running.includes(a.id) ? "Replying…" : "Ready") : s === "checking" ? "Checking…" : "Not connected"}</span>
                </span>
                <span className="text-xs text-muted-foreground">{a.backing}. Access: {a.scope}.</span>
              </label>
            );
          })}
          <div className="flex flex-col gap-1 rounded-xl border border-border p-3 text-sm">
            <span className="flex items-center gap-2"><b>Hosted runner</b><span className="ml-auto rounded-full bg-muted px-2 text-[11px] text-muted-foreground">Unavailable</span></span>
            <span className="text-xs text-muted-foreground">Needs an isolated cloud sandbox provider. No command runs until one is connected.</span>
          </div>
        </div>

        <section aria-label="Session transcript" className="max-h-[55vh] min-h-48 space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-4">
          {!turns.length && <p className="text-sm text-muted-foreground">Try <code>@claude @codex review my plan</code>, <code>@all</code>, or a shell task like <code>$ git status</code>.</p>}
          {turns.map((t, i) => (
            <div key={i} className="text-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">{label(t.who)}
                {t.who !== "you" && t.who !== "runner" && t.text && !running.includes(t.who) && AGENTS.filter((a) => a.id !== t.who).map((a) => (
                  <button key={a.id} className="rounded border border-border px-1 font-normal hover:bg-muted" onClick={() => handoff(t.who as AgentId, a.id)}>Hand to {a.label}</button>
                ))}
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] select-text">{t.text || "…"}</pre>
            </div>
          ))}
          <div ref={end} />
        </section>

        {pending && (
          <div role="alertdialog" className="space-y-2 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <p><b>{pending.check.risk === "dangerous" ? "Dangerous command" : "Write command"}:</b> <code>{pending.cmd}</code></p>
            <p className="text-muted-foreground">{pending.check.reason} Approving still won't run it until a hosted runner is connected.</p>
            <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => runShell(pending.cmd, pending.check, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => { push({ who: "runner", text: "Rejected by you." }); setPending(null); }}>Reject</Button></div>
          </div>
        )}

        <form onSubmit={send} className="flex gap-2">
          <Button type="button" variant={rec ? "destructive" : "outline"} onClick={voice} aria-label={rec ? "Stop recording" : "Speak"}><Mic className="h-4 w-4" /></Button>
          <textarea aria-label="Message" rows={2} className={field} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="@claude … or $ command" />
          <Button type="submit" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
        </form>
        {voiceMsg && <p className="text-xs text-muted-foreground">{voiceMsg}</p>}
      </div>
    </AppShell>
  );
}
