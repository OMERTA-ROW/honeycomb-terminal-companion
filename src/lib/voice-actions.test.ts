import { describe, expect, it } from "vitest";
import { parseVoice, riskOf } from "./voice-actions";

describe("voice intents", () => {
  it("open terminal navigates to the full-page shell", () => expect(parseVoice("Open terminal.")).toMatchObject({ kind: "navigate", to: "/terminal/sandbox", risk: "read" }));
  it("run pwd in sandbox runs pwd without confirmation", () => expect(parseVoice("Run pwd in sandbox")).toMatchObject({ kind: "command", command: "pwd", risk: "read" }));
  it("spoken 'print working directory' maps to pwd", () => expect(parseVoice("Hey Honeycomb, print working directory")).toMatchObject({ command: "pwd" }));
  it("connect Gemini shows the connect flow", () => expect(parseVoice("Connect Gemini")).toMatchObject({ command: "connect gemini", risk: "read" }));
  it("Claude Code maps to the CLI, not the API model", () => expect(parseVoice("connect claude code")).toMatchObject({ command: "connect claude" }));
  it("connect my Mac opens pairing, never pairs by itself", () => expect(parseVoice("connect my mac")).toMatchObject({ kind: "navigate", to: "/terminal" }));
  it("side effects need confirmation", () => {
    expect(parseVoice("run rm -r notes").risk).toBe("confirm");
    expect(parseVoice("disconnect perplexity").risk).toBe("confirm");
    expect(parseVoice("ask gemini what is a PTY").risk).toBe("confirm");
    expect(riskOf("echo hi > a.txt")).toBe("confirm");
    expect(riskOf("connect api https://x.example")).toBe("confirm");
  });
  it("unmatched speech does nothing", () => expect(parseVoice("make me a sandwich").kind).toBe("unknown"));
});
