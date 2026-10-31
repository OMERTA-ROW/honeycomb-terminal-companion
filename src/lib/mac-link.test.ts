import { describe, expect, it } from "vitest";
import { forgetMacLink, liveUrl, loadMacLink, normalizeAddress, saveMacLink, terminalStep } from "./mac-link";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe("terminal flow", () => {
  it("signed-out users are sent to sign in", () => expect(terminalStep(true, null, null)).toBe("signin"));
  it("first-time signed-in users see Connect Mac", () => expect(terminalStep(true, "a", null)).toBe("connect"));
  it("returning users with a saved Mac reconnect", () => expect(terminalStep(true, "a", { address: "192.168.1.5", name: "Mac", savedAt: 1 })).toBe("reconnect"));
  it("only private addresses are accepted", () => {
    expect(normalizeAddress("https://192.168.1.20:8765/")).toBe("192.168.1.20:8765");
    expect(normalizeAddress("8.8.8.8")).toBeNull();
    expect(liveUrl("10.0.0.2")).toBe("https://10.0.0.2:8765/");
  });
  it("saved Mac is per account and can be forgotten", () => {
    const s = mem();
    saveMacLink("a", { address: "10.0.0.2", name: "Mac", savedAt: 1 }, s);
    expect(loadMacLink("b", s)).toBeNull();
    expect(loadMacLink("a", s)?.address).toBe("10.0.0.2");
    forgetMacLink("a", s);
    expect(loadMacLink("a", s)).toBeNull();
  });
});
