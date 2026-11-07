export type DestinationPath =
  | "/"
  | "/dashboard"
  | "/terminal/sandbox"
  | "/terminal"
  | "/connectors"
  | "/pair"
  | "/jobs"
  | "/transfer"
  | "/device-care"
  | "/instructions"
  | "/install"
  | "/workspace"
  | "/account"
  | "/downloads"
  | "/workspace-shell"
  | "/agent-session"
  | "/autonomy"
  | "/home";

export interface Destination {
  to: DestinationPath;
  label: string;
  hint: string;
  keywords: string[];
}

export const DESTINATIONS: Destination[] = [
  {
    to: "/terminal/sandbox",
    label: "Terminal",
    hint: "Honeycomb full-screen shell",
    keywords: ["terminal", "shell", "honeycomb", "command"],
  },
  {
    to: "/home",
    label: "Home",
    hint: "Honeycomb, powered by OMNI",
    keywords: ["home", "omni", "self-test", "snippets", "stop", "lock"],
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    hint: "Your command center",
    keywords: ["home", "dashboard", "web", "agent", "status"],
  },
  {
    to: "/terminal",
    label: "Mac terminal",
    hint: "Your real Mac shell",
    keywords: ["terminal", "mac", "shell", "connect", "pair", "code", "computer"],
  },
  {
    to: "/connectors",
    label: "Connectors",
    hint: "Agents, MCP and website tools",
    keywords: ["connectors", "agents", "codex", "claude", "gemini", "api", "mcp", "web"],
  },
  {
    to: "/transfer",
    label: "File transfer",
    hint: "Selected files between approved devices",
    keywords: ["file", "transfer", "upload"],
  },
  {
    to: "/workspace-shell",
    label: "Dev workspace",
    hint: "GitHub, Codex and Claude without pairing",
    keywords: ["github", "git", "repo", "codex", "claude", "dev", "workspace", "audit"],
  },
  {
    to: "/agent-session",
    label: "Agent session",
    hint: "Codex, Claude and OMNI together",
    keywords: ["agents", "multi", "session", "voice", "codex", "claude", "omni", "handoff"],
  },
  {
    to: "/autonomy",
    label: "Autonomous modes",
    hint: "Owner switches and Emergency Stop (off)",
    keywords: ["autonomous", "autonomy", "omni", "docking", "emergency", "stop", "auto"],
  },
  {
    to: "/downloads",
    label: "Downloads",
    hint: "Approved repos and CLI packages to this device",
    keywords: ["download", "github", "release", "cli", "install", "package", "checksum"],
  },
  {
    to: "/account",
    label: "Account",
    hint: "Profile and access",
    keywords: ["account", "owner", "sign in", "security"],
  },
];

/** Label matches rank before keyword matches; empty query returns nothing. */
export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byLabel = DESTINATIONS.filter((d) => d.label.toLowerCase().includes(q));
  const byKeyword = DESTINATIONS.filter(
    (d) => !byLabel.includes(d) && d.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
  return [...byLabel, ...byKeyword];
}
