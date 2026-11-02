import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, ShieldAlert, ShieldCheck, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccountUser } from "@/hooks/use-account-user";
import {
  APPROVED_SOURCES, checksumFor, compatibility, detectPlatform, findChecksumAsset, normalizeSha256,
  parseContentRange, parseSource, resumeRange, safeFilename, verifyResult, MAX_VERIFY_BYTES,
  type Compatibility, type Platform, type ReleaseAsset,
} from "@/lib/downloads";
import {
  appendChunk, assemble, clearChunks, deleteDownload, listDownloads, saveRecord, sha256Hex, type DownloadRecord,
} from "@/lib/download-store";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Honeycomb" },
      { name: "description", content: "Download approved GitHub releases and CLI packages to this device with checksum checks." },
      { property: "og:title", content: "Downloads — Honeycomb" },
      { property: "og:description", content: "Approved downloads with checksum verification; nothing runs automatically." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Downloads,
});

const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const FLUSH = 2 * 1024 * 1024;

async function token() {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Sign in again.");
  return t;
}
async function proxy(url: string, init: HeadersInit = {}, signal?: AbortSignal) {
  const h = new Headers(init);
  h.set("authorization", `Bearer ${await token()}`);
  return fetch(`/api/download?url=${encodeURIComponent(url)}`, { headers: h, signal: signal ?? null });
}
async function proxyError(r: Response) {
  const j = (await r.json().catch(() => null)) as { error?: string } | null;
  return j?.error ?? `Request failed (${r.status}).`;
}
function fmt(n: number | null) {
  if (n === null) return "unknown size";
  return n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

interface Pending { url: string; filename: string; size: number | null; expected: string | null; compat: Compatibility }

function Downloads() {
  const { user } = useAccountUser();
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [items, setItems] = useState<DownloadRecord[]>([]);
  const [source, setSource] = useState(""), [sha, setSha] = useState("");
  const [assets, setAssets] = useState<ReleaseAsset[] | null>(null), [release, setRelease] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints)), []);
  async function reload() { if (user) setItems(await listDownloads(user.id)); }
  useEffect(() => {
    if (!user) return;
    // Interrupted transfers come back as paused so the user decides whether to resume.
    listDownloads(user.id).then(async (list) => {
      for (const r of list) if (r.status === "downloading") await saveRecord({ ...r, status: "paused" });
      setItems(await listDownloads(user.id));
    });
  }, [user?.id]);

  async function lookupRelease(repo: string) {
    setBusy(true); setMsg(""); setAssets(null);
    try {
      const r = await proxy(`https://api.github.com/repos/${repo}/releases/latest`, { accept: "application/vnd.github+json" });
      if (!r.ok) throw new Error(await proxyError(r));
      const j = (await r.json()) as { tag_name?: string; assets?: { name: string; browser_download_url: string; size: number }[] };
      setRelease(`${repo} ${j.tag_name ?? ""}`);
      setAssets((j.assets ?? []).map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })));
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not load the release."); }
    finally { setBusy(false); }
  }

  async function prepare(url: string, filename: string, size: number | null, list?: ReleaseAsset[]) {
    setMsg("");
    const name = safeFilename(filename), compat = compatibility(name, platform);
    if (compat.level === "blocked") return setMsg(compat.message);
    let expected = sha.trim() ? normalizeSha256(sha) : null;
    if (sha.trim() && !expected) return setMsg("That checksum is not a 64-character SHA-256 value.");
    if (!expected && list) {
      const sums = findChecksumAsset(list, name);
      if (sums) {
        try {
          const r = await proxy(sums.url);
          if (r.ok) expected = checksumFor(await r.text(), name);
        } catch { /* stays unverified, shown to the user */ }
      }
    }
    setPending({ url, filename: name, size, expected, compat });
  }

  async function confirm() {
    if (!pending || !user) return;
    // Ask the browser to keep these files instead of evicting them under storage pressure.
    await navigator.storage?.persist?.().catch(() => false);
    const est = await navigator.storage?.estimate?.().catch(() => undefined);
    if (est?.quota && pending.size && (est.quota - (est.usage ?? 0)) < pending.size) {
      return setMsg("Not enough free storage on this device for that file.");
    }
    const rec: DownloadRecord = {
      id: crypto.randomUUID(), account: user.id, url: pending.url, filename: pending.filename, total: pending.size,
      received: 0, etag: null, expectedSha256: pending.expected, actualSha256: null, verify: "unverified",
      status: "queued", error: null, createdAt: Date.now(),
    };
    await saveRecord(rec);
    setPending(null);
    void run(rec);
  }

  async function run(start: DownloadRecord) {
    const ctl = new AbortController();
    controllers.current.set(start.id, ctl);
    let rec: DownloadRecord = { ...start, status: "downloading", error: null };
    const update = async (r: DownloadRecord) => { rec = r; await saveRecord(r); setItems((xs) => xs.map((x) => (x.id === r.id ? r : x)).concat(xs.some((x) => x.id === r.id) ? [] : [r])); };
    try {
      await update(rec);
      const range = resumeRange(rec.received, rec.total);
      const h: Record<string, string> = {};
      if (range) { h["range"] = range; if (rec.etag) h["if-range"] = rec.etag; }
      const res = await proxy(rec.url, h, ctl.signal);
      if (!res.ok) throw new Error(await proxyError(res));
      if (res.status === 200 && rec.received > 0) { await clearChunks(rec.id); rec = { ...rec, received: 0 }; }
      if (res.status === 206) {
        const cr = parseContentRange(res.headers.get("content-range"));
        if (!cr || cr.start !== rec.received) { await clearChunks(rec.id); throw new Error("Server sent the wrong part; press Resume to restart from the beginning."); }
        rec = { ...rec, total: cr.total ?? rec.total };
      } else {
        const len = Number(res.headers.get("content-length") ?? "");
        rec = { ...rec, total: Number.isFinite(len) && len > 0 ? len : rec.total };
      }
      rec = { ...rec, etag: res.headers.get("etag") ?? rec.etag };
      const reader = res.body!.getReader();
      let buf: Uint8Array[] = [], size = 0;
      const flush = async () => {
        if (!size) return;
        const blob = new Blob(buf as BlobPart[]);
        rec = { ...rec, received: rec.received + size };
        buf = []; size = 0;
        await appendChunk(rec, blob);
        setItems((xs) => xs.map((x) => (x.id === rec.id ? rec : x)));
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf.push(value); size += value.byteLength;
        if (size >= FLUSH) await flush();
      }
      await flush();
      if (rec.total !== null && rec.received !== rec.total) throw new Error("Download ended early; press Resume.");
      let actual: string | null = null;
      if (rec.received <= MAX_VERIFY_BYTES) actual = await sha256Hex(await assemble(rec.id));
      await update({ ...rec, actualSha256: actual, verify: actual ? verifyResult(actual, rec.expectedSha256) : "unverified", status: "complete" });
    } catch (e) {
      const aborted = ctl.signal.aborted;
      await update({ ...rec, status: aborted ? "paused" : "error", error: aborted ? null : e instanceof Error ? e.message : "Download failed." });
    } finally {
      controllers.current.delete(start.id);
    }
  }

  async function exportFile(r: DownloadRecord) {
    if (r.verify === "mismatch" && !window.confirm("Checksum does NOT match. This file may be corrupted or tampered with. Save it anyway?")) return;
    const blob = await assemble(r.id);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = r.filename; // octet-stream + download attribute: saved, never opened
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseSource(source);
    if (!p) return setMsg("Use owner/repo, a github.com repository link, or a link from an approved site (GitHub, npm, nodejs.org, PyPI).");
    void prepare(p.url, p.filename, null);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Downloads</h1>
          <p className="text-sm text-muted-foreground">
            Save GitHub repositories, release files and approved CLI packages into this device's Honeycomb storage — no Mac connection needed.
            Files are stored only; Honeycomb never opens or runs them. Detected device: <b>{platform}</b>.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <label className="text-sm font-medium" htmlFor="dl-src">Repository or link</label>
          <input id="dl-src" className={field} value={source} onChange={(e) => setSource(e.target.value)} placeholder="cli/cli  or  https://github.com/owner/repo" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          <label className="text-sm font-medium" htmlFor="dl-sha">Expected SHA-256 (optional)</label>
          <input id="dl-sha" className={field} value={sha} onChange={(e) => setSha(e.target.value)} placeholder="64 hex characters from the publisher" autoCapitalize="off" spellCheck={false} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}><Download className="mr-1 h-4 w-4" />Download</Button>
            <Button type="button" variant="outline" disabled={busy || !/^[\w.-]+\/[\w.-]+$/.test(source.trim())} onClick={() => lookupRelease(source.trim())}>
              <Search className="mr-1 h-4 w-4" />Latest release files
            </Button>
          </div>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Approved CLI tools</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {APPROVED_SOURCES.map((s) => (
              <button key={s.id} type="button" onClick={() => { setSource(s.repo); void lookupRelease(s.repo); }} className="rounded-xl border border-border bg-card p-3 text-left hover:border-primary">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.repo} · {s.note}</div>
              </button>
            ))}
          </div>
        </section>

        {msg && <p role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm">{msg}</p>}

        {assets && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{release} — {assets.length} files</h2>
            <ul className="max-h-80 space-y-1 overflow-auto rounded-xl border border-border p-2">
              {assets.map((a) => {
                const c = compatibility(a.name, platform);
                return (
                  <li key={a.url} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{a.name} <span className="text-xs text-muted-foreground">{fmt(a.size)}{c.level !== "ok" ? ` · ${c.level === "blocked" ? "not allowed" : "store only"}` : ""}</span></span>
                    <Button size="sm" variant="outline" disabled={c.level === "blocked"} onClick={() => prepare(a.url, a.name, a.size, assets)}>Get</Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {pending && (
          <section role="dialog" aria-label="Confirm download" className="space-y-3 rounded-2xl border border-primary bg-card p-4">
            <h2 className="font-semibold">Allow this download?</h2>
            <p className="break-all text-sm">{pending.filename} · {fmt(pending.size)}<br /><span className="text-xs text-muted-foreground">{new URL(pending.url).hostname}</span></p>
            <p className="text-sm">{pending.compat.message}</p>
            <p className="text-sm">{pending.expected ? "A publisher SHA-256 checksum will be checked after download." : "No checksum found — the file will be marked Unverified."} Publisher signatures (GPG/Sigstore) are not checked yet.</p>
            <div className="flex gap-2">
              <Button onClick={confirm}>Allow and download</Button>
              <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">On this device</h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing downloaded yet.</p>}
          {items.map((r) => {
            const pct = r.total ? Math.min(100, Math.round((r.received / r.total) * 100)) : null;
            return (
              <div key={r.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.filename}</div>
                    <div className="text-xs text-muted-foreground">{fmt(r.received)} of {fmt(r.total)} · {r.status}</div>
                  </div>
                  {r.status === "complete" && (
                    r.verify === "verified" ? <span className="flex items-center gap-1 text-xs text-primary"><ShieldCheck className="h-4 w-4" />Checksum verified</span>
                    : r.verify === "mismatch" ? <span className="flex items-center gap-1 text-xs text-destructive"><ShieldAlert className="h-4 w-4" />Checksum mismatch</span>
                    : <span className="text-xs text-muted-foreground">Unverified</span>
                  )}
                </div>
                {r.status !== "complete" && <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct ?? 5}%` }} /></div>}
                {r.error && <p className="text-xs text-destructive">{r.error}</p>}
                {r.actualSha256 && <p className="break-all font-mono text-[10px] text-muted-foreground">sha256 {r.actualSha256}</p>}
                <div className="flex flex-wrap gap-2">
                  {r.status === "downloading" && <Button size="sm" variant="outline" onClick={() => controllers.current.get(r.id)?.abort()}><Pause className="mr-1 h-4 w-4" />Pause</Button>}
                  {(r.status === "paused" || r.status === "error" || r.status === "queued") && <Button size="sm" variant="outline" onClick={() => run(r)}><Play className="mr-1 h-4 w-4" />Resume</Button>}
                  {r.status === "complete" && <Button size="sm" onClick={() => exportFile(r)}>Save to Files</Button>}
                  <Button size="sm" variant="ghost" onClick={async () => { controllers.current.get(r.id)?.abort(); await deleteDownload(r.id); await reload(); }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
