/** Browser-safe helpers for account-linked Mac hosts. Online means a recent helper check-in only. */
export interface AccountHost {
  id: string; name: string; os: string; fingerprint: string;
  last_seen: string | null; revoked_at: string | null; created_at: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Helper checks in every 60 s; allow one missed beat. */
export const ONLINE_WINDOW_MS = 150_000;

export function enrollmentCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(rand(12), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function hostState(h: AccountHost, now: number) {
  if (h.revoked_at) return { label: "Revoked", tone: "text-destructive", detail: "Removed from your account. The helper refuses all phones." };
  const seen = h.last_seen ? Date.parse(h.last_seen) : 0;
  if (now - seen <= ONLINE_WINDOW_MS) return { label: "Helper online", tone: "text-primary", detail: "Checked in recently. Connect on the same Wi-Fi below." };
  return { label: "Helper offline", tone: "text-warning", detail: "No recent check-in. Wake the Mac and start Honeycomb." };
}
