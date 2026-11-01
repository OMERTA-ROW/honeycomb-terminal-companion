import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { BUILD_ID, subscribePwa, reloadWithUpdate } from "@/lib/pwa";
import { useAccountUser } from "@/hooks/use-account-user";
import { companionReadiness } from "@/lib/companion.functions";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install & updates — Honeycomb Terminal" },
      {
        name: "description",
        content: "Add the Honeycomb Terminal preview to your Home Screen and manage app updates.",
      },
      { property: "og:title", content: "Install & updates — Honeycomb Terminal" },
      {
        property: "og:description",
        content: "Add the Honeycomb Terminal preview to your Home Screen and manage app updates.",
      },
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
    setCompanion(null);
    setAccessError(false);
    if (user)
      void loadReadiness()
        .then((r) => {
          if (alive) setCompanion(r);
        })
        .catch(() => {
          if (alive) setAccessError(true);
        });
    return () => {
      alive = false;
    };
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
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true,
    );
    const on = () => setOnline(true),
      off = () => setOnline(false);
    const bip = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIP);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", bip);
    const unsub = subscribePwa(setSw);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", bip);
      unsub();
    };
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-2">Install & updates</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Install Honeycomb on this device. Mac shell access uses the separately approved Mac helper.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-4 space-y-2">
          <h2 className="font-medium text-primary">Status</h2>
          <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Build</dt>
            <dd className="font-mono break-all">{BUILD_ID}</dd>
            <dt className="text-muted-foreground">Network</dt>
            <dd>
              {online
                ? "Online"
                : "Offline — only the cached app frame works; sign-in, transfers and data need a connection."}
            </dd>
            <dt className="text-muted-foreground">Opened as</dt>
            <dd>{standalone ? "Installed app" : "Browser tab"}</dd>
            <dt className="text-muted-foreground">Offline support</dt>
            <dd>{sw.registered ? "Active (app frame only)" : `Off — ${sw.reason ?? "checking…"}`}</dd>
          </dl>
          {sw.waiting ? (
            <div className="border border-primary/50 rounded-md p-3 text-sm space-y-2">
              <p>An update is ready. Reloading may discard unsaved typing. Finish what you're doing first.</p>
              <Button onClick={() => void reloadWithUpdate()}>Reload to update</Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No update waiting. Updates never reload on their own.</p>
          )}
        </section>
        <section className="rounded-md border border-border bg-card p-4 space-y-2 text-sm">
          <h2 className="font-medium text-primary">Add to Home Screen</h2>
          {plat === "ios" && (
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
              <li>Open this page in Safari (in Chrome on iOS use the Share button too).</li>
              <li>Tap Share (square with arrow), scroll, tap “Add to Home Screen”.</li>
              <li>Turn on “Open as Web App” if shown, then tap Add.</li>
              <li>Open Honeycomb from the new icon. For the live Mac page, repeat these steps on that page.</li>
            </ol>
          )}
          {plat !== "ios" &&
            (prompt ? (
              <Button
                onClick={async () => {
                  await prompt.prompt();
                  setOutcome((await prompt.userChoice).outcome);
                  setPrompt(null);
                }}
              >
                Install Honeycomb
              </Button>
            ) : (
              <p className="text-muted-foreground">
                {standalone
                  ? "Already installed."
                  : "Your browser hasn't offered installation here. In Chrome or Edge use the install icon in the address bar or menu → Install app. Installation needs the published address; the editor preview can't install."}
              </p>
            ))}
          {outcome && <p className="text-xs">Install prompt result: {outcome}</p>}
        </section>
        <section className="rounded-md border border-border bg-card p-4 space-y-2 text-sm md:col-span-2">
          <h2 className="font-medium text-primary">Mac companion download</h2>
          <p>
            <strong>Unsigned test build</strong> — not an installer, not notarized. A small zip folder (about 20 KB)
            with a double-click starter. Works on Apple silicon and Intel Macs with macOS’s own Python.
          </p>
          <Button asChild>
            <a href="/downloads/honeycomb-companion-mac.zip" download="honeycomb-companion-mac.zip">
              Download for Mac (.zip)
            </a>
          </Button>
          <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
            <li>Open Downloads and double-click the zip. A folder “Honeycomb-Companion-Mac” appears.</li>
            <li>
              Control-click <strong>Start Honeycomb.command</strong> → Open → Open (macOS blocks unsigned files on a
              normal double-click).
            </li>
            <li>If asked to install Command Line Tools, accept, then open it again.</li>
            <li>Type ALLOW LAN TERMINAL. The window shows an address, a fingerprint and a code.</li>
            <li>
              On your iPad or iPhone (same Wi-Fi), go to{" "}
              <Link to="/terminal" className="text-primary underline">
                Terminal
              </Link>{" "}
              and enter that address.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            The .pyz file inside is the program itself; double-clicking it alone won’t start anything. Same Wi-Fi only;
            no internet access to your Mac. Windows/Linux builds and native iPhone/iPad apps don’t exist.
          </p>
          <h3 className="font-medium pt-3">Private companion acceptance</h3>
          {!ready ? (
            <p>Checking account…</p>
          ) : !user ? (
            <Button asChild variant="outline">
              <Link to="/account" search={{ redirect: "/install" }}>
                Sign in to check private readiness
              </Link>
            </Button>
          ) : accessError ? (
            <p role="alert" className="text-warning">
              Private readiness unavailable. An active invited membership is required; check your account.
            </p>
          ) : !companion ? (
            <p>Checking private access…</p>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-[auto_1fr]" aria-label="Private companion readiness">
              <dt>Execution</dt>
              <dd className="text-warning">Blocked — no command can run from this page</dd>
              <dt>Source</dt>
              <dd>{companion.source}</dd>
              <dt>Host registration</dt>
              <dd>{companion.enrollment}</dd>
              <dt>Remote connection</dt>
              <dd>{companion.relay}</dd>
              <dt>Reconnect</dt>
              <dd>{companion.persistence}</dd>
            </dl>
          )}
          <p className="text-muted-foreground">
            Owner Mac preparation: macOS Python 3.9 or later and a normal non-admin account. The download above starts
            the same-Wi-Fi live mode; it listens only on your home-network address after your consent. Real mobile
            pairing, host approval and reconnect acceptance are still pending.
          </p>
          <h3 className="font-medium pt-3">Local Mac tools · source only</h3>
          <dl className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <dt>Desktop workspace</dt>
            <dd>
              Opt-in dedicated folder with Projects, Exports and Session logs. Local console only; no automatic sync.
            </dd>
            <dt>Storage review</dt>
            <dd>
              Consent-only exact-duplicate check of workspace exports. Selected copies can move to review and be
              restored; no permanent deletion or claimed space recovery.
            </dd>
            <dt>VS Code</dt>
            <dd>
              Installed local editor can receive the approved workspace after console consent. Remote editor adapter
              remains disconnected.
            </dd>
            <dt>Biometrics</dt>
            <dd>
              Honeycomb biometric sign-in is unavailable. Google or your device may use its own verification; that does
              not grant Terminal membership.
            </dd>
          </dl>
          <h3 className="font-medium pt-3">Acceptance gates</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Local shell and encrypted-frame tests: Linux sandbox evidence only; Mac test pending.</li>
            <li>Remote pairing, cellular-to-Mac shell, disconnect/resume and live revocation: blocked.</li>
            <li>iPhone/iPad installation, clipboard and physical keyboard: not tested on hardware.</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline">
              <Link to="/transfer">Selected-file devices & pairing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/workspace">Browser workspace</Link>
            </Button>
          </div>
          <Button asChild variant="link">
            <Link to="/instructions">Connection and keyboard instructions</Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
