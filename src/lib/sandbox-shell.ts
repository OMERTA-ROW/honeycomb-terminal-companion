/**
 * Honeycomb browser sandbox shell. Commands really execute against an in-memory
 * file tree persisted on this device. It is NOT macOS, NOT iOS and NOT a hosted
 * server: it has no network, no processes and cannot reach any computer.
 */
export type Node = { type: "dir"; children: Record<string, Node> } | { type: "file"; content: string };
export interface ShellState { cwd: string; root: Node; history: string[]; startedAt: number }
export interface ExecResult { state: ShellState; output: string; clear?: boolean }

export const HOME = "/home/honeycomb";
export const COMMANDS = ["pwd", "ls", "cd", "mkdir", "touch", "cat", "echo", "rm", "history", "clear", "whoami", "date", "uname", "help"] as const;
const MAX_FILE = 64 * 1024, MAX_NODES = 500, MAX_HISTORY = 200, MAX_LINE = 2000;

export function newSession(now = Date.now()): ShellState {
  const dir = (children: Record<string, Node> = {}): Node => ({ type: "dir", children });
  return {
    cwd: HOME, history: [], startedAt: now,
    root: dir({ home: dir({ honeycomb: dir({ "README.txt": { type: "file", content: "Browser sandbox. Files stay on this device only.\n" } }) }), tmp: dir() }),
  };
}

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }
function count(n: Node): number { return n.type === "file" ? 1 : 1 + Object.values(n.children).reduce((a, c) => a + count(c), 0); }

export function resolve(cwd: string, p: string): string {
  const parts = (p.startsWith("/") ? p : `${cwd}/${p}`).replace(/^~(?=\/|$)/, HOME).split("/");
  const out: string[] = [];
  for (const s of parts) { if (!s || s === ".") continue; if (s === "..") out.pop(); else out.push(s); }
  return "/" + out.join("/");
}
function get(root: Node, path: string): Node | undefined {
  let n: Node | undefined = root;
  for (const s of path.split("/").filter(Boolean)) { if (!n || n.type !== "dir") return undefined; n = n.children[s]; }
  return n;
}
function parentOf(root: Node, path: string): { dir: Node | undefined; name: string } {
  const i = path.lastIndexOf("/");
  return { dir: get(root, path.slice(0, i) || "/"), name: path.slice(i + 1) };
}
function validName(n: string) { return /^[A-Za-z0-9._ -]{1,64}$/.test(n) && n !== "." && n !== ".."; }

