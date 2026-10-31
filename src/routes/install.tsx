import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { BUILD_ID, subscribePwa, reloadWithUpdate } from "@/lib/pwa";
import { useAccountUser } from '@/hooks/use-account-user';
import { companionReadiness } from '@/lib/companion.functions';

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install & updates — Honeycomb Terminal" },
      { name: "description", content: "Add the Honeycomb Terminal preview to your Home Screen and manage app updates." },
      { property: "og:title", content: "Install & updates — Honeycomb Terminal" },
      { property: "og:description", content: "Add the Honeycomb Terminal preview to your Home Screen and manage app updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Install,
});

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function platform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function Install() {
  const { user, ready } = useAccountUser();
  const loadReadiness = useServerFn(companionReadiness);
  const [companion, setCompanion] = useState<Awaited<ReturnType<typeof companionReadiness>> | null>(null);
  const [accessError, setAccessError] = useState(false);
  useEffect(() => {
    let alive = true;
    setCompanion(null); setAccessError(false);
    if (user) void loadReadiness().then(r => { if (alive) setCompanion(r); }).catch(() => { if (alive) setAccessError(true); });
    return () => { alive = false; };
  }, [user?.id]);
  const [plat, setPlat] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [prompt, setPrompt] = useState<BIP | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [sw, setSw] = useState({ waiting: false, reason: null as string | null, registered: false });

  useEffect(() => {
    setPlat(platform());
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    const on = () => setOnline(true), off = () => setOnline(false);
    const bip = (e: Event) => { e.preventDefault(); setPrompt(e as BIP); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    const unsub = subscribePwa(setSw);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("beforeinstallprompt", bip); unsub(); };
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-2">Install & updates</h1>
      <p className="text-sm text-muted-foreground mb-6">This installs the web preview only. It is not a native app or companion, and it does not give your phone a real shell or pairing — hosts and commands stay Demo.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <h2 className="font-medium text-primary">Status</h2>
          <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Build</dt><dd className="font-mono break-all">{BUILD_ID}</dd>
            <dt className="text-muted-foreground">Network</dt><dd>{online ? "Online" : "Offline — only the cached app frame works; sign-in, transfers and data need a connection."}</dd>
            <dt className="text-muted-foreground">Opened as</dt><dd>{standalone ? "Installed app" : "Browser tab"}</dd>
            <dt className="text-muted-foreground">Offline support</dt><dd>{sw.registered ? "Active (app frame only)" : `Off — ${sw.reason ?? "checking…"}`}</dd>
          </dl>
          {sw.waiting ? (
            <div className="border border-primary/50 rounded-md p-3 text-sm space-y-2">
              <p>An update is ready. Reloading discards unsaved typing and resets Demo terminal screens. Finish what you're doing first.</p>
              <Button onClick={() => void reloadWithUpdate()}>Reload to update</Button>
            </div>
          ) : <p className="text-xs text-muted-foreground">No update waiting. Updates never reload on their own.</p>}
        </section>
        <section className="rounded-md border border-border bg-card p-4 space-y-2 text-sm">
          <h2 className="font-medium text-primary">Add to Home Screen</h2>
          {plat === "ios" && <ol className="list-decimal pl-4 space-y-1 text-muted-foreground"><li>Open this page in Safari.</li><li>Tap Share, then “Add to Home Screen”.</li><li>Tap Add. iOS will not group or arrange icons into folders for you.</li></ol>}
          {plat !== "ios" && (prompt ? (
            <Button onClick={async () => { await prompt.prompt(); setOutcome((await prompt.userChoice).outcome); setPrompt(null); }}>Install Honeycomb</Button>
          ) : <p className="text-muted-foreground">{standalone ? "Already installed." : "Your browser hasn't offered installation here. In Chrome or Edge use the install icon in the address bar or menu → Install app. Installation needs the published address; the editor preview can't install."}</p>)}
          {outcome && <p className="text-xs">Install prompt result: {outcome}</p>}
        </section>
        <section className="rounded-md border border-border bg-card p-4 space-y-2 text-sm md:col-span-2">
          <h2 className="font-medium text-primary">Native downloads</h2>
          <p className="text-muted-foreground">No signed installers exist. The companion now has runnable local console source and isolated encryption tests, but no account enrollment or remote connection. It does not connect your iPad to your Mac. Windows/Linux releases and native mobile apps remain unavailable.</p>
          <h3 className="font-medium pt-3">Private companion acceptance</h3>
          {!ready ? <p>Checking account…</p> : !user ? <Button asChild variant="outline"><Link to="/account" search={{ redirect: '/install' }}>Sign in to check private readiness</Link></Button>
            : accessError ? <p role="alert" className="text-warning">Private readiness unavailable. An active invited membership is required; check your account.</p>
              : !companion ? <p>Checking private access…</p> : <dl className="grid gap-2 sm:grid-cols-[auto_1fr]" aria-label="Private companion readiness">
                <dt>Execution</dt><dd className="text-warning">Blocked — no command can run from this page</dd>
                <dt>Source</dt><dd>{companion.source}</dd><dt>Host registration</dt><dd>{companion.enrollment}</dd>
                <dt>Remote connection</dt><dd>{companion.relay}</dd><dt>Reconnect</dt><dd>{companion.persistence}</dd>
              </dl>}
          <p className="text-muted-foreground">Owner Mac preparation: Python 3.11 or later, a normal non-root account, and the project source. Follow companion/README.md for the local-only acceptance commands. No ports are opened. Real mobile pairing, host approval and reconnect acceptance are still pending.</p>
          <Button asChild variant="link"><Link to="/instructions">Connection and keyboard instructions</Link></Button>
        </section>
      </div>
    </AppShell>
  );
}
