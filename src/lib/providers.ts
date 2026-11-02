/** Browser-safe provider adapter registry for the dev workspace. Pure: no network, no secrets. */

export type ProviderId = "github" | "codex" | "claude" | "runner";
export type Capability = "read" | "write" | "chat" | "exec";
export type ProviderState = "ready" | "needs-credentials" | "needs-runner" | "failed" | "unknown";

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  /** What actually runs — shown to the user so a model API is never mistaken for a CLI. */
  backing: string;
  capabilities: Capability[];
  setup: string;
}

export const PROVIDERS: ProviderAdapter[] = [
  { id: "github", label: "GitHub", backing: "GitHub REST API through your linked GitHub connection", capabilities: ["read", "write"], setup: "Link a GitHub connection to this project (Connectors → GitHub)." },
  { id: "codex", label: "Codex", backing: "OpenAI GPT model via Lovable AI — not the Codex CLI; it cannot run commands or edit files", capabilities: ["chat"], setup: "Uses Lovable AI; no key needed." },
  { id: "claude", label: "Claude", backing: "Anthropic Claude model via Lovable AI — not Claude Code; it cannot run commands or edit files", capabilities: ["chat"], setup: "Uses Lovable AI; no key needed." },
  { id: "runner", label: "Hosted runner", backing: "Isolated cloud sandbox for real CLIs (git, codex, claude, npm)", capabilities: ["exec"], setup: "Not built: needs a hosted sandbox provider and its credentials. Until then no CLI binary runs anywhere from this app." },
];

export function provider(id: ProviderId): ProviderAdapter {
  return PROVIDERS.find((p) => p.id === id)!;
}

export type GithubOp =
  | { op: "whoami" }
  | { op: "repos" }
  | { op: "repo"; repo: string }
  | { op: "branches"; repo: string }
  | { op: "commits"; repo: string; ref?: string }
  | { op: "issues"; repo: string }
  | { op: "read"; repo: string; path: string; ref?: string }
  | { op: "create-issue"; repo: string; title: string; body: string }
  | { op: "create-branch"; repo: string; branch: string; from: string }
  | { op: "commit-file"; repo: string; branch: string; path: string; content: string; message: string };

export const WRITE_OPS = new Set<GithubOp["op"]>(["create-issue", "create-branch", "commit-file"]);
export const isWrite = (op: GithubOp) => WRITE_OPS.has(op.op);

const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const REF = /^(?!.*\.\.)(?!\/)(?!.*\/$)[A-Za-z0-9._/-]{1,200}$/;
const PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\u0000-\u001f]{1,400}$/;

/** Validates a GitHub operation; returns an error string or null. Shared by the UI and the server. */
export function validateGithubOp(o: GithubOp): string | null {
  if (o.op === "whoami" || o.op === "repos") return null;
  if (!REPO.test(o.repo)) return "Repository must look like owner/name.";
  if ("ref" in o && o.ref !== undefined && o.ref !== "" && !REF.test(o.ref)) return "Invalid branch or ref.";
  switch (o.op) {
    case "read": return PATH.test(o.path) ? null : "Invalid file path.";
    case "create-issue": return o.title.trim() && o.title.length <= 256 && o.body.length <= 20000 ? null : "Issue title is required (max 256 chars).";
    case "create-branch": return REF.test(o.branch) && REF.test(o.from) ? null : "Invalid branch name.";
    case "commit-file":
      if (!REF.test(o.branch)) return "Invalid branch name.";
      if (!PATH.test(o.path)) return "Invalid file path.";
      if (!o.message.trim() || o.message.length > 500) return "Commit message is required.";
      return o.content.length <= 500_000 ? null : "File content is too large (500 KB max).";
    default: return null;
  }
}

/** Human summary shown in the approval prompt and stored in the audit trail. */
export function describeOp(o: GithubOp): string {
  switch (o.op) {
    case "whoami": return "Show signed-in GitHub account";
    case "repos": return "List your repositories";
    case "repo": return `Show ${o.repo}`;
    case "branches": return `List branches of ${o.repo}`;
    case "commits": return `List commits of ${o.repo}${o.ref ? `@${o.ref}` : ""}`;
    case "issues": return `List open issues of ${o.repo}`;
    case "read": return `Read ${o.repo}/${o.path}`;
    case "create-issue": return `Create issue "${o.title}" in ${o.repo}`;
    case "create-branch": return `Create branch ${o.branch} from ${o.from} in ${o.repo}`;
    case "commit-file": return `Commit ${o.path} to ${o.repo}@${o.branch}: "${o.message}"`;
  }
}

/** Parses a workspace command line like `gh branches owner/repo`. Returns null for unknown input. */
export function parseGhCommand(line: string): GithubOp | null {
  const [cmd, sub, a, b] = line.trim().split(/\s+/);
  if (cmd !== "gh") return null;
  switch (sub) {
    case "whoami": return { op: "whoami" };
    case "repos": return { op: "repos" };
    case "repo": return a ? { op: "repo", repo: a } : null;
    case "branches": return a ? { op: "branches", repo: a } : null;
    case "commits": return a ? { op: "commits", repo: a, ...(b ? { ref: b } : {}) } : null;
    case "issues": return a ? { op: "issues", repo: a } : null;
    case "cat": {
      if (!a || !b) return null;
      return { op: "read", repo: a, path: b };
    }
    default: return null;
  }
}

/** Status is "ready" only from server evidence; anything else stays explicit. */
export function providerState(id: ProviderId, evidence: { lovableAi: boolean; github: "ok" | "missing" | "failed" | null }): ProviderState {
  if (id === "runner") return "needs-runner";
  if (id === "github") return evidence.github === "ok" ? "ready" : evidence.github === "missing" ? "needs-credentials" : evidence.github === "failed" ? "failed" : "unknown";
  return evidence.lovableAi ? "ready" : "needs-credentials";
}
