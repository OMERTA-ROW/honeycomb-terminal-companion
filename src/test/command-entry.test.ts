import { describe, expect, it } from "vitest";
import { historyIndex, insertAtSelection, moveCursor } from "@/lib/command-entry";

describe("command entry", () => {
  it("moves left and right within a command", () => {
    expect(moveCursor("abcd", 2, 2, "left")).toBe(1);
    expect(moveCursor("abcd", 2, 2, "right")).toBe(3);
  });
  it("stops at both boundaries including empty input", () => {
    expect(moveCursor("abc", 0, 0, "left")).toBe(0);
    expect(moveCursor("abc", 3, 3, "right")).toBe(3);
    expect(moveCursor("", 0, 0, "right")).toBe(0);
  });
  it("collapses selection toward the requested side", () => {
    expect(moveCursor("abcdef", 1, 5, "left")).toBe(1);
    expect(moveCursor("abcdef", 1, 5, "right")).toBe(5);
  });
  it("does not split a visible unicode character", () => {
    expect(moveCursor("a👩‍💻b", 1, 1, "right")).toBe(6);
    expect(moveCursor("a👩‍💻b", 6, 6, "left")).toBe(1);
  });
  it("replaces selection when inserting clipboard text", () => {
    expect(insertAtSelection("abcdef", 2, 4, "X")).toEqual({ value: "abXef", cursor: 3 });
  });
  it("clamps history at the newest draft and oldest command", () => {
    expect(historyIndex(-1, "down", 2)).toBe(-1);
    expect(historyIndex(1, "up", 2)).toBe(1);
    expect(historyIndex(-1, "up", 0)).toBe(-1);
  });
});