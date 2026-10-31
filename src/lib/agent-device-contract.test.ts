import { describe, expect, it } from "vitest";
import { AGENT_TOOLS, decideAgentCall, type AgentProfile } from "./agent-device-contract";

const p = (o: Partial<AgentProfile> = {}): AgentProfile => ({ id: "a", scopes: ["devices:read", "connect:request", "session:open", "session:close", "device:revoke"], expiresAt: 1000, revoked: false, ...o });

describe("agent-to-device rules", () => {
  it("first pairing always needs approval on the Mac", () => expect(decideAgentCall(p(), "request_pairing", 0, 1)).toEqual({ allowed: true, needs: "mac" }));
  it("opening a terminal and revoking need owner approval", () => {
    expect(decideAgentCall(p(), "open_terminal_session", 0, 1)).toEqual({ allowed: true, needs: "owner" });
    expect(decideAgentCall(p(), "revoke_device", 0, 1)).toEqual({ allowed: true, needs: "owner" });
  });
  it("revoked, expired, unscoped and unknown calls are refused", () => {
    expect(decideAgentCall(p({ revoked: true }), "list_approved_devices", 0, 1)).toMatchObject({ reason: "revoked" });
    expect(decideAgentCall(p(), "list_approved_devices", 0, 1000)).toMatchObject({ reason: "expired" });
    expect(decideAgentCall(p({ scopes: ["devices:read"] }), "request_connection", 0, 1)).toMatchObject({ reason: "missing_scope" });
    expect(decideAgentCall(p(), "run_shell_command", 0, 1)).toMatchObject({ reason: "unknown_tool" });
  });
  it("pairing requests are limited to 3 per hour", () => expect(decideAgentCall(p(), "request_pairing", 3, 1)).toMatchObject({ reason: "rate_limited" }));
  it("no tool can run commands or install software", () => expect(AGENT_TOOLS.some((t) => /shell|exec|install|command/.test(t.name))).toBe(false));
});
