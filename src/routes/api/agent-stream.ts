import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/** Signed-in, active members only: streams a Codex-style (OpenAI GPT) or Claude model reply as plain text chunks. These are model APIs, not CLIs — nothing is executed. Each request is audited. */
export const Route = createFileRoute("/api/agent-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const url = process.env["SUPABASE_URL"], pk = process.env["SUPABASE_PUBLISHABLE_KEY"], key = process.env["LOVABLE_API_KEY"];
        if (!url || !pk) return Response.json({ error: "Not configured." }, { status: 503 });
        if (!auth.startsWith("Bearer ")) return Response.json({ error: "Sign in first." }, { status: 401 });
        const sb = createClient(url, pk, {
          auth: { persistSession: false },
          global: { headers: { Authorization: auth }, fetch: (i, init) => { const h = new Headers(init?.headers); h.set("apikey", pk); return fetch(i, { ...init, headers: h }); } },
        });
        const { data: allowed, error } = await sb.rpc("hc_session_allowed");
        if (error || allowed !== true) return Response.json({ error: "Session expired or revoked. Sign in again." }, { status: 401 });
        const body = (await request.json().catch(() => null)) as { provider?: string; prompt?: string; context?: string } | null;
        const provider = body?.provider;
        if (provider !== "codex" && provider !== "claude") return Response.json({ error: "Unknown provider." }, { status: 400 });
        const prompt = (body?.prompt ?? "").trim(), ctx = (body?.context ?? "").slice(0, 60000);
        if (!prompt || prompt.length > 8000) return Response.json({ error: "Prompt must be 1–8000 characters." }, { status: 400 });
        const log = (outcome: string, detail: string) => sb.from("hc_workspace_audit").insert({ provider, action: "prompt", target: prompt.slice(0, 120), write: false, outcome, detail: detail.slice(0, 500) });
        if (!key) { await log("blocked", "AI not enabled"); return Response.json({ error: "AI is not enabled for this project." }, { status: 503 }); }

        const system = "You are a coding assistant inside a web workspace. You cannot run commands, read the user's disk, or change files; say so if asked. Propose code and exact commands as text for the user to review.";
        const user = ctx ? `Context file:\n\`\`\`\n${ctx}\n\`\`\`\n\n${prompt}` : prompt;
        const upstream = provider === "claude"
          ? await fetch("https://ai.gateway.lovable.dev/v1/messages", {
              method: "POST", signal: request.signal,
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "anthropic-version": "2023-06-01", "X-Lovable-AIG-SDK": "fetch" },
              body: JSON.stringify({ model: "anthropic/claude-sonnet-5", max_tokens: 4096, stream: true, system, messages: [{ role: "user", content: user }] }),
            })
          : await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST", signal: request.signal,
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: "openai/gpt-6-astra", reasoning_effort: "low", stream: true, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
            });
        if (!upstream.ok || !upstream.body) {
          const t = (await upstream.text()).slice(0, 300);
          await log("failed", `[${upstream.status}] ${t}`);
          const msg = upstream.status === 429 ? "Rate limited — wait a moment and try again." : upstream.status === 402 ? "AI credits are used up for this workspace." : `Model request failed [${upstream.status}]: ${t}`;
          return Response.json({ error: msg }, { status: upstream.status === 403 ? 403 : upstream.status === 429 ? 429 : 502 });
        }
        await log("ok", provider === "claude" ? "Claude model (not Claude Code)" : "OpenAI GPT model (not Codex CLI)");

        const dec = new TextDecoder(), enc = new TextEncoder();
        let buf = "";
        const stream = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctl) {
            buf += dec.decode(chunk, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const d = line.slice(5).trim();
              if (!d || d === "[DONE]") continue;
              try {
                const j = JSON.parse(d) as { type?: string; delta?: { type?: string; text?: string; stop_reason?: string }; choices?: { delta?: { content?: string } }[] };
                const text = j.delta?.type === "text_delta" ? j.delta.text : j.choices?.[0]?.delta?.content;
                if (text) ctl.enqueue(enc.encode(text));
                if (j.delta?.stop_reason === "refusal") ctl.enqueue(enc.encode("\n[The model declined this request.]"));
              } catch { /* partial frame */ }
            }
          },
        }));
        return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache, no-transform" } });
      },
    },
  },
});
