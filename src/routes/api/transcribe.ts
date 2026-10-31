import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 10 * 1024 * 1024;

/** Signed-in, active members only: forwards one complete WAV clip to Lovable AI transcription and streams the SSE back. Audio is not stored. */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const url = process.env["SUPABASE_URL"], pk = process.env["SUPABASE_PUBLISHABLE_KEY"], key = process.env["LOVABLE_API_KEY"];
        if (!url || !pk || !key) return Response.json({ error: "Transcription is not configured." }, { status: 503 });
        if (!auth.startsWith("Bearer ")) return Response.json({ error: "Sign in first." }, { status: 401 });
        const sb = createClient(url, pk, {
          auth: { persistSession: false },
          global: { headers: { Authorization: auth }, fetch: (i, init) => { const h = new Headers(init?.headers); h.set("apikey", pk); return fetch(i, { ...init, headers: h }); } },
        });
        const { data: allowed, error } = await sb.rpc("hc_session_allowed");
        if (error || allowed !== true) return Response.json({ error: "Session expired or revoked. Sign in again." }, { status: 401 });

        const len = Number(request.headers.get("content-length") ?? "0");
        if (len > MAX_BYTES) return Response.json({ error: "Recording too long — keep it under about a minute." }, { status: 413 });
        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof File) || file.size < 2048 || file.size > MAX_BYTES || file.type !== "audio/wav")
          return Response.json({ error: "Recording was empty or invalid — please record again." }, { status: 400 });

        const up = new FormData();
        up.append("model", "openai/gpt-transcribe");
        up.append("file", file, "recording.wav");
        up.append("response_format", "json");
        up.append("stream", "true");
        up.append("keywords", "Honeycomb, Gemini, Perplexity, Codex, Claude, sandbox, terminal, pwd, ls, MCP");
        const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST", headers: { Authorization: `Bearer ${key}` }, body: up, signal: request.signal,
        });
        return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
      },
    },
  },
});
