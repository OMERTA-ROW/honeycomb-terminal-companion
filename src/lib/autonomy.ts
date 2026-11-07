/**
 * Owner-controlled autonomous modes. Pure, fail-closed gate logic.
 * Nothing here executes work; it only decides whether a mode MAY be switched on.
 * Missing, unknown or stale evidence always blocks.
 */
export type AutonomyMode = "local" | "omni";

export interface AutonomySettings {
  /** Owner's independent switch requests per mode (a request, not activation). */
  requested: Record<AutonomyMode, boolean>;
  /** Latched Emergency Stop; while set, nothing may run. */
  emergencyStop: boolean;
  /** Per-run budget in jobs; 0 means none set. */
  budgetJobs: number;
  /** Scoped permissions the owner granted for each mode. */
  scopes: Record<AutonomyMode, string[]>;
}

export interface AutonomyEvidence {
  isOwner: boolean;
  sessionActive: boolean;
  deviceRevoked: boolean;
  /** Epoch ms of the last successful real connection test, per mode. */
  connectionTestedAt: Partial<Record<AutonomyMode, number>>;
  /** True only when a real OMNI Docking Bay endpoint is configured for this account. */
  omniConfigured: boolean;
  /** True only after the safety suite ran against the real executor. */
  safetyVerified: Partial<Record<AutonomyMode, boolean>>;
  now: number;
}

export const TEST_FRESH_MS = 10 * 60 * 1000;

export const DEFAULT_SETTINGS: AutonomySettings = {
  requested: { local: false, omni: false },
  emergencyStop: false,
  budgetJobs: 0,
  scopes: { local: [], omni: [] },
};

/** What the browser/iOS sandbox genuinely permits. Never an unrestricted shell. */
export const LOCAL_CAPABILITIES = [
  { id: "sandbox-shell", label: "Browser sandbox commands (simulated shell, not macOS/iOS)" },
  { id: "files-read", label: "Read files you saved into Honeycomb on this device" },
  { id: "downloads", label: "Approved downloads while the page is open (no background, never executed)" },
] as const;

export const OMNI_SCOPES = [
  { id: "read-status", label: "Read job status and logs" },
  { id: "run-allowlisted", label: "Run allowlisted, non-destructive jobs" },
] as const;

export const LOCAL_LIMITS = [
  "iOS/iPadOS suspends web pages in the background, so local tasks pause when Honeycomb is not on screen.",
  "Browsers cannot start programs, read other apps' files or open a real shell.",
  "Money, deletion, credentials, publishing and outside messages always need a separate approval.",
];

export interface Gate { id: string; label: string; ok: boolean; next: string }

export function gates(mode: AutonomyMode, s: AutonomySettings, e: AutonomyEvidence): Gate[] {
  const tested = e.connectionTestedAt[mode];
  const fresh = typeof tested === "number" && Number.isFinite(tested) && tested <= e.now && e.now - tested < TEST_FRESH_MS;
  const list: Gate[] = [
    { id: "stop", label: "Emergency Stop released", ok: !s.emergencyStop, next: "Release Emergency Stop after reviewing why it was pressed." },
    { id: "owner", label: "Owner signed in", ok: e.isOwner && e.sessionActive, next: "Sign in with the owner account." },
    { id: "device", label: "This device not revoked", ok: !e.deviceRevoked, next: "Re-approve this device from the owner account." },
    { id: "scopes", label: "Permissions chosen", ok: (s.scopes[mode] ?? []).length > 0, next: "Pick at least one permission below." },
    { id: "budget", label: "Job budget set", ok: Number.isInteger(s.budgetJobs) && s.budgetJobs > 0 && s.budgetJobs <= 50, next: "Set a job budget between 1 and 50." },
  ];
  if (mode === "omni") list.push({ id: "omni", label: "OMNI Docking Bay connected", ok: e.omniConfigured, next: "Connect the existing OMNI backend; no OMNI link is configured yet." });
  list.push(
    { id: "test", label: "Connection tested in last 10 minutes", ok: fresh, next: mode === "omni" ? "Run a real connection test to OMNI." : "Run the local capability test." },
    { id: "safety", label: "Safety checks verified on the real executor", ok: e.safetyVerified[mode] === true, next: "Needs a verified executor; not available yet." },
  );
  return list;
}

export type ModeState = "off" | "blocked" | "active";

/** Active only if requested AND every gate passes. Anything else is off or blocked. */
export function modeState(mode: AutonomyMode, s: AutonomySettings, e: AutonomyEvidence): ModeState {
  if (s.emergencyStop) return "off";
  if (!s.requested[mode]) return "off";
  return gates(mode, s, e).every((g) => g.ok) ? "active" : "blocked";
}

export function emergencyStop(s: AutonomySettings): AutonomySettings {
  return { ...s, emergencyStop: true, requested: { local: false, omni: false } };
}

/** Parse stored settings; anything malformed falls back to OFF defaults. */
export function parseSettings(raw: string | null): AutonomySettings {
  try {
    const v = JSON.parse(raw ?? "");
    const pick = (a: unknown, allowed: readonly { id: string }[]) =>
      Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && allowed.some((c) => c.id === x)) : [];
    return {
      requested: { local: v?.requested?.local === true, omni: v?.requested?.omni === true },
      emergencyStop: v?.emergencyStop === true,
      budgetJobs: Number.isInteger(v?.budgetJobs) ? Math.min(Math.max(v.budgetJobs, 0), 50) : 0,
      scopes: { local: pick(v?.scopes?.local, LOCAL_CAPABILITIES), omni: pick(v?.scopes?.omni, OMNI_SCOPES) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
