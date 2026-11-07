/** Pure, browser-safe OMNI gating, auto-lock and snippet rules. Never reports Connected without a full passing self-test. */
export type CheckId = "reachable" | "signature" | "clock" | "runner" | "killswitch";
export interface SelfTestCheck { id: CheckId; pass: boolean; detail: string }
export interface SelfTest { configured: boolean; checks: SelfTestCheck[]; at: number }

export const CHECK_LABEL: Record<CheckId, string> = {
  reachable: "OMNI reachable",
  signature: "Signature accepted",
  clock: "Clock skew OK",
  runner: "Sandbox runner ready",
  killswitch: "Kill switch off",
};
export const REQUIRED_CHECKS: CheckId[] = ["reachable", "signature", "clock", "runner", "killswitch"];
export const SELF_TEST_FRESH_MS = 5 * 60_000;
export const MAX_CLOCK_SKEW_MS = 30_000;

export type OmniState = "not_configured" | "not_connected" | "stopped" | "locked" | "connected";
export const OMNI_STATE_LABEL: Record<OmniState, string> = {
  not_configured: "Not connected to OMNI",
  not_connected: "Not connected to OMNI",
  stopped: "Stopped by owner",
  locked: "Locked",
  connected: "Connected to OMNI",
};

export function omniState(t: SelfTest | null, locked: boolean, now: number): OmniState {
  if (!t || !t.configured) return "not_configured";
  const kill = t.checks.find((c) => c.id === "killswitch");
  if (kill && !kill.pass && t.checks.find((c) => c.id === "signature")?.pass) return "stopped";
  const fresh = now - t.at >= 0 && now - t.at <= SELF_TEST_FRESH_MS;
  const allPass = REQUIRED_CHECKS.every((id) => t.checks.some((c) => c.id === id && c.pass));
  if (!fresh || !allPass) return "not_connected";
  return locked ? "locked" : "connected";
}

/** Input is accepted only when connected and unlocked. */
export const canSendInput = (s: OmniState) => s === "connected";

export const DEFAULT_IDLE_MS = 5 * 60_000;
export const MIN_IDLE_MS = 60_000;
export const MAX_IDLE_MS = 30 * 60_000;
export function clampIdle(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_IDLE_MS;
  return Math.min(MAX_IDLE_MS, Math.max(MIN_IDLE_MS, Math.round(ms)));
}
/** Locks when hidden or idle past the limit. */
export function shouldLock(o: { hidden: boolean; lastActivity: number; now: number; idleMs: number }): boolean {
  return o.hidden || o.now - o.lastActivity >= clampIdle(o.idleMs);
}

export interface Snippet { id: string; name: string; command: string }
export const placeholders = (cmd: string) => [...new Set([...cmd.matchAll(/\{([a-zA-Z_][\w-]*)\}/g)].map((m) => m[1]!))];
/** Fills placeholders and returns text for the input line; never contains a trailing newline, so nothing auto-runs. */
export function fillSnippet(cmd: string, values: Record<string, string>): string {
  return cmd
    .replace(/\{([a-zA-Z_][\w-]*)\}/g, (m, k: string) => (values[k] ?? m).replace(/[\r\n]/g, " "))
    .replace(/[\r\n]+/g, " ")
    .trimEnd();
}
export function parseSnippets(raw: string | null): Snippet[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v)
      ? v.filter((s) => s && typeof s.id === "string" && typeof s.name === "string" && typeof s.command === "string").slice(0, 200)
      : [];
  } catch { return []; }
}

/** Canonical HMAC message: method, path, timestamp, nonce, sha256(body) hex. Format must match OMNI's desktop link once confirmed. */
export function canonicalMessage(p: { method: string; path: string; timestamp: number; nonce: string; bodySha256: string }): string {
  return [p.method.toUpperCase(), p.path, String(p.timestamp), p.nonce, p.bodySha256].join("\n");
}
