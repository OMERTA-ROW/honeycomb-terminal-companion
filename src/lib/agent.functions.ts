import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from "./account.functions";
import { safeProbeUrl } from "./agent-commands";

type Result = { ok: boolean; text: string; source: string };

async function bodyText(r: Response) { return (await r.text()).slice(0, 2000); }

export const agentStatus = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .handler(async () => ({
    gemini: process.env.LOVABLE_API_KEY ? "ready" : "blocked: AI not enabled",
    perplexity: process.env.PERPLEXITY_API_KEY ? "ready" : "blocked: no Perplexity connection linked",
  }));

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((d: { provider: "gemini" | "perplexity"; prompt: string }) => {
    if (d.provider !== "gemini" && d.provider !== "perplexity") throw new Error("Unknown provider");
    if (typeof d.prompt !== "string" || !d.prompt.trim() || d.prompt.length > 4000) throw new Error("Question must be 1-4000 characters");
    return d;
  })
  .handler(async ({ data }): Promise<Result> => {
    const signal = AbortSignal.timeout(45000);
    if (data.provider === "gemini") {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) return { ok: false, text: "BLOCKED: AI is not enabled for this project.", source: "gemini" };
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3.8-flash", messages: [
          { role: "system", content: "You answer inside a terminal. Plain text, concise, no markdown tables." },
          { role: "user", content: data.prompt }] }),
      });
      if (r.status === 429) return { ok: false, text: "Rate limited — wait a moment and try again.", source: "gemini" };
      if (r.status === 402) return { ok: false, text: "AI credits are used up for this workspace.", source: "gemini" };
      if (!r.ok) return { ok: false, text: `Gemini request failed [${r.status}]: ${await bodyText(r)}`, source: "gemini" };
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      return { ok: true, text: j.choices?.[0]?.message?.content?.trim() || "(empty reply)", source: "Gemini via Lovable AI" };
    }
    const pkey = process.env.PERPLEXITY_API_KEY;
    if (!pkey) return { ok: false, text: "BLOCKED: no Perplexity connection is linked to this project. The owner links one under Connectors → Perplexity, then this command works.", source: "perplexity" };
    if (pkey.startsWith("lovc_")) {
      const lk = process.env.LOVABLE_API_KEY;
      if (!lk) return { ok: false, text: "BLOCKED: gateway key missing.", source: "perplexity" };
      const r = await fetch("https://connector-gateway.lovable.dev/perplexity/search", {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": pkey, "Content-Type": "application/json" },
        body: JSON.stringify({ query: data.prompt, max_results: 5 }),
      });
      if (!r.ok) return { ok: false, text: `Perplexity search failed [${r.status}]: ${await bodyText(r)}`, source: "perplexity" };
      const j = (await r.json()) as { results?: { title: string; url: string; snippet?: string }[] };
      const lines = (j.results ?? []).map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}${x.snippet ? `\n   ${x.snippet.slice(0, 200)}` : ""}`);
      return { ok: true, text: lines.join("\n") || "(no results)", source: "Perplexity search" };
    }
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST", signal,
      headers: { Authorization: `Bearer ${pkey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: data.prompt }] }),
    });
    if (!r.ok) {
      const b = await bodyText(r);
      if (r.status === 401 && b.includes("insufficient_quota")) return { ok: false, text: "Perplexity API credits are used up on the linked account.", source: "perplexity" };
      return { ok: false, text: `Perplexity request failed [${r.status}]: ${b}`, source: "perplexity" };
    }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; citations?: string[] };
    return { ok: true, text: `${j.choices?.[0]?.message?.content ?? ""}${j.citations?.length ? `\nSources:\n${j.citations.join("\n")}` : ""}`, source: "Perplexity sonar" };
  });

export const probeEndpoint = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((d: { provider: "mcp" | "api"; url: string }) => {
    if (d.provider !== "mcp" && d.provider !== "api") throw new Error("Unknown kind");
    if (typeof d.url !== "string" || d.url.length > 500) throw new Error("Bad URL");
    return d;
  })
  .handler(async ({ data }): Promise<Result> => {
    const u = safeProbeUrl(data.url);
    if (!u) return { ok: false, text: "Refused: only public https:// addresses (no local, private or login-in-URL addresses).", source: data.provider };
    try {
      const init: RequestInit = data.provider === "mcp"
        ? { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "honeycomb-terminal", version: "1" } } }) }
        : { method: "GET", redirect: "manual", headers: { Accept: "application/json, text/plain" } };
      const r = await fetch(u, { ...init, signal: AbortSignal.timeout(8000) });
      const b = await bodyText(r);
      if (data.provider === "mcp") {
        const ok = r.ok && /"serverInfo"|"protocolVersion"/.test(b);
        return { ok, text: ok ? `MCP server answered initialize [${r.status}]:\n${b.slice(0, 800)}` : `Not a reachable MCP server [${r.status}]: ${b.slice(0, 400) || "(empty)"}${r.status === 401 ? "\nIt needs sign-in; stored MCP tokens are not built yet." : ""}`, source: "mcp" };
      }
      return { ok: r.ok, text: `GET ${u.host}${u.pathname} → ${r.status}\n${b.slice(0, 800)}`, source: "api" };
    } catch (e) {
      return { ok: false, text: `Could not reach ${u.host}: ${e instanceof Error ? e.message : "network error"}`, source: data.provider };
    }
  });
