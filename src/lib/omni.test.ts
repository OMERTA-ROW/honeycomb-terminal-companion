import { describe, expect, it } from "vitest";
import { canSendInput, canonicalMessage, clampIdle, fillSnippet, omniState, shouldLock, type SelfTest } from "./omni";

const all = (over: Partial<Record<string, boolean>> = {}): SelfTest => ({
  configured: true,
  at: 1000,
  checks: (["reachable", "signature", "clock", "runner", "killswitch"] as const).map((id) => ({ id, pass: over[id] ?? true, detail: "" })),
});

describe("omni gating", () => {
  it("is not connected without configuration", () => expect(omniState(null, false, 1000)).toBe("not_configured"));
  it("is not connected when the runner is not ready", () => expect(omniState(all({ runner: false }), false, 1000)).toBe("not_connected"));
  it("is connected only when every check passes and fresh", () => expect(omniState(all(), false, 1000)).toBe("connected"));
  it("goes stale after 5 minutes", () => expect(omniState(all(), false, 1000 + 5 * 60_000 + 1)).toBe("not_connected"));
  it("kill switch blocks input", () => {
    const s = omniState(all({ killswitch: false }), false, 1000);
    expect(s).toBe("stopped");
    expect(canSendInput(s)).toBe(false);
  });
  it("locked blocks input", () => expect(canSendInput(omniState(all(), true, 1000))).toBe(false));
});

describe("auto-lock", () => {
  it("locks when hidden", () => expect(shouldLock({ hidden: true, lastActivity: 0, now: 0, idleMs: 300_000 })).toBe(true));
  it("locks after 5 idle minutes by default", () => expect(shouldLock({ hidden: false, lastActivity: 0, now: 300_000, idleMs: 300_000 })).toBe(true));
  it("stays unlocked before the limit", () => expect(shouldLock({ hidden: false, lastActivity: 0, now: 299_999, idleMs: 300_000 })).toBe(false));
  it("clamps idle to 1–30 minutes", () => { expect(clampIdle(1)).toBe(60_000); expect(clampIdle(1e9)).toBe(1_800_000); });
});

describe("snippets", () => {
  it("fills placeholders and never auto-runs", () => expect(fillSnippet("git checkout {branch}\n", { branch: "main\n" })).toBe("git checkout main"));
  it("keeps unknown placeholders", () => expect(fillSnippet("echo {x}", {})).toBe("echo {x}"));
});

it("canonical signing message", () => expect(canonicalMessage({ method: "get", path: "/p", timestamp: 1, nonce: "n", bodySha256: "h" })).toBe("GET\n/p\n1\nn\nh"));
