import { describe, expect, it } from "vitest";
import {
  BEE_COUNT,
  DEFAULT_TRANSFER_POLICY,
  PAIRING_CODE_TTL_SECONDS,
  SAMPLE_STORAGE,
  TEST_EXPECTED_OUTPUT,
  beesForProgress,
  formatBytes,
  pairingCodeExpired,
  pairingPayload,
  recoverableBytes,
  testConnectionResult,
  transferAllowed,
} from "@/lib/device-care";

describe("pairing", () => {
  it("codes expire after the TTL", () => {
    const created = 1_000_000;
    expect(pairingCodeExpired(created, created + PAIRING_CODE_TTL_SECONDS * 1000 - 1)).toBe(false);
    expect(pairingCodeExpired(created, created + PAIRING_CODE_TTL_SECONDS * 1000 + 1)).toBe(true);
  });
  it("payload is labelled simulated and carries the code", () => {
    const p = pairingPayload("482617");
    expect(p).toContain("482617");
    expect(p).toContain("simulated");
  });
});

describe("test connection", () => {
  it("returns 'Honeycomb connected' only for an online host", () => {
    expect(testConnectionResult("online").output).toContain(TEST_EXPECTED_OUTPUT);
    expect(testConnectionResult("online").state).toBe("connected");
  });
  it("denies permission and revoked hosts", () => {
    expect(testConnectionResult("permission").state).toBe("denied");
    expect(testConnectionResult("revoked").state).toBe("denied");
  });
  it("reports asleep and offline hosts as unreachable", () => {
    expect(testConnectionResult("asleep").state).toBe("unreachable");
    expect(testConnectionResult("offline").state).toBe("unreachable");
  });
});

describe("storage", () => {
  it("system category is never recoverable", () => {
    const system = SAMPLE_STORAGE.find((c) => c.id === "system");
    expect(system?.recoverable).toBe(false);
  });
  it("recoverable total excludes non-recoverable categories", () => {
    const total = recoverableBytes(SAMPLE_STORAGE);
    const all = SAMPLE_STORAGE.reduce((s, c) => s + c.bytes, 0);
    expect(total).toBeLessThan(all);
    expect(total).toBeGreaterThan(0);
  });
  it("formats bytes readably", () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
  });
});

describe("cellular policy", () => {
  it("Wi-Fi-only blocks cellular transfers", () => {
    const r = transferAllowed(DEFAULT_TRANSFER_POLICY, false, 0);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("Wi-Fi");
  });
  it("allows transfers on Wi-Fi", () => {
    expect(transferAllowed(DEFAULT_TRANSFER_POLICY, true, 0).allowed).toBe(true);
  });
  it("enforces the monthly cellular limit", () => {
    const policy = { wifiOnly: false, monthlyCellularLimitMb: 500 };
    expect(transferAllowed(policy, false, 499).allowed).toBe(true);
    expect(transferAllowed(policy, false, 500).allowed).toBe(false);
  });
});

describe("lock screen bees", () => {
  it("fills the honeycomb proportionally to progress", () => {
    expect(beesForProgress(0, false)).toBe(0);
    expect(beesForProgress(0.5, false)).toBe(Math.round(BEE_COUNT / 2));
    expect(beesForProgress(1, false)).toBe(BEE_COUNT);
  });
  it("clamps out-of-range progress", () => {
    expect(beesForProgress(-1, false)).toBe(0);
    expect(beesForProgress(2, false)).toBe(BEE_COUNT);
  });
  it("reduced motion shows all-or-nothing with no intermediate animation", () => {
    expect(beesForProgress(0.5, true)).toBe(0);
    expect(beesForProgress(1, true)).toBe(BEE_COUNT);
  });
});
