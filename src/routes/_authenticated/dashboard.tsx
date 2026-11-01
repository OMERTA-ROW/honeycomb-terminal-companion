import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, Globe, Laptop, RefreshCw, ShieldCheck, Terminal } from "lucide-react";
import { requestSequence } from "@/lib/request-sequence";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { accountStatus, myHosts } from "@/lib/members.functions";
import { agentStatus, askAgent } from "@/lib/agent.functions";
import { deriveStatuses, hostState, type HostRecord, type StatusInput } from "@/lib/feature-status";
import { useAccountUser } from "@/hooks/use-account-user";
import { liveUrl, loadComputers, type MacLink } from "@/lib/mac-link";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command center — Honeycomb" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});
const field =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function Dashboard() {
  const status = useServerFn(accountStatus),
    hostsFn = useServerFn(myHosts),
    agentFn = useServerFn(agentStatus),
    ask = useServerFn(askAgent);
  const { user } = useAccountUser();
  const [input, setInput] = useState<StatusInput | null>(null),
    [checking, setChecking] = useState(false);
  const [computers, setComputers] = useState<MacLink[]>([]);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof agentStatus>> | null>(null);
  const [provider, setProvider] = useState<"gemini" | "claude" | "openai" | "perplexity">("openai");
  const [prompt, setPrompt] = useState(""),
    [sending, setSending] = useState(false),
    [answer, setAnswer] = useState("");
  const [website, setWebsite] = useState("");
  const sequence = useRef(requestSequence()),
    alive = useRef(true),
    inFlight = useRef(false);
  useEffect(() => {
    setComputers(user ? loadComputers(user.id) : []);
    setAnswer("");
    setProviders(null);
  }, [user?.id]);
  async function refresh() {
    const id = sequence.current.begin();
    setChecking(true);
    let membership: StatusInput["membership"] = "error",
      role: string | null = null;
    try {
      const s = await status();
      membership = s.state === "member" ? "member" : s.state === "revoked" ? "revoked" : "none";
      if (s.state === "member") role = s.role;
    } catch {
      /* preserve denial */
    }
    let hosts: HostRecord[] | null = null,
      hostsError = false,
      agents: Awaited<ReturnType<typeof agentStatus>> | null = null;
    if (membership === "member") {
      const results = await Promise.allSettled([hostsFn(), agentFn()]);
      if (results[0].status === "fulfilled") hosts = results[0].value;
      else hostsError = true;
      if (results[1].status === "fulfilled") agents = results[1].value;
    }
    if (alive.current && sequence.current.isCurrent(id)) {
      setInput({ membership, role, hosts, hostsError, now: Date.now() });
      setProviders(agents);
      setChecking(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void refresh();
    const t = setInterval(() => void refresh(), 30000);
    return () => {
      alive.current = false;
      sequence.current.invalidate();
      clearInterval(t);
    };
  }, [user?.id]);
  async function sendPrompt() {
    if (inFlight.current || !prompt.trim()) return;
    inFlight.current = true;
    setSending(true);
    setAnswer("");
    try {
      const result = await ask({ data: { provider, prompt: prompt.trim() } });
      if (alive.current)
        setAnswer(`${result.ok ? "Response received" : "Request failed"} · ${result.source}\n\n${result.text}`);
    } catch (e) {
      if (alive.current)
        setAnswer(e instanceof Error ? e.message : "Request failed. Check your sign-in and try again.");
    } finally {
      inFlight.current = false;
      if (alive.current) setSending(false);
    }
  }
  let webUrl: string | null = null;
  try {
    const u = new URL(website.trim());
    if (u.protocol === "https:" && !u.username && !u.password) webUrl = u.href;
  } catch {
    /* user is typing */
  }
  const enrolled = input?.hosts?.filter((h) => !h.revoked_at) ?? [];
  const online = enrolled.filter((h) => input && hostState(h, input.now) === "live");
  const rows = input ? deriveStatuses(input) : [];
  const configured = providers?.[provider]?.startsWith("ready") ?? false;
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 pb-8">
        <header className="py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Workspace</span>
            <Button variant="outline" size="sm" disabled={checking} onClick={() => void refresh()}>
              <RefreshCw className={`mr-2 h-3 w-3 ${checking ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Your Mac, agents and web tools.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/terminal">
                <Laptop className="mr-2 h-4 w-4" />
                Open Mac workspace
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#agents">
                <Bot className="mr-2 h-4 w-4" />
                Ask an agent
              </a>
            </Button>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Current status">
          <div className="rounded-2xl border border-border bg-card p-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">
              {!input
                ? "Checking account"
                : input.membership === "member"
                  ? `${input.role ?? "Member"} access verified`
                  : "Account needs attention"}
            </p>
            <Link to="/account" className="mt-1 block text-xs text-muted-foreground underline">
              Account & security
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Laptop className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">
              {input?.hostsError
                ? "Mac status unavailable"
                : `${online.length} helper${online.length === 1 ? "" : "s"} reporting in`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {enrolled.length} registered · shell approval checked on the Mac
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <Bot className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">{providers ? "Agent configuration checked" : "Agent check pending"}</p>
            <p className="mt-1 text-xs text-muted-foreground">A successful reply confirms a provider request.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <section
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:col-span-3"
            id="agents"
            aria-labelledby="agents-title"
          >
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <h2 id="agents-title" className="text-xl font-semibold">
                Agent desk
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask a question directly. Coding agents run in your Mac workspace.
            </p>
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void sendPrompt();
              }}
            >
              <label className="block text-xs text-muted-foreground">
                Model
                <select
                  aria-label="AI provider"
                  className={`${field} mt-2`}
                  value={provider}
                  disabled={sending}
                  onChange={(e) => setProvider(e.target.value as typeof provider)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="perplexity">Perplexity</option>
                </select>
              </label>
              <p className="text-xs text-muted-foreground" role="status">
                {providers
                  ? configured
                    ? "Configured · response not yet tested here"
                    : providers[provider]
                  : "Checking provider configuration…"}
              </p>
              <textarea
                aria-label="Your question"
                placeholder="What would you like to work on?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={4000}
                rows={4}
                required
                className={`${field} resize-y`}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xs text-xs text-muted-foreground">
                  Sends your question to the selected provider. Uses configured AI credits.
                </p>
                <Button
                  disabled={sending || !configured || input?.membership !== "member" || !prompt.trim()}
                  type="submit"
                >
                  {sending ? "Waiting for reply…" : "Send question"}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
            {answer && (
              <div
                role="status"
                className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 text-sm leading-6"
              >
                {answer}
              </div>
            )}
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-medium">Codex & Claude Code</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Open your approved Mac shell, select your project folder, then run codex or claude. Provider sign-in
                stays on your Mac. The current helper works best with line commands.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <Link to="/terminal">Connect coding agents</Link>
              </Button>
            </div>
          </section>
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Your Mac</h2>
              </div>
              <div className="mt-4 space-y-3">
                {computers.length ? (
                  computers.map((c) => (
                    <a
                      key={c.address}
                      href={liveUrl(c.address)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.address}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Save your Mac address in Connect Mac to keep it here.</p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Saved shortcuts do not prove a live connection. The Mac verifies this browser when you open it.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/terminal">Manage Mac connections</Link>
              </Button>
            </section>
            <section id="web" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Web workspace</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a website in its own secure tab. Sign in directly on that site.
              </p>
              <label className="mt-4 block text-xs text-muted-foreground">
                Website address
                <input
                  aria-label="Website address"
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={`${field} mt-2`}
                />
              </label>
              {website && !webUrl && (
                <p role="alert" className="mt-2 text-xs text-warning">
                  Use an HTTPS address without a username or password.
                </p>
              )}
              {webUrl ? (
                <Button asChild className="mt-3 w-full">
                  <a href={webUrl} target="_blank" rel="noopener noreferrer">
                    Open website
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button disabled className="mt-3 w-full">
                  Open website
                </Button>
              )}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Opening a site does not authorize an agent to control it. Automated actions need a supported, approved
                integration.
              </p>
            </section>
          </div>
        </div>
        <details className="rounded-2xl border border-border p-5">
          <summary className="cursor-pointer text-sm font-medium">Connection details & troubleshooting</summary>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {rows
              .filter((r) => r.id !== "sandbox")
              .map((r) => (
                <li key={r.id} className="text-sm">
                  <p className="font-medium">{r.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{r.evidence}</p>
                  {r.to && (
                    <Link to={r.to} className="mt-1 block text-xs text-primary underline">
                      {r.next}
                    </Link>
                  )}
                </li>
              ))}
          </ul>
          {input && (
            <p className="mt-4 text-xs text-muted-foreground">
              Last check {new Date(input.now).toLocaleTimeString()} · refreshes every 30 seconds
            </p>
          )}
        </details>
      </div>
    </AppShell>
  );
}
