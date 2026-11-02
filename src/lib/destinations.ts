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
  | "/downloads";

export interface Destination {
  to: DestinationPath;
  label: string;
  hint: string;
  keywords: string[];
}

export const DESTINATIONS: Destination[] = [
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
    label: "Agents & web",
    hint: "Agent and website tools",
    keywords: ["agents", "codex", "claude", "gemini", "api", "mcp", "web"],
  },
  {
    to: "/transfer",
    label: "File transfer",
    hint: "Selected files between approved devices",
    keywords: ["file", "transfer", "upload"],
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
