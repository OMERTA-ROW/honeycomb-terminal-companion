// PROTOTYPE ONLY: sample hosts and a simulated shell. Nothing here connects to a real computer.
export type HostStatus = "online" | "asleep" | "offline" | "permission" | "revoked";

export interface Host {
  id: string;
  name: string;
  os: "macOS" | "Windows" | "Linux";
  status: HostStatus;
  lastSeen: string;
}

export const SAMPLE_HOSTS: Host[] = [
  { id: "studio-mac", name: "Studio Mac (sample)", os: "macOS", status: "online", lastSeen: "now" },
  { id: "build-box", name: "Build Box (sample)", os: "Linux", status: "asleep", lastSeen: "2 h ago" },
  { id: "office-pc", name: "Office PC (sample)", os: "Windows", status: "offline", lastSeen: "3 days ago" },
  { id: "lab-mini", name: "Lab Mini (sample)", os: "macOS", status: "permission", lastSeen: "10 min ago" },
];

export const STATUS_INFO: Record<HostStatus, { label: string; next: string; canOpen: boolean }> = {
  online: { label: "Available", next: "Tap to open its shell (simulated).", canOpen: true },
  asleep: { label: "Asleep", next: "Wake this computer, or enable 'prevent sleep' in the companion app.", canOpen: false },
  offline: { label: "Offline", next: "Check the computer is on, connected to a network, and the companion app is running.", canOpen: false },
  permission: { label: "Needs permission", next: "On the computer, open the companion app and allow terminal access.", canOpen: false },
  revoked: { label: "Revoked", next: "This device was removed. Pair again from the computer to restore access.", canOpen: false },
};

export interface Shortcut {
  id: string;
  label: string;
  command: string;
  destructive: boolean;
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "ls", label: "List files", command: "ls -la", destructive: false },
  { id: "git", label: "Git status", command: "git status", destructive: false },
  { id: "top", label: "Processes", command: "top -l 1 | head", destructive: false },
  { id: "clean", label: "Clean build", command: "rm -rf ./build", destructive: true },
];

const DESTRUCTIVE = [/\brm\s+-[a-z]*r/i, /\bsudo\b/, /\bshutdown\b/, /\breboot\b/, /\bmkfs\b/, /\bdd\s+if=/, /git\s+push\s+.*--force/, /git\s+reset\s+--hard/];

export function isDestructive(cmd: string): boolean {
  return DESTRUCTIVE.some((r) => r.test(cmd));
}

export function simulate(cmd: string): string {
  const c = cmd.trim();
  if (!c) return "";
  if (c === "help") return "[simulated] Try: ls, pwd, whoami, git status, clear. No command runs on a real computer.";
  if (c === "pwd") return "/Users/sample";
  if (c === "whoami") return "sample-user";
  if (c.startsWith("ls")) return "Documents  Projects  notes.txt  build/";
  if (c === "git status") return "On branch main\nnothing to commit, working tree clean";
  return `[simulated] '${c}' was not executed — no companion app is connected.`;
}

export const SHORTCUTS_KEY = "hct-shortcuts";
export const HOSTS_KEY = "hct-hosts";
