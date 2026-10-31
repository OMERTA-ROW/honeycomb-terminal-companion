import { describe, expect, it } from "vitest";
import { exec, newSession, HOME, tokenize, type ShellState } from "./sandbox-shell";

function run(s: ShellState, ...lines: string[]) { let out = ""; for (const l of lines) { const r = exec(s, l); s = r.state; out = r.output; } return { s, out }; }

describe("browser sandbox shell", () => {
  it("pwd reflects real state changes, not a fixed string", () => {
    const s = newSession();
    expect(exec(s, "pwd").output).toBe(HOME);
    const r = run(s, "mkdir projects", "cd projects", "pwd");
    expect(r.out).toBe(`${HOME}/projects`);
    expect(run(r.s, "cd ..", "pwd").out).toBe(HOME);
  });
  it("writes, appends and reads files", () => {
    const r = run(newSession(), "echo hello > a.txt", "echo world >> a.txt", "cat a.txt");
    expect(r.out).toBe("hello\nworld");
    expect(run(r.s, "ls").out).toContain("a.txt");
  });
  it("unknown commands are refused and never pretend to run", () => {
    expect(exec(newSession(), "sudo rm -rf /").output).toMatch(/command not found/);
    expect(exec(newSession(), "curl http://x").output).toMatch(/command not found/);
  });
  it("refuses to remove home or root, and needs -r for folders", () => {
    const s = run(newSession(), "mkdir d").s;
    expect(exec(s, "rm d").output).toMatch(/Is a directory/);
    expect(exec(s, "rm -r /").output).toMatch(/refusing/);
    expect(exec(s, `rm -r ${HOME}`).output).toMatch(/refusing/);
    expect(run(s, "rm -r d", "ls").out).not.toContain("d/");
  });
  it("errors on missing paths and bad names", () => {
    expect(exec(newSession(), "cd nowhere").output).toMatch(/no such file/);
    expect(exec(newSession(), "cat nope").output).toMatch(/No such file/);
    expect(exec(newSession(), "touch 'a/b/c'").output).toMatch(/No such file/);
  });
  it("records history and leaves the previous state unchanged", () => {
    const s = newSession();
    const r = run(s, "pwd", "whoami", "history");
    expect(r.out).toMatch(/1 {2}pwd\n +2 {2}whoami\n +3 {2}history/);
    expect(s.history).toEqual([]);
  });
  it("quotes keep spaces", () => { expect(tokenize(`echo "a b" 'c'`)).toEqual(["echo", "a b", "c"]); });
});

import { exec as ex2, newSession as ns2 } from "./sandbox-shell";
describe("case sensitivity", () => {
  it("ls listing name works with cat; wrong case hints", () => {
    const s = ns2();
    expect(ex2(s, "ls").output).toBe("README.txt");
    expect(ex2(s, "cat README.txt").output).toContain("Browser sandbox");
    expect(ex2(s, "cat readme.txt").output).toBe("cat: readme.txt: No such file or directory (names are case-sensitive — did you mean README.txt?)");
  });
  it("new lowercase file shares the same cwd", () => {
    let s = ns2(); s = ex2(s, "echo hi > readme.txt").state;
    expect(ex2(s, "cat readme.txt").output).toBe("hi");
  });
});
