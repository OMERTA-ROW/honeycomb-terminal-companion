/**
 * Pure readline-style line discipline for the xterm.js sandbox terminal.
 * Feeds raw terminal input bytes, returns the new line state plus events.
 */
export interface LineState { buf: string; pos: number; hist: string[]; hIdx: number | null; draft: string }
export type LineEvent = { type: "submit"; line: string } | { type: "interrupt" } | { type: "eof" } | { type: "tab" } | { type: "clear" } | { type: "escape" };

export const emptyLine = (hist: string[] = []): LineState => ({ buf: "", pos: 0, hist, hIdx: null, draft: "" });

const ESC_SEQ: Record<string, string> = {
  "\x1b[A": "up", "\x1b[B": "down", "\x1b[C": "right", "\x1b[D": "left", "\x1b[H": "home", "\x1b[F": "end",
  "\x1bOH": "home", "\x1bOF": "end", "\x1b[1~": "home", "\x1b[4~": "end", "\x1b[3~": "del", "\x1bOA": "up", "\x1bOB": "down", "\x1bOC": "right", "\x1bOD": "left",
};

export function feed(s0: LineState, data: string): { state: LineState; events: LineEvent[] } {
  let s = { ...s0 }; const events: LineEvent[] = [];
  let i = 0;
  while (i < data.length) {
    const ch = data[i]!;
    if (ch === "\x1b") {
      const seq = Object.keys(ESC_SEQ).find((k) => data.startsWith(k, i));
      if (seq) { s = move(s, ESC_SEQ[seq]!); i += seq.length; continue; }
      if (i === data.length - 1) events.push({ type: "escape" });
      i += 1; continue;
    }
    i += 1;
    switch (ch) {
      case "\r": case "\n":
        if (ch === "\n" && data[i - 2] === "\r") break;
        events.push({ type: "submit", line: s.buf }); s = { ...emptyLine(s.hist) }; break;
      case "\x7f": case "\b":
        if (s.pos > 0) s = { ...s, buf: s.buf.slice(0, s.pos - 1) + s.buf.slice(s.pos), pos: s.pos - 1 }; break;
      case "\x03": events.push({ type: "interrupt" }); s = emptyLine(s.hist); break;
      case "\x04": if (!s.buf) events.push({ type: "eof" }); else s = move(s, "del"); break;
      case "\t": events.push({ type: "tab" }); break;
      case "\x0c": events.push({ type: "clear" }); break;
      case "\x01": s = move(s, "home"); break;
      case "\x05": s = move(s, "end"); break;
      case "\x15": s = { ...s, buf: s.buf.slice(s.pos), pos: 0 }; break;
      case "\x0b": s = { ...s, buf: s.buf.slice(0, s.pos) }; break;
      default:
        if (ch >= " " && s.buf.length < 2000) s = { ...s, buf: s.buf.slice(0, s.pos) + ch + s.buf.slice(s.pos), pos: s.pos + 1 };
    }
  }
  return { state: s, events };
}

function move(s: LineState, k: string): LineState {
  switch (k) {
    case "left": return { ...s, pos: Math.max(0, s.pos - 1) };
    case "right": return { ...s, pos: Math.min(s.buf.length, s.pos + 1) };
    case "home": return { ...s, pos: 0 };
    case "end": return { ...s, pos: s.buf.length };
    case "del": return { ...s, buf: s.buf.slice(0, s.pos) + s.buf.slice(s.pos + 1) };
    case "up": {
      if (!s.hist.length) return s;
      const idx = s.hIdx === null ? s.hist.length - 1 : Math.max(0, s.hIdx - 1);
      const buf = s.hist[idx]!; return { ...s, hIdx: idx, draft: s.hIdx === null ? s.buf : s.draft, buf, pos: buf.length };
    }
    case "down": {
      if (s.hIdx === null) return s;
      if (s.hIdx >= s.hist.length - 1) return { ...s, hIdx: null, buf: s.draft, pos: s.draft.length };
      const buf = s.hist[s.hIdx + 1]!; return { ...s, hIdx: s.hIdx + 1, buf, pos: buf.length };
    }
  }
  return s;
}

/**
 * Normalize clipboard text before it is typed at the cursor: iOS "smart"
 * quotes/dashes become ASCII, NBSP/tabs become spaces, CRLF becomes one Enter,
 * bracketed-paste markers and other control bytes are dropped so a paste can
 * never trigger Ctrl+C/D, Tab completion or Escape. Newlines still submit lines.
 */
export function sanitizePaste(text: string): string {
  return text
    .replace(/\x1b\[20[01]~/g, "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-").replace(/[\u00A0\u2007\u202F\t]/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "")
    .replace(/\n/g, "\r");
}

/** Longest common prefix for Tab completion. */
export function commonPrefix(xs: string[]): string {
  if (!xs.length) return ""; let p = xs[0]!;
  for (const x of xs) while (!x.startsWith(p)) p = p.slice(0, -1);
  return p;
}

/** ANSI to repaint the editable line in place (prompt + buffer, caret at pos). */
export function redraw(prompt: string, s: LineState): string {
  const back = s.buf.length - s.pos;
  return `\r\x1b[K${prompt}${s.buf}${back ? `\x1b[${back}D` : ""}`;
}
