// Browser-safe, account-keyed record of the Mac this device connected to.
// It is a convenience shortcut only: it grants nothing. The Mac companion
// still checks its own pairing cookie and can revoke at any time.
export type MacLink = { address: string; name: string; savedAt: number };
export type TerminalStep = "loading" | "signin" | "connect" | "reconnect";

const PRIVATE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/;
const key = (accountId: string) => `honeycomb.mac-link.${accountId}`;

export function normalizeAddress(raw: string): string | null {
  const clean = raw.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return PRIVATE.test(clean) ? clean : null;
}
export function liveUrl(address: string): string {
  return `https://${address.includes(":") ? address : `${address}:8765`}/`;
}
export function terminalStep(ready: boolean, accountId: string | null, link: MacLink | null): TerminalStep {
  if (!ready) return "loading";
  if (!accountId) return "signin";
  return link ? "reconnect" : "connect";
}
export function loadMacLink(accountId: string, store: Pick<Storage, "getItem"> = localStorage): MacLink | null {
  try {
    const v = JSON.parse(store.getItem(key(accountId)) ?? "null");
    return v && typeof v.address === "string" && normalizeAddress(v.address) ? v : null;
  } catch { return null; }
}
export function saveMacLink(accountId: string, link: MacLink, store: Pick<Storage, "setItem"> = localStorage) {
  store.setItem(key(accountId), JSON.stringify(link));
}
export function forgetMacLink(accountId: string, store: Pick<Storage, "removeItem"> = localStorage) {
  store.removeItem(key(accountId));
}
