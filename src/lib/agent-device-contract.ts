// Agent-to-Device QuickConnect — provider-neutral tool CONTRACT only.
// Not wired to any MCP server, API route or companion. Nothing here grants
// access; it defines what a future agent could ask for and what must be
// approved by a person. Agents get app access, never direct macOS access.

export type AgentScope = "devices:read" | "connect:request" | "session:open" | "session:close" | "device:revoke";
export type Approval = "none" | "owner" | "mac";

export type AgentTool = {
  name: string;
  scope: AgentScope;
  approval: Approval; // who must approve each call
  perHour: number; // proposed rate limit per agent profile
  summary: string;
};

export const AGENT_TOOLS: readonly AgentTool[] = [
  { name: "list_approved_devices", scope: "devices:read", approval: "none", perHour: 60, summary: "List computers this account has approved (names and status only)." },
  { name: "get_connection_status", scope: "devices:read", approval: "none", perHour: 120, summary: "Report last known status; never claims Connected without companion evidence." },
  { name: "request_pairing", scope: "connect:request", approval: "mac", perHour: 3, summary: "Ask a locally installed companion to show a one-time code; the Mac owner must approve on the Mac." },
  { name: "request_connection", scope: "connect:request", approval: "owner", perHour: 10, summary: "Ask to reconnect an already approved computer; the signed-in owner confirms." },
  { name: "open_terminal_session", scope: "session:open", approval: "owner", perHour: 10, summary: "Return a link the owner opens on their own device; the agent never receives shell input or output." },
  { name: "disconnect_session", scope: "session:close", approval: "none", perHour: 30, summary: "Close a session. Always allowed because it only removes access." },
  { name: "revoke_device", scope: "device:revoke", approval: "owner", perHour: 5, summary: "Revoke a computer; owner confirms." },
] as const;

/** Things no agent tool may ever do, regardless of scopes. */
export const NEVER_ALLOWED = [
  "install or update the Mac companion remotely",
  "approve its own pairing or enrollment",
  "elevate privileges (sudo, admin)",
  "send keystrokes or read terminal output",
  "access files outside the Honeycomb Inbox",
] as const;

export type AgentProfile = { id: string; scopes: AgentScope[]; expiresAt: number; revoked: boolean };
export type Decision = { allowed: false; reason: "unknown_tool" | "revoked" | "expired" | "missing_scope" | "rate_limited" } | { allowed: true; needs: Approval };

export function decideAgentCall(profile: AgentProfile, toolName: string, callsThisHour: number, now: number): Decision {
  const tool = AGENT_TOOLS.find((t) => t.name === toolName);
  if (!tool) return { allowed: false, reason: "unknown_tool" };
  if (profile.revoked) return { allowed: false, reason: "revoked" };
  if (now >= profile.expiresAt) return { allowed: false, reason: "expired" };
  if (!profile.scopes.includes(tool.scope)) return { allowed: false, reason: "missing_scope" };
  if (callsThisHour >= tool.perHour) return { allowed: false, reason: "rate_limited" };
  return { allowed: true, needs: tool.approval };
}
