import { describe, expect, it } from "vitest";
import { CONNECTORS, effectiveStatus } from "./connectors";

describe("connectors", () => {
  it("nothing shows Connected without a verified adapter", () => {
    expect(CONNECTORS.filter((c) => effectiveStatus(c) === "connected")).toEqual([]);
    expect(effectiveStatus({ ...CONNECTORS[0], status: "connected", adapterAvailable: false })).toBe("setup-required");
  });
  it("Perplexity never gets terminal access", () => {
    const p = CONNECTORS.find((c) => c.id === "perplexity")!;
    expect(p.never).toContain("Terminal access");
  });
});
