import { describe, expect, it } from "vitest";
import { commonPrefix, emptyLine, feed, redraw } from "./line-editor";
import { complete, exec, newSession } from "./sandbox-shell";

describe("terminal line discipline", () => {
  it("typing then Enter submits the line", () => expect(feed(emptyLine(), "pwd\r").events).toEqual([{ type: "submit", line: "pwd" }]));
  it("backspace and left-arrow insert edit inline", () => {
    const { state } = feed(emptyLine(), "lx\x7fs\x1b[D\x1b[Dz");
    expect(state.buf).toBe("zls"); expect(state.pos).toBe(1);
  });
  it("up/down walk history and restore the draft", () => {
    let s = feed(emptyLine(["pwd", "ls"]), "ec").state;
    s = feed(s, "\x1b[A").state; expect(s.buf).toBe("ls");
    s = feed(s, "\x1b[A").state; expect(s.buf).toBe("pwd");
    s = feed(s, "\x1b[B\x1b[B").state; expect(s.buf).toBe("ec");
  });
  it("Ctrl+C interrupts and clears the line", () => {
    const r = feed(feed(emptyLine(), "sleep").state, "\x03");
    expect(r.events).toEqual([{ type: "interrupt" }]); expect(r.state.buf).toBe("");
  });
  it("Ctrl+D on an empty line is EOF", () => expect(feed(emptyLine(), "\x04").events).toEqual([{ type: "eof" }]));
  it("pasted multi-line text submits each line", () => expect(feed(emptyLine(), "pwd\nls\n").events.map((e) => e.type)).toEqual(["submit", "submit"]));
  it("arrow keys are not reported as Escape", () => expect(feed(emptyLine(), "\x1b[A").events).toEqual([]));
  it("redraw places the caret", () => expect(redraw("$ ", { ...emptyLine(), buf: "abc", pos: 1 })).toBe("\r\x1b[K$ abc\x1b[2D"));
});
describe("tab completion against the real sandbox tree", () => {
  it("completes commands and directory names", () => {
    let s = newSession(); s = exec(s, "mkdir projects").state;
    expect(complete(s, "pw")).toEqual(["pwd"]);
    expect(complete(s, "cd pro")).toEqual(["projects/"]);
    expect(commonPrefix(["history", "help"])).toBe("h");
  });
});

import { sanitizePaste as sp } from "./line-editor";
import { feed as fd, emptyLine as el } from "./line-editor";
describe("paste", () => {
  it("normalizes iOS smart quotes and drops control bytes", () => {
    expect(sp("echo \u201Chi there\u201D\x03\t\x1b")).toBe('echo "hi there" ');
  });
  it("inserts at the cursor without submitting", () => {
    const s = { ...el(), buf: "cat ", pos: 4 };
    const r = fd(s, sp("README.txt"));
    expect(r.state.buf).toBe("cat README.txt"); expect(r.events).toEqual([]);
  });
  it("CRLF becomes a single Enter per line", () => {
    const r = fd(el(), sp("pwd\r\nls\r\n"));
    expect(r.events).toEqual([{ type: "submit", line: "pwd" }, { type: "submit", line: "ls" }]);
  });
});
