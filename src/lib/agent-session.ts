/** Pure multi-agent session rules: addressing, shared context, handoffs and shell-task gating. No network, no secrets. */

export type AgentId = "codex" | "claude" | "omni";
export type AgentState = "ready" | "unconfigured";

export interface SessionAgent {
  id: AgentId;
  label: string;
  backing: string;
  /** Credential scope this agent may use; never shared with other agents. */
  scope: string;
}

export const AGENTS: SessionAgent[] = [
  { id: "codex", label: "Codex", backing: "OpenAI GPT model via Lovable AI (not the Codex CLI)", scope: "Server-side Lovable AI key, chat only" },
  { id: "claude", label: "Claude", backing: "Anthropic Claude model via Lovable AI (not Claude Code)", scope: "Server-side Lovable AI key, chat only" },
  { id: "omni", label: "OMNI", backing: "OMNI orchestrator", scope: "Needs an OMNI connection — none is configured" },
];

/** Only server evidence makes an agent ready; OMNI has no adapter yet. */
export function agentState(id: AgentId, ev: { lovableAi: boolean }): AgentState {
  if (id === "omni") return "unconfigured";
  return ev.lovableAi ? "ready" : "unconfigured";
}

export interface Addressed { targets: AgentId[]; text: string; shell: string | null }

/**
 * Parses `@claude @codex message`, `@all message`, or `$ command`.
 * With no mention, the message goes to the currently selected agents.
 */
export function parseMessage(input: string, selected: AgentId[]): Addressed {
  let rest = input.trim();
  if (rest.startsWith("$")) return { targets: [], text: "", shell: rest.slice(1).trim() };
  const targets = new Set<AgentId>();
  for (;;) {
    const m = /^@(\w+)[\s,]*/i.exec(rest);
    if (!m) break;
    const name = m[1]!.toLowerCase();
    if (name === "all") AGENTS.forEach((a) => targets.add(a.id));
    else if (AGENTS.some((a) => a.id === name)) targets.add(name as AgentId);
    else break;
    rest = rest.slice(m[0].length);
  }
  return { targets: targets.size ? [...targets] : [...selected], text: rest.trim(), shell: null };
}

export type Risk = "read" | "write" | "dangerous" | "blocked";
export interface ShellCheck { risk: Risk; reason: string }

const READ = new Set(["ls", "cat", "pwd", "echo", "head", "tail", "wc", "grep", "rg", "find", "git", "node", "npm", "bun", "python3", "which", "env"]);
const GIT_READ = new Set(["status", "log", "diff", "show", "branch", "remote", "rev-parse"]);
const WRITE = new Set(["mkdir", "touch", "cp", "mv", "tee", "sed", "npm", "bun", "git", "codex", "claude"]);
const DANGEROUS = /(\brm\b|\bsudo\b|\bchmod\b|\bchown\b|\bdd\b|\bmkfs|\bshutdown\b|\breboot\b|\bkill\b|curl[^|]*\|\s*(ba|z)?sh|wget[^|]*\|\s*(ba|z)?sh|>\s*\/|:\(\)\s*\{|--force\b|\bpush\b.*-f\b)/;

/** Classifies a shell task against the allowlist. Unknown programs are blocked, never guessed. */
export function checkShell(cmd: string): ShellCheck {
  const c = cmd.trim();
  if (!c) return { risk: "blocked", reason: "Empty command." };
  if (c.length > 2000) return { risk: "blocked", reason: "Command too long." };
  if (/[\u0000-\u0008\u000b-\u001f]/.test(c)) return { risk: "blocked", reason: "Control characters are not allowed." };
  if (DANGEROUS.test(c)) return { risk: "dangerous", reason: "Deletes, escalates, force-pushes or pipes downloads into a shell." };
  const segments = c.split(/&&|\|\||;|\|/).map((s) => s.trim()).filter(Boolean);
  let risk: Risk = "read";
  for (const seg of segments) {
    const [prog, sub] = seg.split(/\s+/);
    if (!prog || (!READ.has(prog) && !WRITE.has(prog))) return { risk: "blocked", reason: `"${prog}" is not on the allowlist.` };
    const readOnly = READ.has(prog) && (prog !== "git" || GIT_READ.has(sub ?? "")) && !(prog === "npm" || prog === "bun") || (prog === "npm" && sub === "ls");
    if (!readOnly || />/.test(seg)) risk = "write";
  }
  return { risk, reason: risk === "write" ? "Changes files, installs packages or runs an agent CLI." : "Read-only." };
}

export const needsApproval = (r: Risk) => r === "write" || r === "dangerous";

export interface Turn { who: "you" | AgentId | "runner"; text: string; at: number }

/** Shared transcript given to every agent so handoffs keep context. Newest turns win when trimmed. */
export function sharedContext(turns: Turn[], max = 24000): string {
  let out = "";
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]!;
    const line = `[${t.who === "you" ? "User" : t.who === "runner" ? "Runner" : AGENTS.find((a) => a.id === t.who)!.label}] ${t.text}\n`;
    if (out.length + line.length > max) break;
    out = line + out;
  }
  return out;
}

/** Prompt for one agent in a multi-agent turn, naming collaborators and the handoff source. */
export function agentPrompt(agent: AgentId, text: string, peers: AgentId[], handoffFrom?: AgentId): string {
  const others = peers.filter((p) => p !== agent).map((p) => AGENTS.find((a) => a.id === p)!.label);
  const lines = [`You are ${AGENTS.find((a) => a.id === agent)!.label} in a shared Honeycomb session.`];
  if (others.length) lines.push(`Also answering: ${others.join(", ")}. Build on their replies in the transcript; do not repeat them.`);
  if (handoffFrom) lines.push(`${AGENTS.find((a) => a.id === handoffFrom)!.label} handed this task to you.`);
  lines.push("You cannot run commands. Suggest shell tasks as lines starting with `$ ` for the user to approve.");
  lines.push("", text);
  return lines.join("\n");
}
