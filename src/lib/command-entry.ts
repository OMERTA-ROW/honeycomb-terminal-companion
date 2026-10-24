// Browser-safe input editing, shared by touch controls and tests.
export function moveCursor(value: string, start: number, end: number, direction: "left" | "right"): number {
  if (start !== end) return direction === "left" ? start : end;
  const boundaries = [0];
  for (const part of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)) {
    boundaries.push(part.index + part.segment.length);
  }
  return direction === "left"
    ? (boundaries.filter((position) => position < start).at(-1) ?? 0)
    : (boundaries.find((position) => position > end) ?? value.length);
}

export function insertAtSelection(value: string, start: number, end: number, text: string) {
  return { value: value.slice(0, start) + text + value.slice(end), cursor: start + text.length };
}

export function historyIndex(current: number, direction: "up" | "down", length: number) {
  return direction === "up" ? Math.min(current + 1, length - 1) : Math.max(-1, current - 1);
}

export const KEY_COMBINATIONS = ["Ctrl+C", "Ctrl+L", "Ctrl+U", "Esc", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
export type KeyCombination = (typeof KEY_COMBINATIONS)[number];