import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { GitBranch, Bot, Sparkles, Server, RefreshCw, Square } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { githubRun, workspaceStatus } from "@/lib/workspace-providers.functions";
import { describeOp, isWrite, parseGhCommand, PROVIDERS, providerState, validateGithubOp, type GithubOp, type ProviderId, type ProviderState } from "@/lib/providers";

export const Route = createFileRoute("/_authenticated/workspace-shell")({
  head: () => ({
    meta: [
      { title: "Dev workspace — Honeycomb" },
      { name: "description", content: "GitHub, Codex-style and Claude assistants in one signed-in workspace, with approvals and an activity log." },
      { property: "og:title", content: "Dev workspace — Honeycomb" },
      { property: "og:description", content: "Provider tabs with honest status, write approvals and an audit trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Workspace,
});

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const ICONS: Record<ProviderId, typeof Bot> = { github: GitBranch, codex: Sparkles, claude: Bot, runner: Server };
const STATE_LABEL: Record<ProviderState, string> = { ready: "Ready", "needs-credentials": "Needs connection", "needs-runner": "Unavailable — needs hosted runner", failed: "Failed", unknown: "Checking…" };
type Status = Awaited<ReturnType<typeof workspaceStatus>>;

function Workspace() {
  const statusFn = useServerFn(workspaceStatus), ghFn = useServerFn(githubRun);
  const [tab, setTab] = useState<ProviderId>("github");
  const [status, setStatus] = useState<Status | null>(null), [statusErr, setStatusErr] = useState("");
  const [log, setLog] = useState<string>(""), [running, setRunning] = useState(false);
  const [cmd, setCmd] = useState("gh repos");
  const [pending, setPending] = useState<GithubOp | null>(null);
  const [write, setWrite] = useState<{ kind: GithubOp["op"]; repo: string; a: string; b: string; c: string; d: string }>({ kind: "create-issue", repo: "", a: "", b: "", c: "", d: "" });
  const [prompt, setPrompt] = useState(""), [ctxFile, setCtxFile] = useState("");
  const abort = useRef<AbortController | null>(null);
  const out = useRef<HTMLPreElement>(null);

  async function refresh() {
    setStatusErr("");
    try { setStatus(await statusFn()); } catch (e) { setStatusErr(e instanceof Error ? e.message : "Status unavailable."); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { out.current?.scrollTo(0, out.current.scrollHeight); }, [log]);
  const append = (s: string) => setLog((l) => (l + s).slice(-200_000));

  const ev = { lovableAi: status?.lovableAi ?? false, github: status?.github ?? null };
  const stateOf = (id: ProviderId): ProviderState => (status || id === "runner" ? providerState(id, ev) : "unknown");

  async function runGh(op: GithubOp, approved = false) {
    const err = validateGithubOp(op);
    if (err) return append(`\n! ${err}\n`);
    if (isWrite(op) && !approved) return setPending(op);
    setPending(null); setRunning(true);
    append(`\n$ ${describeOp(op)}${approved ? "  [approved]" : ""}\n`);
    try { const r = await ghFn({ data: { op, approved } }); append(`${r.ok ? "" : "✗ "}${r.text}\n`); }
    catch (e) { append(`✗ ${e instanceof Error ? e.message : "Request failed."}\n`); }
    finally { setRunning(false); void refresh(); }
  }

  function submitCmd(e: React.FormEvent) {
    e.preventDefault();
    const op = parseGhCommand(cmd);
    if (!op) return append(`\n$ ${cmd}\n! Unknown command. Try: gh whoami | gh repos | gh repo o/r | gh branches o/r | gh commits o/r [ref] | gh issues o/r | gh cat o/r path\n  Real git CLI commands need the hosted runner, which is not available.\n`);
    void runGh(op);
  }

  function writeOp(): GithubOp {
    const { kind, repo, a, b, c, d } = write;
    if (kind === "create-branch") return { op: "create-branch", repo, branch: a, from: b || "main" };
    if (kind === "commit-file") return { op: "commit-file", repo, branch: a, path: b, message: c, content: d };
    return { op: "create-issue", repo, title: a, body: b };
  }

  async function ask(p: "codex" | "claude") {
    if (!prompt.trim()) return;
    const ctl = new AbortController(); abort.current = ctl; setRunning(true);
    append(`\n> [${p === "codex" ? "OpenAI GPT model (not Codex CLI)" : "Claude model (not Claude Code)"}] ${prompt}\n`);
    try {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) throw new Error("Sign in again.");
      const r = await fetch("/api/agent-stream", { method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify({ provider: p, prompt, context: ctxFile }) });
      if (!r.ok || !r.body) { const j = (await r.json().catch(() => null)) as { error?: string } | null; throw new Error(j?.error ?? `Request failed (${r.status}).`); }
      const reader = r.body.getReader(), dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; append(dec.decode(value, { stream: true })); }
      append("\n");
    } catch (e) {
      append(ctl.signal.aborted ? "\n[stopped]\n" : `\n✗ ${e instanceof Error ? e.message : "Request failed."}\n`);
    } finally { setRunning(false); abort.current = null; void refresh(); }
  }

  const active = PROVIDERS.find((p) => p.id === tab)!;
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Dev workspace</h1>
            <p className="text-sm text-muted-foreground">GitHub and AI assistants run on Honeycomb's servers. Nothing here runs programs on this phone, tablet or computer. Pairing a Mac is optional: <Link to="/terminal" className="underline">Mac terminal</Link> · <Link to="/dashboard" className="underline">Dashboard</Link></p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="mr-1 h-4 w-4" />Refresh status</Button>
        </header>
        {statusErr && <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">{statusErr}</p>}

        <div role="tablist" className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => {
            const Icon = ICONS[p.id], s = stateOf(p.id);
            return (
              <button key={p.id} role="tab" aria-selected={tab === p.id} onClick={() => setTab(p.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tab === p.id ? "border-primary bg-card" : "border-border"}`}>
                <Icon className="h-4 w-4" />{p.label}
                <span className={`rounded-full px-2 text-[11px] ${s === "ready" ? "bg-primary/20 text-primary" : s === "failed" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>{STATE_LABEL[s]}</span>
              </button>
            );
          })}
        </div>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground"><b>Runs on:</b> {active.backing}. <b>Can:</b> {active.capabilities.join(", ")}. {stateOf(tab) !== "ready" && <>· <b>Setup:</b> {active.setup}</>}</p>
          {tab === "github" && status?.github === "ok" && <p className="text-xs">Signed in to GitHub as <b>{status.login}</b>.</p>}
          {tab === "github" && status?.github === "failed" && <p className="text-xs text-destructive">GitHub check failed {status.githubError}</p>}

          {tab === "github" && (
            <>
              <form onSubmit={submitCmd} className="flex gap-2">
                <input aria-label="GitHub command" className={`${field} font-mono`} value={cmd} onChange={(e) => setCmd(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                <Button type="submit" disabled={running}>Run</Button>
              </form>
              <details className="rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Write to GitHub (needs approval)</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select aria-label="Write action" className={field} value={write.kind} onChange={(e) => setWrite({ ...write, kind: e.target.value as GithubOp["op"] })}>
                    <option value="create-issue">Create issue</option><option value="create-branch">Create branch</option><option value="commit-file">Commit a file</option>
                  </select>
                  <input aria-label="Repository" className={field} placeholder="owner/repo" value={write.repo} onChange={(e) => setWrite({ ...write, repo: e.target.value })} />
                  <input aria-label="First field" className={field} placeholder={write.kind === "create-issue" ? "Issue title" : "Branch"} value={write.a} onChange={(e) => setWrite({ ...write, a: e.target.value })} />
                  <input aria-label="Second field" className={field} placeholder={write.kind === "create-issue" ? "Issue body" : write.kind === "create-branch" ? "From branch (main)" : "File path"} value={write.b} onChange={(e) => setWrite({ ...write, b: e.target.value })} />
                  {write.kind === "commit-file" && <>
                    <input aria-label="Commit message" className={field} placeholder="Commit message" value={write.c} onChange={(e) => setWrite({ ...write, c: e.target.value })} />
                    <textarea aria-label="File content" className={`${field} font-mono sm:col-span-2`} rows={6} placeholder="Full new file content" value={write.d} onChange={(e) => setWrite({ ...write, d: e.target.value })} />
                  </>}
                </div>
                <Button className="mt-2" variant="outline" disabled={running} onClick={() => runGh(writeOp())}>Review write…</Button>
              </details>
            </>
          )}

          {(tab === "codex" || tab === "claude") && (
            <div className="space-y-2">
              <textarea aria-label="Prompt" className={field} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask for code, a review, or commands to run yourself…" />
              <textarea aria-label="Context" className={`${field} font-mono`} rows={2} value={ctxFile} onChange={(e) => setCtxFile(e.target.value)} placeholder="Optional: paste a file (or use gh cat output) as context" />
              <div className="flex gap-2">
                <Button disabled={running || !prompt.trim() || stateOf(tab) !== "ready"} onClick={() => ask(tab)}>Send</Button>
                {running && <Button variant="outline" onClick={() => abort.current?.abort()}><Square className="mr-1 h-4 w-4" />Stop</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Answers are suggestions only. To apply one, review it and commit it from the GitHub tab, which asks for your approval.</p>
            </div>
          )}

          {tab === "runner" && (
            <p className="text-sm">Not available. Running the real <code>git</code>, <code>codex</code> or <code>claude</code> programs needs an isolated hosted sandbox, which isn't set up yet. Honeycomb won't pretend to run them. You can use the GitHub tab, the AI tabs, or a paired Mac in the meantime.</p>
          )}
        </section>

        {pending && (
          <section role="dialog" aria-label="Approve write" className="space-y-2 rounded-2xl border border-primary bg-card p-4">
            <h2 className="font-semibold">Approve this change to GitHub?</h2>
            <p className="break-all text-sm">{describeOp(pending)}</p>
            {pending.op === "commit-file" && <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{pending.content.slice(0, 4000)}</pre>}
            <div className="flex gap-2"><Button onClick={() => runGh(pending, true)}>Approve</Button><Button variant="outline" onClick={() => setPending(null)}>Cancel</Button></div>
          </section>
        )}

        <pre ref={out} aria-label="Output" aria-live="polite" className="h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-background p-3 font-mono text-xs">{log || "Output appears here."}</pre>

        <section className="space-y-1">
          <h2 className="text-sm font-semibold">Activity log</h2>
          {(status?.audit ?? []).length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
          <ul className="space-y-1 text-xs">
            {(status?.audit ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-2 rounded-lg border border-border px-2 py-1">
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                <b>{a.provider}</b><span>{a.action}{a.write ? " (write)" : ""}</span><span>{a.target}</span>
                <span className={a.outcome === "ok" ? "text-primary" : "text-destructive"}>{a.outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
