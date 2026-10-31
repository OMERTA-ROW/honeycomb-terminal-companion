export type DestinationPath =
  | "/" | "/dashboard" | "/terminal/sandbox" | "/terminal" | "/connectors" | "/pair" | "/jobs" | "/transfer" | "/device-care" | "/instructions" | "/install" | "/workspace" | "/account";

export interface Destination { to: DestinationPath; label: string; hint: string; keywords: string[] }

export const DESTINATIONS: Destination[] = [
  { to: "/terminal/sandbox", label: "Terminal", hint: "Full-screen terminal — browser sandbox, opens immediately", keywords: ["terminal", "shell", "command", "console", "sandbox", "ssh"] },
  { to: "/dashboard", label: "Dashboard", hint: "Owner dashboard — truthful live/pending/simulated status", keywords: ["dashboard", "owner", "status", "overview"] },
  { to: "/terminal", label: "Connect Mac", hint: "Optional: your Mac's real shell (same Wi-Fi)", keywords: ["connect", "mac", "live", "quickconnect", "pair mac"] },
  { to: "/connectors", label: "Connectors", hint: "AI agents, MCP, API and service integrations", keywords: ["connectors", "integrations", "agent", "ai", "codex", "claude", "perplexity", "gemini", "google", "mcp", "api"] },
  { to: "/", label: "Sample computers", hint: "Simulated sample hive (not your real Macs)", keywords: ["computers", "hosts", "devices", "home"] },
  { to: "/pair", label: "Pair", hint: "Demo pairing walkthrough (simulated); real Mac pairing is in Terminal", keywords: ["pair", "pairing", "qr", "code", "connect"] },
  { to: "/jobs", label: "Jobs", hint: "Job progress and logs", keywords: ["jobs", "tasks", "logs"] },
  { to: "/transfer", label: "File transfer", hint: "Send selected files between your devices", keywords: ["file", "transfer", "upload", "send"] },
  { to: "/device-care", label: "Device care", hint: "Storage, security and lock", keywords: ["device", "care", "storage", "security"] },
  { to: "/instructions", label: "Instructions", hint: "How to set up and use Honeycomb", keywords: ["instructions", "help", "guide"] },
  { to: "/install", label: "Install & downloads", hint: "Mac companion download and Home Screen setup", keywords: ["install", "download", "mac", "ipad", "iphone", "home screen", "pwa"] },
  { to: "/workspace", label: "Workspace", hint: "Selected file copies", keywords: ["workspace", "folder", "files"] },
  { to: "/account", label: "Account", hint: "Sign in and membership", keywords: ["account", "sign in", "login", "profile"] },
];

/** Label matches rank before keyword matches; empty query returns nothing. */
export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byLabel = DESTINATIONS.filter((d) => d.label.toLowerCase().includes(q));
  const byKeyword = DESTINATIONS.filter((d) => !byLabel.includes(d) && d.keywords.some((k) => k.includes(q) || q.includes(k)));
  return [...byLabel, ...byKeyword];
}
