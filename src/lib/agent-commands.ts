/** Browser-safe parser for in-terminal agent commands. No network, no credentials. */
export type AskProvider = "gemini" | "perplexity" | "claude" | "openai";
export type ProviderId = "gemini" | "perplexity" | "claude-api" | "openai" | "codex" | "claude" | "mcp" | "api" | "web";

export interface AgentInfo { id: ProviderId; name: string; runtime: string; auth: string; available: boolean; needsSetup?: boolean; blocker?: string; usage: string }

export const AGENTS: AgentInfo[] = [
  { id: "gemini", name: "Google Gemini", runtime: "Honeycomb server → Lovable AI (Gemini model)", auth: "Your Honeycomb sign-in; no Google key needed", available: true, usage: "ask gemini <question>" },
  { id: "perplexity", name: "Perplexity", runtime: "Honeycomb server → Perplexity search", auth: "Owner links a Perplexity connection to the project (managed or own pplx- key)", available: true, needsSetup: true, usage: "ask perplexity <question>" },
  { id: "claude-api", name: "Claude (API model)", runtime: "Honeycomb server → Lovable AI (Claude model; not Claude Code)", auth: "Your Honeycomb sign-in", available: true, usage: "ask claude <question>" },
  { id: "openai", name: "OpenAI GPT (API model)", runtime: "Honeycomb server → Lovable AI (GPT model; not Codex)", auth: "Your Honeycomb sign-in", available: true, usage: "ask openai <question>" },
  { id: "mcp", name: "Custom MCP server", runtime: "Honeycomb server → your https MCP endpoint", auth: "Public https endpoint only; no stored tokens yet", available: true, usage: "connect mcp https://example.com/mcp" },
  { id: "api", name: "Custom API", runtime: "Honeycomb server → your https endpoint (GET)", auth: "Public https endpoint only; no stored tokens yet", available: true, usage: "connect api https://api.example.com/health" },
  { id: "codex", name: "Codex CLI", runtime: "Needs a real computer", auth: "OpenAI sign-in on that computer", available: false, blocker: "This terminal runs in your browser and the Honeycomb server cannot start programs. Install Codex on your Mac and run it from the Mac terminal (Connect Mac).", usage: "connect codex" },
  { id: "claude", name: "Claude Code CLI", runtime: "Needs a real computer", auth: "Anthropic sign-in on that computer", available: false, blocker: "This terminal runs in your browser and the Honeycomb server cannot start programs. Install Claude Code on your Mac and run it from the Mac terminal (Connect Mac).", usage: "connect claude" },
  { id: "web", name: "Websites & services", runtime: "Not available", auth: "—", available: false, blocker: "Driving third-party websites is not built and would need each site's own approved access.", usage: "connect web" },
];

export const AGENT_COMMANDS = ["agents", "status", "connect", "disconnect", "ask", "run", "exit"] as const;
const ASK: readonly string[] = ["gemini", "perplexity", "claude", "openai"];

export type AgentCommand =
  | { kind: "none" }
  | { kind: "text"; output: string }
  | { kind: "ask"; provider: AskProvider; prompt: string }
  | { kind: "probe"; provider: "mcp" | "api"; url: string }
  | { kind: "status" }
  | { kind: "disconnect"; provider: ProviderId }
  | { kind: "exit" };

const find = (raw: string) => { const id = raw.toLowerCase() === "claude-code" ? "claude" : raw.toLowerCase(); return AGENTS.find((a) => a.id === id) ?? AGENTS.find((a) => a.name.toLowerCase().startsWith(id)); };

export function agentsText(): string {
  return AGENTS.map((a) => `${!a.available ? "blocked" : a.needsSetup ? "setup  " : "ready  "}  ${a.id.padEnd(10)} ${a.name} — ${a.usage}`).join("\n")
    + "\nType connect <name> for setup details.";
}

export function parseAgentCommand(line: string): AgentCommand {
  const t = line.trim(); const [cmd = "", arg = "", ...rest] = t.split(/\s+/);
  switch (cmd) {
    case "agents": return { kind: "text", output: agentsText() };
    case "status": return { kind: "status" };
    case "exit": return { kind: "exit" };
    case "run": case "ask": {
      const prompt = t.slice(t.indexOf(arg) + arg.length).trim();
      if (arg === "codex" || arg === "claude-code") return { kind: "text", output: `${arg}: BLOCKED — the ${arg} program needs a real computer. Try ask ${arg === "codex" ? "openai" : "claude"} for the API model.` };
      if (!ASK.includes(arg)) return { kind: "text", output: `usage: ${cmd} <${ASK.join("|")}> <question>` };
      if (!prompt) return { kind: "text", output: `usage: ${cmd} ${arg} <question>` };
      if (prompt.length > 4000) return { kind: "text", output: `${cmd}: question too long (4000 characters max)` };
      return { kind: "ask", provider: arg as AskProvider, prompt };
    }
    case "connect": {
      const a = arg ? find(arg) : undefined;
      if (!a) return { kind: "text", output: `usage: connect <${AGENTS.map((x) => x.id).join("|")}>` };
      if (a.id === "mcp" || a.id === "api") {
        const url = rest[0] ?? "";
        if (!url) return { kind: "text", output: `${a.name}\nRuns: ${a.runtime}\nAuth: ${a.auth}\nUsage: ${a.usage}` };
        return { kind: "probe", provider: a.id, url };
      }
      if (!a.available) return { kind: "text", output: `${a.name}: BLOCKED\n${a.blocker}` };
      return { kind: "text", output: `${a.name}\nRuns: ${a.runtime}\nAuth: ${a.auth}\nTry: ${a.usage}` };
    }
    case "disconnect": {
      const a = arg ? find(arg) : undefined;
      if (!a) return { kind: "text", output: "usage: disconnect <name>" };
      return { kind: "disconnect", provider: a.id };
    }
    default: return { kind: "none" };
  }
}

/** Only public https URLs; literal private/loopback hosts are refused before any request. */
export function safeProbeUrl(raw: string): URL | null {
  let u: URL; try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".") && !h.includes(":")) return null;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) { const [a, b] = [Number(m[1]), Number(m[2])]; if (a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return null; }
  if (h.includes(":")) return null; // no literal IPv6
  return u;
}
