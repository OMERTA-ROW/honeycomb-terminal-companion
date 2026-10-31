import { describe, expect, it } from "vitest";
import { searchDestinations } from "./destinations";

describe("site search", () => {
  it("typing Terminal finds the Terminal screen first", () => {
    expect(searchDestinations("Terminal")[0]?.to).toBe("/terminal");
    expect(searchDestinations("term")[0]?.to).toBe("/terminal");
  });
  it("shell also routes to Terminal", () => expect(searchDestinations("shell")[0]?.to).toBe("/terminal"));
  it("empty search shows nothing", () => expect(searchDestinations("  ")).toEqual([]));
});
describe("connectors search", () => {
  it("Connectors and MCP route to Connectors", () => {
    expect(searchDestinations("Connectors")[0]?.to).toBe("/connectors");
    expect(searchDestinations("mcp")[0]?.to).toBe("/connectors");
  });
});
