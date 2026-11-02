import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isAllowedUrl, MAX_DOWNLOAD_BYTES } from "@/lib/downloads";

/** Signed-in, active members only: streams one allowlisted https file (GitHub, npm, nodejs.org, PyPI) with Range passthrough for resume. Every redirect hop is re-checked; nothing is stored or executed server-side. */
export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const url = process.env["SUPABASE_URL"], pk = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !pk) return Response.json({ error: "Downloads are not configured." }, { status: 503 });
        if (!auth.startsWith("Bearer ")) return Response.json({ error: "Sign in first." }, { status: 401 });
        const sb = createClient(url, pk, {
          auth: { persistSession: false },
          global: { headers: { Authorization: auth }, fetch: (i, init) => { const h = new Headers(init?.headers); h.set("apikey", pk); return fetch(i, { ...init, headers: h }); } },
        });
        const { data: allowed, error } = await sb.rpc("hc_session_allowed");
        if (error || allowed !== true) return Response.json({ error: "Session expired or revoked. Sign in again." }, { status: 401 });

        let target = new URL(request.url).searchParams.get("url") ?? "";
        if (!isAllowedUrl(target)) return Response.json({ error: "That address is not on the approved download list." }, { status: 400 });
        const headers = new Headers({ "user-agent": "Honeycomb-Downloads", accept: "*/*" });
        const range = request.headers.get("range");
        if (range && /^bytes=\d+-$/.test(range)) headers.set("range", range);
        const ifRange = request.headers.get("if-range");
        if (ifRange && range) headers.set("if-range", ifRange);

        let res: Response | null = null;
        for (let hop = 0; hop < 6; hop++) {
          res = await fetch(target, { headers, redirect: "manual", signal: request.signal });
          if (res.status < 300 || res.status >= 400) break;
          const next = res.headers.get("location");
          if (!next) break;
          target = new URL(next, target).toString();
          if (!isAllowedUrl(target)) return Response.json({ error: "Download redirected to an unapproved address." }, { status: 502 });
          res = null;
        }
        if (!res) return Response.json({ error: "Too many redirects." }, { status: 502 });
        if (!res.ok) return Response.json({ error: `Source answered ${res.status}.` }, { status: res.status === 416 ? 416 : 502 });
        const len = Number(res.headers.get("content-length") ?? "0");
        if (len > MAX_DOWNLOAD_BYTES) return Response.json({ error: "File is larger than the 1 GB limit." }, { status: 413 });

        const out = new Headers({ "content-type": "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-final-url": target });
        for (const h of ["content-length", "content-range", "etag", "last-modified", "accept-ranges"]) {
          const v = res.headers.get(h);
          if (v) out.set(h, v);
        }
        if (/^https:\/\/api\.github\.com\//.test(target)) out.set("content-type", "application/json");
        return new Response(res.body, { status: res.status, headers: out });
      },
    },
  },
});
