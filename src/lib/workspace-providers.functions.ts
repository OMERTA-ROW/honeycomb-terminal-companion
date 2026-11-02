import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from "./account.functions";
import { describeOp, isWrite, validateGithubOp, type GithubOp, type ProviderId } from "./providers";

const GATEWAY = "https://connector-gateway.lovable.dev/github";

type Sb = { from: (t: string) => { insert: (r: Record<string, unknown>) => PromiseLike<{ error: unknown }> } };
async function audit(sb: Sb, row: { provider: ProviderId; action: string; target?: string; write?: boolean; outcome: "ok" | "failed" | "blocked" | "denied"; detail?: string }) {
  await sb.from("hc_workspace_audit").insert({ ...row, target: (row.target ?? "").slice(0, 300), detail: (row.detail ?? "").slice(0, 500) });
}

async function gh(path: string, init: RequestInit = {}) {
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GITHUB_API_KEY"];
  if (!lk || !gk) return { status: 0, body: null as unknown, text: "BLOCKED: no GitHub connection is linked to this project." };
  const r = await fetch(`${GATEWAY}/${path}`, {
    ...init,
    signal: AbortSignal.timeout(20000),
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: r.status, body, text: text.slice(0, 2000) };
}

export const workspaceStatus = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .handler(async ({ context }) => {
    let github: "ok" | "missing" | "failed" = "missing", login: string | null = null, githubError = "";
    if (process.env["GITHUB_API_KEY"]) {
      const r = await gh("user");
      if (r.status === 200) { github = "ok"; login = (r.body as { login?: string })?.login ?? null; }
      else { github = "failed"; githubError = `[${r.status}] ${r.text.slice(0, 200)}`; }
    }
    const { data } = await context.supabase.from("hc_workspace_audit").select("id,provider,action,target,write,outcome,detail,created_at").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(30);
    return { lovableAi: !!process.env["LOVABLE_API_KEY"], github, login, githubError, audit: data ?? [] };
  });

function summarize(o: GithubOp, body: unknown): string {
  const b = body as Record<string, unknown> & unknown[];
  switch (o.op) {
    case "whoami": return `${(b as { login?: string }).login ?? "?"}`;
    case "repos": return (b as unknown as { full_name: string; private: boolean; pushed_at: string }[]).map((r) => `${r.private ? "🔒" : "  "} ${r.full_name}  (${r.pushed_at?.slice(0, 10)})`).join("\n") || "(no repositories)";
    case "repo": { const r = body as { full_name: string; default_branch: string; description?: string; stargazers_count: number; private: boolean }; return `${r.full_name} ${r.private ? "(private)" : ""}\ndefault branch: ${r.default_branch}\n${r.description ?? ""}\n★ ${r.stargazers_count}`; }
    case "branches": return (b as unknown as { name: string; commit: { sha: string } }[]).map((x) => `${x.commit.sha.slice(0, 7)}  ${x.name}`).join("\n");
    case "commits": return (b as unknown as { sha: string; commit: { message: string; author?: { name?: string; date?: string } } }[]).map((c) => `${c.sha.slice(0, 7)} ${c.commit.author?.date?.slice(0, 10) ?? ""} ${c.commit.message.split("\n")[0]}`).join("\n");
    case "issues": return (b as unknown as { number: number; title: string; pull_request?: unknown }[]).filter((i) => !i.pull_request).map((i) => `#${i.number} ${i.title}`).join("\n") || "(no open issues)";
    case "read": { const f = body as { content?: string; encoding?: string; type?: string }; if (f.type !== "file" || !f.content) return "(not a file)"; const bin = atob(f.content.replace(/\n/g, "")); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))).slice(0, 60000); }
    case "create-issue": return `Created ${(body as { html_url?: string }).html_url ?? "issue"}`;
    case "create-branch": return `Created ${(body as { ref?: string }).ref ?? "branch"}`;
    case "commit-file": return `Committed ${(body as { commit?: { sha?: string; html_url?: string } }).commit?.html_url ?? "file"}`;
  }
}

