/** Pure, browser-safe truthful status derivation for the owner dashboard. Only real backend evidence can produce "live". */
import { ONLINE_WINDOW_MS } from "./host-enrollment";
export type FeatureState = "live" | "pending" | "simulated" | "failed";
export interface FeatureStatus {
  id: string;
  name: string;
  state: FeatureState;
  evidence: string;
  next: string;
  to?: "/terminal" | "/terminal/sandbox" | "/connectors" | "/account" | "/transfer" | "/install";
}
export interface HostRecord {
  id: string;
  name: string;
  os: string;
  last_seen: string | null;
  revoked_at: string | null;
}
export interface StatusInput {
  membership: "member" | "revoked" | "none" | "error";
  role?: string | null;
  hosts: HostRecord[] | null;
  hostsError: boolean;
  now: number;
}

export const STATE_LABEL: Record<FeatureState, string> = {
  live: "Live Connected",
  pending: "Test Pending",
  simulated: "Simulated / Unavailable",
  failed: "Failed",
};
/** A host heartbeat older than this is not treated as live. */
export const HEARTBEAT_FRESH_MS = ONLINE_WINDOW_MS;

export function hostState(h: HostRecord, now: number): FeatureState {
  if (h.revoked_at) return "failed";
  if (!h.last_seen) return "pending";
  const age = now - Date.parse(h.last_seen);
  return Number.isFinite(age) && age >= 0 && age <= HEARTBEAT_FRESH_MS ? "live" : "pending";
}

export function deriveStatuses(i: StatusInput): FeatureStatus[] {
  const account: FeatureStatus =
    i.membership === "member"
      ? {
          id: "account",
          name: "Private account",
          state: "live",
          evidence: `Server verified your session and ${i.role ?? "member"} membership just now.`,
          next: "Nothing needed.",
          to: "/account",
        }
      : i.membership === "revoked"
        ? {
            id: "account",
            name: "Private account",
            state: "failed",
            evidence: "Server reports this session was revoked.",
            next: "Sign in again.",
            to: "/account",
          }
        : i.membership === "none"
          ? {
              id: "account",
              name: "Private account",
              state: "failed",
              evidence: "Signed in, but this account has no membership.",
              next: "Ask the owner for an invite.",
              to: "/account",
            }
          : {
              id: "account",
              name: "Private account",
              state: "failed",
              evidence: "Membership check failed.",
              next: "Reload, then sign in again.",
              to: "/account",
            };
  const live = (i.hosts ?? []).filter((h) => hostState(h, i.now) === "live");
  const active = (i.hosts ?? []).filter((h) => !h.revoked_at);
  const mac: FeatureStatus = i.hostsError
    ? {
        id: "mac",
        name: "Mac link (account enrollment)",
        state: "failed",
        evidence: "Could not load your enrolled computers.",
        next: "Reload; if it persists, sign in again.",
        to: "/terminal",
      }
    : live.length
      ? {
          id: "mac",
          name: "Mac link (account enrollment)",
          state: "live",
          evidence: `${live.map((h) => h.name).join(", ")} sent an account heartbeat within the last 150 seconds. This is not proof of a reachable shell.`,
          next: "Open Connect Mac and run pwd on the Mac window.",
          to: "/terminal",
        }
      : active.length
        ? {
            id: "mac",
            name: "Mac link (account enrollment)",
            state: "pending",
            evidence: `${active.length} enrolled, no recent heartbeat.`,
            next: "Start the Honeycomb helper on your Mac, then refresh.",
            to: "/terminal",
          }
        : {
            id: "mac",
            name: "Mac link (account enrollment)",
            state: "pending",
            evidence: "No Mac enrolled to this account yet.",
            next: "Open Connect Mac and follow the one-time setup.",
            to: "/terminal",
          };
  return [
    account,
    mac,
    {
      id: "lan",
      name: "Private Mac shell",
      state: "pending",
      evidence:
        "Uses your helper over private Wi-Fi or configured Tailscale HTTPS. This dashboard cannot observe the separate authenticated shell.",
      next: "Open your saved Mac, approve this browser if needed, then run pwd.",
      to: "/terminal",
    },
    {
      id: "sandbox",
      name: "Browser terminal",
      state: "simulated",
      evidence: "Built-in imitation commands on files stored in this browser. Output is never from a real computer.",
      next: "Use Connect Mac for real commands.",
      to: "/terminal/sandbox",
    },
    {
      id: "transfer",
      name: "Selected-file transfer",
      state: "pending",
      evidence: "Real authenticated transfer is built; no two-device owner test recorded.",
      next: "Send one file between two signed-in devices.",
      to: "/transfer",
    },
    {
      id: "agents",
      name: "AI model answers (Gemini, Claude, OpenAI)",
      state: "pending",
      evidence: "Server calls are built; in-app owner test not recorded.",
      next: "In Terminal run: ask gemini hello",
      to: "/connectors",
    },
    {
      id: "cli",
      name: "Codex & Claude Code on your Mac",
      state: "pending",
      evidence:
        "Programs run in your approved Mac shell. Installation and provider sign-in must be checked on that Mac.",
      next: "Connect Mac, then run codex --version or claude --version.",
      to: "/terminal",
    },
  ];
}
