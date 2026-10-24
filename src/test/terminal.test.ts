import { describe, expect, it } from "vitest";
import { isDestructive, simulate, STATUS_INFO } from "@/lib/terminal";

describe("terminal rules", () => {
  it("flags destructive commands for confirmation", () => {
    expect(isDestructive("rm -rf ./build")).toBe(true);
    expect(isDestructive("sudo reboot")).toBe(true);
    expect(isDestructive("git reset --hard")).toBe(true);
    expect(isDestructive("ls -la")).toBe(false);
  });
  it("only available hosts can be opened", () => {
    expect(STATUS_INFO.online.canOpen).toBe(true);
    expect(STATUS_INFO.asleep.canOpen).toBe(false);
    expect(STATUS_INFO.offline.canOpen).toBe(false);
    expect(STATUS_INFO.revoked.canOpen).toBe(false);
  });
  it("simulator never claims real execution", () => {
    expect(simulate("make deploy")).toContain("not executed");
  });
});