/** Runs one validated GitHub operation. Writes require approved=true, which the UI only sends after the user confirms the exact summary. Every call is audited. */
export const githubRun = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((d: { op: GithubOp; approved?: boolean }) => {
    const err = validateGithubOp(d.op);
    if (err) throw new Error(err);
    return d;
  })
  .handler(async ({ data, context }) => {
    const o = data.op, write = isWrite(o), summary = describeOp(o);
    const sb = context.supabase as unknown as Sb;
    const target = "repo" in o ? o.repo : "";
    if (write && data.approved !== true) {
      await audit(sb, { provider: "github", action: o.op, target, write, outcome: "denied", detail: "Write attempted without approval" });
      return { ok: false, text: "Refused: write actions need your approval first." };
    }
    let path = "", init: RequestInit = {};
    switch (o.op) {
      case "whoami": path = "user"; break;
      case "repos": path = "user/repos?per_page=50&sort=pushed"; break;
      case "repo": path = `repos/${o.repo}`; break;
      case "branches": path = `repos/${o.repo}/branches?per_page=100`; break;
      case "commits": path = `repos/${o.repo}/commits?per_page=20${o.ref ? `&sha=${encodeURIComponent(o.ref)}` : ""}`; break;
      case "issues": path = `repos/${o.repo}/issues?state=open&per_page=30`; break;
      case "read": path = `repos/${o.repo}/contents/${o.path.split("/").map(encodeURIComponent).join("/")}${o.ref ? `?ref=${encodeURIComponent(o.ref)}` : ""}`; break;
      case "create-issue": path = `repos/${o.repo}/issues`; init = { method: "POST", body: JSON.stringify({ title: o.title, body: o.body }) }; break;
      case "create-branch": {
        const base = await gh(`repos/${o.repo}/git/ref/heads/${encodeURIComponent(o.from)}`);
        const sha = (base.body as { object?: { sha?: string } })?.object?.sha;
        if (base.status !== 200 || !sha) {
          await audit(sb, { provider: "github", action: o.op, target, write, outcome: base.status === 0 ? "blocked" : "failed", detail: base.text.slice(0, 200) });
          return { ok: false, text: base.status === 0 ? base.text : `Could not find branch ${o.from} [${base.status}]: ${base.text}` };
        }
        path = `repos/${o.repo}/git/refs`; init = { method: "POST", body: JSON.stringify({ ref: `refs/heads/${o.branch}`, sha }) }; break;
      }
      case "commit-file": {
        const fp = o.path.split("/").map(encodeURIComponent).join("/");
        const cur = await gh(`repos/${o.repo}/contents/${fp}?ref=${encodeURIComponent(o.branch)}`);
        if (cur.status === 0) { await audit(sb, { provider: "github", action: o.op, target, write, outcome: "blocked" }); return { ok: false, text: cur.text }; }
        const sha = cur.status === 200 ? (cur.body as { sha?: string })?.sha : undefined;
        const bytes = new TextEncoder().encode(o.content);
        let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
        path = `repos/${o.repo}/contents/${fp}`;
        init = { method: "PUT", body: JSON.stringify({ message: o.message, content: btoa(bin), branch: o.branch, ...(sha ? { sha } : {}) }) };
        break;
      }
    }
    const r = await gh(path, init);
    if (r.status === 0) { await audit(sb, { provider: "github", action: o.op, target, write, outcome: "blocked", detail: "No GitHub connection" }); return { ok: false, text: r.text }; }
    const ok = r.status >= 200 && r.status < 300;
    await audit(sb, { provider: "github", action: o.op, target, write, outcome: ok ? "ok" : "failed", detail: ok ? summary : `[${r.status}] ${r.text.slice(0, 200)}` });
    return ok ? { ok: true, text: summarize(o, r.body) } : { ok: false, text: `GitHub answered ${r.status}: ${r.text}` };
  });
