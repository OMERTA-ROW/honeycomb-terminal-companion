import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, emergencyStop, modeState, parseSettings, type AutonomyEvidence, type AutonomySettings } from "./autonomy";

const now = 1_000_000_000;
const ready: AutonomySettings = { requested: { local: true, omni: true }, emergencyStop: false, budgetJobs: 5, scopes: { local: ["files-read"], omni: ["read-status"] } };
const ev: AutonomyEvidence = { isOwner: true, sessionActive: true, deviceRevoked: false, connectionTestedAt: { local: now - 1000, omni: now - 1000 }, omniConfigured: true, safetyVerified: { local: true, omni: true }, now };

describe("autonomous modes", () => {
  it("default is OFF for both modes", () => {
    expect(modeState("local", DEFAULT_SETTINGS, ev)).toBe("off");
    expect(modeState("omni", DEFAULT_SETTINGS, ev)).toBe("off");
  });
  it("active only when every gate passes", () => expect(modeState("local", ready, ev)).toBe("active"));
  it("switches are independent", () => {
    const s = { ...ready, requested: { local: true, omni: false } };
    expect(modeState("local", s, ev)).toBe("active");
    expect(modeState("omni", s, ev)).toBe("off");
  });
  it("OMNI blocks without a configured connection", () => expect(modeState("omni", ready, { ...ev, omniConfigured: false })).toBe("blocked"));
  it("stale connection test blocks", () => expect(modeState("local", ready, { ...ev, connectionTestedAt: { local: now - 11 * 60 * 1000 } })).toBe("blocked"));
  it("unverified safety blocks", () => expect(modeState("local", ready, { ...ev, safetyVerified: {} })).toBe("blocked"));
  it("non-owner and revoked device block", () => {
    expect(modeState("local", ready, { ...ev, isOwner: false })).toBe("blocked");
    expect(modeState("local", ready, { ...ev, deviceRevoked: true })).toBe("blocked");
  });
  it("no budget blocks", () => expect(modeState("local", { ...ready, budgetJobs: 0 }, ev)).toBe("blocked"));
  it("Emergency Stop turns both off and clears requests", () => {
    const s = emergencyStop(ready);
    expect(modeState("local", s, ev)).toBe("off");
    expect(modeState("omni", s, ev)).toBe("off");
    expect(s.requested).toEqual({ local: false, omni: false });
  });
  it("malformed storage falls back to OFF", () => {
    expect(parseSettings("{bad")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ requested: { local: "yes" }, scopes: { local: ["root-shell"] } })).requested.local).toBe(false);
    expect(parseSettings(JSON.stringify({ scopes: { local: ["root-shell"] } })).scopes.local).toEqual([]);
  });
});
