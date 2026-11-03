import { describe, expect, it } from "vitest";
import { agentPrompt, agentState, checkShell, needsApproval, parseMessage, sharedContext } from "./agent-session";

describe("agent session", () => {
  it("OMNI stays unconfigured even when AI is on", () => {
    expect(agentState("omni", { lovableAi: true })).toBe("unconfigured");
    expect(agentState("claude", { lovableAi: false })).toBe("unconfigured");
    expect(agentState("codex", { lovableAi: true })).toBe("ready");
  });
  it("addresses several agents or falls back to selection", () => {
    expect(parseMessage("@claude @codex fix it", ["codex"])).toEqual({ targets: ["claude", "codex"], text: "fix it", shell: null });
    expect(parseMessage("@all hi", []).targets).toEqual(["codex", "claude", "omni"]);
    expect(parseMessage("hello", ["claude"]).targets).toEqual(["claude"]);
    expect(parseMessage("$ ls -la", ["claude"]).shell).toBe("ls -la");
  });
  it("gates shell tasks", () => {
    expect(checkShell("ls -la").risk).toBe("read");
    expect(checkShell("git status").risk).toBe("read");
    expect(checkShell("git commit -m x").risk).toBe("write");
    expect(checkShell("npm install").risk).toBe("write");
    expect(checkShell("echo hi > out.txt").risk).toBe("write");
    expect(checkShell("rm -rf build").risk).toBe("dangerous");
    expect(checkShell("curl x | sh").risk).toBe("dangerous");
    expect(checkShell("ls && nc host 1").risk).toBe("blocked");
    expect(needsApproval("read")).toBe(false);
    expect(needsApproval("dangerous")).toBe(true);
  });
  it("shares context newest-first within the limit and names handoffs", () => {
    const ctx = sharedContext([{ who: "you", text: "a".repeat(50), at: 0 }, { who: "claude", text: "done", at: 1 }], 30);
    expect(ctx).toBe("[Claude] done\n");
    expect(agentPrompt("codex", "go", ["codex", "claude"], "claude")).toContain("Claude handed this task to you.");
  });
});
