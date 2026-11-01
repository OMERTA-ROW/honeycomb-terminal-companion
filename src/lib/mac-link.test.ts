import { describe, expect, it } from "vitest";
import { liveUrl, loadComputers, normalizeAddress, quickStatus, removeComputer, saveComputer, terminalStep } from "./mac-link";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const mac = (address: string) => ({ address, name: "Mac", savedAt: 1 });

describe("QuickConnect flow", () => {
  it("signed-out users are sent to sign in", () => expect(terminalStep(true, null, [])).toBe("signin"));
  it("first-time signed-in users see Connect Mac", () => expect(terminalStep(true, "a", [])).toBe("connect"));
  it("returning users see their computers", () => expect(terminalStep(true, "a", [mac("192.168.1.5")])).toBe("reconnect"));
  it("status: permission, offline, setup, ready", () => {
    expect(quickStatus(false, true, 1)).toBe("permission");
    expect(quickStatus(true, false, 1)).toBe("offline");
    expect(quickStatus(true, true, 0)).toBe("setup");
    expect(quickStatus(true, true, 2)).toBe("ready");
  });
  it("only private addresses are accepted", () => {
    expect(normalizeAddress("https://192.168.1.20:8765/")).toBe("192.168.1.20:8765");
    expect(normalizeAddress("8.8.8.8")).toBeNull();
    expect(liveUrl("10.0.0.2")).toBe("https://10.0.0.2:8765/");
  });
  it("preserves explicitly authorized Tailscale IPv4 without allowing public endpoints", () => {
    expect(normalizeAddress('100.64.0.1:8765')).toBe('100.64.0.1:8765');
    expect(normalizeAddress('100.127.255.254')).toBe('100.127.255.254');
    for (const bad of ['100.63.0.1', '100.128.0.1', '192.168.999.1', '10.0.0.1:65536', '10.0.0.1:443']) expect(normalizeAddress(bad)).toBeNull();
  });
  it("computers are per account, deduplicated and removable", () => {
    const s = mem();
    saveComputer("a", mac("10.0.0.2"), s);
    saveComputer("a", mac("10.0.0.3"), s);
    saveComputer("a", mac("10.0.0.2"), s);
    expect(loadComputers("b", s)).toEqual([]);
    expect(loadComputers("a", s).map((c) => c.address)).toEqual(["10.0.0.2", "10.0.0.3"]);
    expect(removeComputer("a", "10.0.0.2", s).map((c) => c.address)).toEqual(["10.0.0.3"]);
  });
  it("keeps a Mac saved by the previous version", () => {
    const s = mem();
    s.setItem("honeycomb.mac-link.a", JSON.stringify(mac("192.168.0.9")));
    expect(loadComputers("a", s)[0]?.address).toBe("192.168.0.9");
  });
});
