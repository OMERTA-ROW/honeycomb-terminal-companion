import { describe, expect, it } from "vitest";
import { enrollmentCode, hostState, ONLINE_WINDOW_MS, type AccountHost } from "./host-enrollment";

const base: AccountHost = { id: "1", name: "Mac", os: "macos", fingerprint: "a".repeat(64), last_seen: null, revoked_at: null, created_at: "" };

describe("host enrollment", () => {
  it("codes are 12 chars the Mac helper accepts", () => {
    const c = enrollmentCode();
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
  });
  it("never shows online without a recent check-in", () => {
    expect(hostState(base, Date.now()).label).toBe("Status unknown");
    const now = Date.parse("2026-10-31T12:00:00Z");
    expect(hostState({ ...base, last_seen: new Date(now - ONLINE_WINDOW_MS - 1).toISOString() }, now).label).toBe("Status unknown");
    expect(hostState({ ...base, last_seen: new Date(now - 1000).toISOString() }, now).label).toBe("Helper online");
  });
  it('invalid and future heartbeat dates cannot prove online', () => {
    const now = Date.parse('2026-11-01T04:32:00Z');
    expect(hostState({ ...base, last_seen: 'invalid' }, now).label).toBe('Status unknown');
    expect(hostState({ ...base, last_seen: new Date(now + 1000).toISOString() }, now).label).toBe('Status unknown');
  });
  it("revoked wins over a recent check-in", () => {
    expect(hostState({ ...base, last_seen: new Date().toISOString(), revoked_at: new Date().toISOString() }, Date.now()).label).toBe("Revoked");
  });
});
