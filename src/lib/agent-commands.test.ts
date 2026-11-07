import { describe, expect, it } from "vitest";
import { parseAgentCommand, safeProbeUrl } from "./agent-commands";

describe("in-terminal agent commands", () => {
  it("ask gemini carries the question", () => expect(parseAgentCommand("ask gemini what is 2+2")).toEqual({ kind: "ask", provider: "gemini", prompt: "what is 2+2" }));
  it("ask without a question is refused locally", () => expect(parseAgentCommand("ask perplexity").kind).toBe("text"));
  it("connect Codex/Claude opens the Mac page and never claims a run", () => {
    for (const p of ["codex", "claude"]) { const r = parseAgentCommand(`connect ${p}`); expect(r.kind).toBe("navigate"); expect(r.kind === "navigate" && r.to).toBe("/terminal"); expect(r.kind === "navigate" && r.output).toContain("No agent command has run"); }
  });
  it("connect mcp with URL probes", () => expect(parseAgentCommand("connect mcp https://x.example/mcp")).toEqual({ kind: "probe", provider: "mcp", url: "https://x.example/mcp" }));
  it("run is an alias and claude/openai are API models", () => {
    expect(parseAgentCommand("run claude hi")).toEqual({ kind: "ask", provider: "claude", prompt: "hi" });
    expect(parseAgentCommand("ask openai hi")).toEqual({ kind: "ask", provider: "openai", prompt: "hi" });
    const r = parseAgentCommand("ask codex hi"); expect(r.kind === "text" && r.output).toContain("BLOCKED");
  });
  it("sandbox commands pass through", () => expect(parseAgentCommand("pwd").kind).toBe("none"));
});
describe("probe URL guard", () => {
  it("allows public https", () => expect(safeProbeUrl("https://api.github.com/zen")).not.toBeNull());
  it.each(["http://example.com", "https://localhost/", "https://127.0.0.1/", "https://192.168.1.5/", "https://10.0.0.1/", "https://169.254.169.254/", "https://u:p@example.com/", "https://[::1]/", "https://mac.local/"])("refuses %s", (u) => expect(safeProbeUrl(u)).toBeNull());
});
