import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from "./account.functions";
import { MAX_CLOCK_SKEW_MS, canonicalMessage, type SelfTest, type SelfTestCheck } from "./omni";

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Runs OMNI's secure-link self-test server-side. URL and secret never reach the browser. */
export const omniSelfTest = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .handler(async ({ context }): Promise<SelfTest> => {
    const base = process.env["OMNI_BASE_URL"];
    const secret = process.env["OMNI_LINK_SECRET"];
    const at = Date.now();
    if (!base || !secret) return { configured: false, checks: [], at };
    const checks: SelfTestCheck[] = [];
    try {
      const path = "/honeycomb/self-test";
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      const bodySha256 = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("")));
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalMessage({ method: "GET", path, timestamp, nonce, bodySha256 }))));
      const res = await fetch(new URL(path, base), {
        headers: { "x-omni-timestamp": String(timestamp), "x-omni-nonce": nonce, "x-omni-signature": sig, "x-omni-user": context.userId },
        signal: AbortSignal.timeout(8000),
      });
      checks.push({ id: "reachable", pass: true, detail: `HTTP ${res.status}` });
      checks.push({ id: "signature", pass: res.ok, detail: res.ok ? "Accepted" : `Rejected (HTTP ${res.status})` });
      const body = res.ok ? ((await res.json().catch(() => ({}))) as { serverTime?: number; runnerReady?: boolean; killSwitch?: boolean }) : {};
      const skew = typeof body.serverTime === "number" ? Math.abs(body.serverTime - Date.now()) : null;
      checks.push({ id: "clock", pass: skew !== null && skew <= MAX_CLOCK_SKEW_MS, detail: skew === null ? "No server time reported" : `${skew} ms` });
      checks.push({ id: "runner", pass: body.runnerReady === true, detail: body.runnerReady === true ? "Ready" : "Not reported ready" });
      checks.push({ id: "killswitch", pass: body.killSwitch === false, detail: body.killSwitch === false ? "Off" : body.killSwitch ? "Engaged" : "Unknown" });
    } catch (e) {
      console.error("omni self-test", e);
      if (!checks.length) checks.push({ id: "reachable", pass: false, detail: "Could not reach OMNI" });
    }
    return { configured: true, checks, at };
  });
