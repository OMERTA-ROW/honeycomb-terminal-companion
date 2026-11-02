import { describe, expect, it } from "vitest";
import { isWrite, parseGhCommand, provider, providerState, validateGithubOp } from "./providers";

describe("dev workspace providers", () => {
  it("hosted runner is never ready", () => {
    expect(providerState("runner", { lovableAi: true, github: "ok" })).toBe("needs-runner");
    expect(provider("runner").capabilities).toEqual(["exec"]);
  });
  it("GitHub is ready only with a verified connection", () => {
    expect(providerState("github", { lovableAi: true, github: null })).toBe("unknown");
    expect(providerState("github", { lovableAi: true, github: "missing" })).toBe("needs-credentials");
    expect(providerState("github", { lovableAi: true, github: "failed" })).toBe("failed");
    expect(providerState("github", { lovableAi: false, github: "ok" })).toBe("ready");
  });
  it("Codex and Claude tabs are labelled as models, not CLIs, and cannot exec", () => {
    expect(provider("codex").backing).toMatch(/not the Codex CLI/);
    expect(provider("claude").backing).toMatch(/not Claude Code/);
    expect(provider("codex").capabilities).not.toContain("exec");
  });
  it("only issue, branch and commit are writes", () => {
    expect(isWrite({ op: "repos" })).toBe(false);
    expect(isWrite({ op: "read", repo: "a/b", path: "x" })).toBe(false);
    expect(isWrite({ op: "commit-file", repo: "a/b", branch: "m", path: "x", content: "", message: "m" })).toBe(true);
  });
  it("rejects bad repos, traversal paths and refs", () => {
    expect(validateGithubOp({ op: "repo", repo: "nope" })).not.toBeNull();
    expect(validateGithubOp({ op: "read", repo: "a/b", path: "../etc/passwd" })).not.toBeNull();
    expect(validateGithubOp({ op: "read", repo: "a/b", path: "src/../x" })).not.toBeNull();
    expect(validateGithubOp({ op: "create-branch", repo: "a/b", branch: "x..y", from: "main" })).not.toBeNull();
    expect(validateGithubOp({ op: "read", repo: "a/b", path: "src/index.ts" })).toBeNull();
  });
  it("parses gh commands and refuses unknown ones", () => {
    expect(parseGhCommand("gh commits a/b dev")).toEqual({ op: "commits", repo: "a/b", ref: "dev" });
    expect(parseGhCommand("gh cat a/b README.md")).toEqual({ op: "read", repo: "a/b", path: "README.md" });
    expect(parseGhCommand("git push")).toBeNull();
    expect(parseGhCommand("gh rm a/b")).toBeNull();
  });
});
