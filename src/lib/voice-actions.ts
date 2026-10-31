/**
 * Portable voice-action contract (browser-safe, no I/O).
 * transcript -> VoiceIntent -> registered action. Execution is done by the host app's
 * existing handlers; voice never adds permissions. See docs/VOICE_ACTIONS.md.
 */
export type Risk = "read" | "confirm";
export type VoiceIntent =
  | { kind: "navigate"; to: "/terminal/sandbox" | "/terminal" | "/connectors"; label: string; risk: Risk }
  | { kind: "new-session"; label: string; risk: Risk }
  | { kind: "command"; command: string; label: string; risk: Risk }
  | { kind: "unknown"; label: string; risk: Risk };

/** Sandbox/agent commands that only read state; everything else needs a tap to confirm. */
const READ_ONLY = new Set(["pwd", "ls", "whoami", "date", "uname", "history", "help", "agents", "status", "clear"]);
const PROVIDERS: Record<string, string> = { gemini: "gemini", perplexity: "perplexity", codex: "codex", "claude code": "claude", claude: "claude-api", openai: "openai", mcp: "mcp", api: "api" };

export function riskOf(command: string): Risk {
  const [cmd = "", arg = ""] = command.trim().split(/\s+/);
  if (READ_ONLY.has(cmd)) return "read";
  if ((cmd === "ls" || cmd === "cat") && !/[>|;&]/.test(command)) return "read";
  if (cmd === "connect" && arg && !command.includes("http")) return "read"; // shows setup/auth steps only
  return "confirm";
}

const SPOKEN: [RegExp, string][] = [
  [/^(print )?(the )?working directory$|^where am i$|^p ?w ?d$/, "pwd"],
  [/^(list|show)( the| my)? files$|^l ?s$/, "ls"],
  [/^(show )?(command )?history$/, "history"],
  [/^who am i$/, "whoami"],
  [/^clear( the)?( screen)?$/, "clear"],
  [/^(list|show)( the)? agents$/, "agents"],
  [/^(check )?(the )?status$|^agent status$/, "status"],
];

export function normalize(t: string): string {
  return t.toLowerCase().replace(/[.,!?]+$/g, "").replace(/[“”"]/g, "").replace(/\s+/g, " ").trim().replace(/^(hey |ok |okay )?honeycomb,? /, "").replace(/^(please )/, "");
}

function spokenCommand(s: string): string {
  for (const [re, cmd] of SPOKEN) if (re.test(s)) return cmd;
  return s;
}

export function parseVoice(transcript: string): VoiceIntent {
  const s = normalize(transcript);
  if (!s) return { kind: "unknown", label: "Didn't catch that", risk: "read" };
  if (/^(open|show|go to)( the)?( full( page| screen))? terminal$|^start( a)?( the)? sandbox$|^open( the)? sandbox$/.test(s)) return { kind: "navigate", to: "/terminal/sandbox", label: "Open full-page terminal", risk: "read" };
  if (/^(new|another)( sandbox)? (session|tab)$|^start( a)? new (sandbox )?session$/.test(s)) return { kind: "new-session", label: "Start a new sandbox session", risk: "read" };
  if (/^(connect|pair|link)( to)? my (mac|computer)$/.test(s)) return { kind: "navigate", to: "/terminal", label: "Connect my Mac (pairing needs approval on the Mac)", risk: "read" };
  if (/^(open|show)( the)? connectors$/.test(s)) return { kind: "navigate", to: "/connectors", label: "Open Connectors", risk: "read" };
  let m = s.match(/^(?:connect|set up|sign in to|log in to|authorize) (gemini|perplexity|codex|claude code|claude|openai)$/);
  if (m) return { kind: "command", command: `connect ${PROVIDERS[m[1]!]}`, label: `Show how to connect ${m[1]}`, risk: "read" };
  m = s.match(/^disconnect (gemini|perplexity|codex|claude code|claude|openai|mcp|api)$/);
  if (m) return { kind: "command", command: `disconnect ${PROVIDERS[m[1]!]}`, label: `Disconnect ${m[1]}`, risk: "confirm" };
  m = s.match(/^(?:ask|run) (gemini|perplexity|claude|openai)(?: to)? (.+)$/);
  if (m) return { kind: "command", command: `ask ${m[1]} ${m[2]}`, label: `Ask ${m[1]} (uses credits)`, risk: "confirm" };
  m = s.match(/^(?:run|execute|type)(?: the command)? (.+?)(?: in (?:the )?sandbox)?$/);
  const raw = m ? spokenCommand(m[1]!) : spokenCommand(s);
  if (raw !== s || m) return { kind: "command", command: raw, label: `Run "${raw}" in the sandbox`, risk: riskOf(raw) };
  return { kind: "unknown", label: `No action matches "${transcript.trim()}"`, risk: "read" };
}
