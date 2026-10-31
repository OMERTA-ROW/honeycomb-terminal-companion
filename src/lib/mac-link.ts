// Browser-safe, account-keyed list of computers this device has connected to.
// A convenience shortcut only: it grants nothing. Each Mac companion checks its
// own pairing cookie and can revoke at any time.
export type MacLink = { address: string; name: string; savedAt: number };
export type TerminalStep = "loading" | "signin" | "connect" | "reconnect";
export type QuickStatus = "permission" | "offline" | "ready" | "setup";

const PRIVATE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/;
const key = (accountId: string) => `honeycomb.computers.${accountId}`;
const legacyKey = (accountId: string) => `honeycomb.mac-link.${accountId}`;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function normalizeAddress(raw: string): string | null {
  const clean = raw.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return PRIVATE.test(clean) ? clean : null;
}
export function liveUrl(address: string): string {
  return `https://${address.includes(":") ? address : `${address}:8765`}/`;
}
export function terminalStep(ready: boolean, accountId: string | null, computers: MacLink[]): TerminalStep {
  if (!ready) return "loading";
  if (!accountId) return "signin";
  return computers.length ? "reconnect" : "connect";
}
export function quickStatus(signedIn: boolean, online: boolean, computers: number): QuickStatus {
  if (!signedIn) return "permission";
  if (!online) return "offline";
  return computers ? "ready" : "setup";
}
export function loadComputers(accountId: string, store: Store = localStorage): MacLink[] {
  try {
    const legacy = JSON.parse(store.getItem(legacyKey(accountId)) ?? "null");
    const list: unknown = JSON.parse(store.getItem(key(accountId)) ?? "[]");
    const all = [...(Array.isArray(list) ? list : []), ...(legacy ? [legacy] : [])] as MacLink[];
    const seen = new Set<string>();
    return all.filter((c) => {
      const a = c && typeof c.address === "string" ? normalizeAddress(c.address) : null;
      if (!a || seen.has(a)) return false;
      seen.add(a); return true;
    });
  } catch { return []; }
}
export function saveComputer(accountId: string, link: MacLink, store: Store = localStorage): MacLink[] {
  const next = [link, ...loadComputers(accountId, store).filter((c) => c.address !== link.address)].slice(0, 10);
  store.setItem(key(accountId), JSON.stringify(next));
  store.removeItem(legacyKey(accountId));
  return next;
}
export function removeComputer(accountId: string, address: string, store: Store = localStorage): MacLink[] {
  const next = loadComputers(accountId, store).filter((c) => c.address !== address);
  store.setItem(key(accountId), JSON.stringify(next));
  store.removeItem(legacyKey(accountId));
  return next;
}
