/** Decides whether the current session came from an email recovery/invite link (not an ordinary sign-in). */
export const RECOVERY_WINDOW_SECONDS = 60 * 60;
type Amr = { method?: string; timestamp?: number };

export function recoveryAllowed(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;
  return (amr as Amr[]).some(a => (a.method === 'recovery' || a.method === 'invite')
    && typeof a.timestamp === 'number' && nowSeconds - a.timestamp >= -60 && nowSeconds - a.timestamp <= RECOVERY_WINDOW_SECONDS);
}

export function amrFromAccessToken(token: string | undefined): unknown {
  try {
    const part = token?.split('.')[1]; if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    return (JSON.parse(json) as { amr?: unknown }).amr ?? null;
  } catch { return null; }
}