/** Minimal quoting: "a b" and 'a b' are single args. */
export function tokenize(line: string): string[] {
  const out: string[] = []; let cur = "", q: string | null = null, has = false;
  for (const ch of line) {
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (/\s/.test(ch)) { if (cur || has) out.push(cur); cur = ""; has = false; continue; }
    cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

export function exec(prev: ShellState, raw: string, now = Date.now()): ExecResult {
  const line = raw.slice(0, MAX_LINE).trim();
  const state = clone(prev);
  if (!line) return { state, output: "" };
  state.history = [...state.history, line].slice(-MAX_HISTORY);
  let args = tokenize(line);
  let redirect: { path: string; append: boolean } | null = null;
  const ri = args.findIndex((a) => a === ">" || a === ">>");
  if (ri >= 0) {
    if (!args[ri + 1]) return { state, output: "syntax error: missing file after redirect" };
    redirect = { path: resolve(state.cwd, args[ri + 1]!), append: args[ri] === ">>" };
    args = args.slice(0, ri);
  }
  const [cmd, ...rest] = args;
  let out = "";
  const err = (m: string): ExecResult => ({ state, output: `${cmd}: ${m}` });
  switch (cmd) {
    case "pwd": out = state.cwd; break;
    case "whoami": out = "honeycomb"; break;
    case "uname": out = "Honeycomb-Browser-Sandbox (not macOS, not iOS)"; break;
    case "date": out = new Date(now).toString(); break;
    case "echo": out = rest.join(" "); break;
    case "help": out = `Browser sandbox commands: ${COMMANDS.join(" ")}\nFor a real Mac shell, use Connect Mac.`; break;
    case "history": out = state.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n"); break;
    case "clear": return { state, output: "", clear: true };
    case "cd": {
      const p = resolve(state.cwd, rest[0] ?? HOME); const n = get(state.root, p);
      if (!n) return err(`no such file or directory: ${rest[0]}`);
      if (n.type !== "dir") return err(`not a directory: ${rest[0]}`);
      state.cwd = p; break;
    }
    case "ls": {
      const all = rest.includes("-a"); const target = rest.find((a) => !a.startsWith("-"));
      const p = resolve(state.cwd, target ?? "."); const n = get(state.root, p);
      if (!n) return err(`cannot access '${target}': No such file or directory`);
      if (n.type === "file") { out = target!; break; }
      out = Object.keys(n.children).sort().filter((k) => all || !k.startsWith(".")).map((k) => n.children[k]!.type === "dir" ? `${k}/` : k).join("  ");
      break;
    }
    case "cat": {
      if (!rest.length) return err("missing file operand");
      const parts: string[] = [];
      for (const a of rest) { const n = get(state.root, resolve(state.cwd, a)); if (!n) return err(`${a}: No such file or directory`); if (n.type === "dir") return err(`${a}: Is a directory`); parts.push(n.content.replace(/\n$/, "")); }
      out = parts.join("\n"); break;
    }
    case "mkdir": case "touch": {
      if (!rest.length) return err("missing operand");
      for (const a of rest) {
        const { dir, name } = parentOf(state.root, resolve(state.cwd, a));
        if (!dir || dir.type !== "dir") return err(`cannot create '${a}': No such file or directory`);
        if (!validName(name)) return err(`invalid name '${a}'`);
        if (dir.children[name]) { if (cmd === "mkdir") return err(`cannot create directory '${a}': File exists`); continue; }
        if (count(state.root) >= MAX_NODES) return err("sandbox is full (500 items)");
        dir.children[name] = cmd === "mkdir" ? { type: "dir", children: {} } : { type: "file", content: "" };
      }
      break;
    }
    case "rm": {
      const recursive = rest.includes("-r") || rest.includes("-rf");
      const targets = rest.filter((a) => !a.startsWith("-"));
      if (!targets.length) return err("missing operand");
      for (const a of targets) {
        const p = resolve(state.cwd, a);
        if (p === "/" || p === HOME || state.cwd === p || state.cwd.startsWith(p + "/")) return err(`refusing to remove '${a}'`);
        const { dir, name } = parentOf(state.root, p); const n = dir?.type === "dir" ? dir.children[name] : undefined;
        if (!n || dir?.type !== "dir") return err(`cannot remove '${a}': No such file or directory`);
        if (n.type === "dir" && !recursive) return err(`cannot remove '${a}': Is a directory (use -r)`);
        delete dir.children[name];
      }
      break;
    }
    default:
      return { state, output: `${cmd}: command not found in the browser sandbox. Type help, or Connect Mac for a real shell.` };
  }
  if (redirect) {
    const { dir, name } = parentOf(state.root, redirect.path);
    if (!dir || dir.type !== "dir" || !validName(name)) return { state, output: `cannot write '${redirect.path}'` };
    const ex = dir.children[name];
    if (ex?.type === "dir") return { state, output: `${redirect.path}: Is a directory` };
    const content = (redirect.append && ex?.type === "file" ? ex.content : "") + out + "\n";
    if (content.length > MAX_FILE) return { state, output: "file too large (64 KB limit)" };
    if (!ex && count(state.root) >= MAX_NODES) return { state, output: "sandbox is full (500 items)" };
    dir.children[name] = { type: "file", content };
    return { state, output: "" };
  }
  return { state, output: out };
}

export function prompt(s: ShellState) { return `${s.cwd.replace(new RegExp(`^${HOME}`), "~") || "/"} $`; }
