// Single service-worker registrar. Refuses in dev, iframes and Lovable preview hosts.
declare const __HC_BUILD__: string;
export const BUILD_ID: string = typeof __HC_BUILD__ !== "undefined" ? __HC_BUILD__ : "dev";

const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const PREVIEW_DOMAINS = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

export function swRefusalReason(host: string, search: string, prod: boolean, inIframe: boolean): string | null {
  const h = host.toLowerCase();
  if (!prod) return "development build";
  if (inIframe) return "running inside the editor frame";
  if (new URLSearchParams(search).get("sw") === "off") return "?sw=off kill switch";
  const label = h.split(".")[0] ?? "";
  if (PREVIEW_DOMAINS.some((d) => h.endsWith(d)) && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) return "Lovable preview address";
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h) || /(^|\.)beta\.lovable\.dev$/.test(h)) return "Lovable preview address";
  return null;
}

type Listener = (s: { waiting: boolean; reason: string | null; registered: boolean }) => void;
let state = { waiting: false, reason: null as string | null, registered: false };
const listeners = new Set<Listener>();
let applyUpdate: (() => Promise<void>) | null = null;
const emit = () => listeners.forEach((l) => l(state));

export function subscribePwa(l: Listener) { listeners.add(l); l(state); return () => { listeners.delete(l); }; }

async function unregisterAppSw() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js") || r.waiting?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}

export async function initPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) { state = { ...state, reason: "browser has no service worker support" }; emit(); return; }
  let inIframe = true; try { inIframe = window.self !== window.top; } catch { /* cross-origin frame */ }
  const reason = swRefusalReason(window.location.hostname, window.location.search, import.meta.env.PROD, inIframe);
  if (reason) { state = { ...state, reason }; emit(); await unregisterAppSw(); return; }
  const { registerSW } = await import("virtual:pwa-register");
  const update = registerSW({
    immediate: true,
    onNeedRefresh() { state = { ...state, waiting: true }; emit(); },
    onRegisteredSW() { state = { ...state, registered: true }; emit(); },
  });
  applyUpdate = () => update(true);
}

/** Only called after explicit user consent; reloads the page. */
export function reloadWithUpdate() { return applyUpdate?.(); }

/** After a new publish, an open tab can request page code that no longer exists. Reload once to fetch the current version instead of showing a blank screen; a second failure in the same tab is left to the error page so it can never loop. */
export function recoverFromStaleChunks() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const key = "hc-stale-chunk-reload";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  });
  window.setTimeout(() => sessionStorage.removeItem("hc-stale-chunk-reload"), 10_000);
}
