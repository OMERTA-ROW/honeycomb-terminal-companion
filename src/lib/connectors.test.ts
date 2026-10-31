import { describe, expect, it } from "vitest";
import { CONNECTORS, effectiveStatus, type Connector } from "./connectors";

describe("connectors", () => {
  it("nothing shows Connected without a verified adapter", () => {
    expect(CONNECTORS.filter((c) => effectiveStatus(c) === "connected")).toEqual([]);
    const first: Connector = CONNECTORS[0]!;
    expect(effectiveStatus({ ...first, status: "connected", adapterAvailable: false })).toBe("setup-required");
  });
  it("Perplexity never gets terminal access", () => {
    const p = CONNECTORS.find((c) => c.id === "perplexity")!;
    expect(p.never).toContain("Terminal access");
  });
});

describe("connector wording", () => {
  it("never says the Mac helper itself is missing", () => {
    for (const c of CONNECTORS) expect(c.blocker).not.toMatch(/helper, which isn't built/);
  });
  it("lists Gemini API and CLI without claiming a live connection", () => {
    const api = CONNECTORS.find((c) => c.id === "gemini-api")!;
    const cli = CONNECTORS.find((c) => c.id === "gemini-cli")!;
    expect(effectiveStatus(api)).toBe("ready");
    expect(effectiveStatus(cli)).toBe("not-built");
    expect(api.never).toContain("Terminal access");
  });
});

describe("connector statuses match what's built", () => {
  it("ready needs a verified adapter", () => expect(effectiveStatus({ ...CONNECTORS[0]!, status: "ready", adapterAvailable: false })).toBe("setup-required"));
  it("Perplexity needs authorization, CLIs are not built", () => {
    expect(effectiveStatus(CONNECTORS.find((c) => c.id === "perplexity")!)).toBe("needs-authorization");
    for (const id of ["codex-cli", "claude-code-cli", "gemini-cli"]) expect(effectiveStatus(CONNECTORS.find((c) => c.id === id)!)).toBe("not-built");
  });
  it("every working card has a terminal command", () => {
    for (const c of CONNECTORS.filter((x) => effectiveStatus(x) === "ready")) expect(c.command).toBeTruthy();
  });
});
