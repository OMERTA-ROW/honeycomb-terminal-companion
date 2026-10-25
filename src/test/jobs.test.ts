import { describe, expect, it } from "vitest";
import { EXECUTION_TARGETS, INTEGRATIONS, JOB_STATE_INFO, JOB_TEMPLATES, previewFor, simulatedLog, transition, jobCompletionNotice, type Job } from "@/lib/jobs";

describe("job workflow", () => {
  const fixture: Job = {id:"test-job",templateId:"test-failures",title:"Existing tests",instruction:"test",target:"host",state:"running",createdAt:"2026-10-25",log:[]};
  it("only finished pass/fail jobs produce Demo completion notices",()=>{
    expect(jobCompletionNotice({...fixture,state:"completed"})).toBe("Demo · PASS — Existing tests");
    expect(jobCompletionNotice({...fixture,state:"failed"})).toBe("Demo · FAIL — Existing tests");
    for(const state of ["queued","running","waiting","cancelled"] as const) expect(jobCompletionNotice({...fixture,state})).toBeNull();
  });
  it("follows the queued → running → completed path", () => {
    expect(transition("queued", "start")).toBe("running");
    expect(transition("running", "complete")).toBe("completed");
  });
  it("supports waiting and cancellation from active states", () => {
    expect(transition("running", "wait")).toBe("waiting");
    expect(transition("waiting", "resume")).toBe("running");
    expect(transition("queued", "cancel")).toBe("cancelled");
    expect(transition("running", "cancel")).toBe("cancelled");
  });
  it("rejects transitions out of terminal states", () => {
    expect(transition("completed", "start")).toBeNull();
    expect(transition("cancelled", "resume")).toBeNull();
    expect(transition("failed", "cancel")).toBeNull();
    expect(JOB_STATE_INFO.completed.terminal).toBe(true);
  });
  it("previews template commands and scope before authorization", () => {
    const preview = previewFor("test-failures", "run the tests");
    expect(preview).not.toBeNull();
    expect(preview?.commands.length ?? 0).toBeGreaterThan(0);
    expect(preview?.scope ?? "").toContain("Read-only");
    expect(previewFor("nope", "x")).toBeNull();
  });
  it("flags destructive instructions for explicit run-time confirmation", () => {
    const preview = previewFor("worktree-changes", "rm -rf the old build");
    expect(preview?.approvals[0] ?? "").toMatch(/destructive/i);
  });
  it("offers the first template as run-tests and the next as isolated worktree", () => {
    expect(JOB_TEMPLATES[0]?.id).toBe("test-failures");
    expect(JOB_TEMPLATES[1]?.id).toBe("worktree-changes");
    expect(JOB_TEMPLATES[1]?.scope ?? "").toMatch(/isolated worktree/i);
  });
  it("keeps device and sandbox targets unavailable until implemented", () => {
    expect(EXECUTION_TARGETS.find((t) => t.id === "device")?.available).toBe(false);
    expect(EXECUTION_TARGETS.find((t) => t.id === "sandbox")?.available).toBe(false);
    expect(EXECUTION_TARGETS.find((t) => t.id === "host")?.available).toBe(true);
  });
  it("marks GitHub and Evolution as not connected", () => {
    expect(INTEGRATIONS.every((i) => i.connected === false)).toBe(true);
  });
  it("simulated logs never claim real execution", () => {
    for (const t of JOB_TEMPLATES) expect(simulatedLog(t.id).every((l) => l.startsWith("[simulated]"))).toBe(true);
  });
});
