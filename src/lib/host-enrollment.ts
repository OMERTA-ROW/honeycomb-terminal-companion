/** Browser-safe helpers for account-linked Mac hosts. Online means a recent helper check-in only. */
export interface AccountHost {
  id: string; name: string; os: string; fingerprint: string;
  last_seen: string | null; revoked_at: string | null; created_at: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I or O; matches helper
/** Helper checks in every 60 s; allow one missed beat. */
export const ONLINE_WINDOW_MS = 150_000;

export function enrollmentCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(rand(12), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function hostState(h: AccountHost, now: number) {
  if (h.revoked_at) return { label: "Revoked", tone: "text-destructive", detail: "Removed from your account. The helper refuses all phones." };
  const seen = h.last_seen ? Date.parse(h.last_seen) : NaN;
  if (Number.isFinite(seen) && now - seen >= 0 && now - seen <= ONLINE_WINDOW_MS) return { label: "Helper online", tone: "text-primary", detail: "Recent account check-in only; shell reachability is checked when you connect." };
  return { label: "Status unknown", tone: "text-warning", detail: "No recent account check-in; this does not prove sleep or offline. Check the Mac, helper and private network." };
}
