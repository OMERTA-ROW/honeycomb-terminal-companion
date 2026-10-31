import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHosts } from "@/hooks/use-hosts";
import { LinkedMacs } from "@/components/LinkedMacs";
import { SandboxTerminal } from "@/components/SandboxTerminal";
import { useAccountUser } from "@/hooks/use-account-user";
import { STATUS_INFO } from "@/lib/terminal";
import { liveUrl, loadComputers, normalizeAddress, quickStatus, removeComputer, saveComputer, terminalStep, type MacLink, type QuickStatus } from "@/lib/mac-link";

export const Route = createFileRoute("/terminal/")({
  validateSearch: z.object({ add: z.string().optional(), name: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Terminal · QuickConnect | Honeycomb Terminal" },
      { name: "description", content: "Sign in, tap your computer, and your private terminal opens." },
      { property: "og:title", content: "Honeycomb QuickConnect" },
      { property: "og:description", content: "Your approved computers, one tap to connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminalHub,
});

const STATUS: Record<QuickStatus, { label: string; tone: string }> = {
  permission: { label: "Permission needed · sign in", tone: "border-warning text-warning" },
  offline: { label: "Offline · no network", tone: "border-destructive text-destructive" },
  setup: { label: "Set up your first computer", tone: "border-primary text-primary" },
  ready: { label: "Ready to connect", tone: "border-primary text-primary" },
};

function TerminalHub() {
  const { user, ready } = useAccountUser();
  const search = Route.useSearch();
  const { hosts } = useHosts();
  const [online, setOnline] = useState(true);
  const [computers, setComputers] = useState<MacLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  useEffect(() => { if (ready) { setComputers(user ? loadComputers(user.id) : []); setLoaded(true); } }, [ready, user]);
  const step = terminalStep(ready && loaded, user?.id ?? null, computers);
  const status = quickStatus(!!user, online, computers.length);
  const prefill = search.add ? normalizeAddress(search.add) : null;
  const showSetup = step === "connect" || adding || (!!prefill && !computers.some((c) => c.address === prefill));

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Terminal</h1>
            <p className="text-xs text-muted-foreground">Honeycomb QuickConnect</p>
          </div>
          {step !== "loading" && <span role="status" className={`rounded-full border px-3 py-1 text-xs ${STATUS[status].tone}`}>{STATUS[status].label}</span>}
        </div>
        <SandboxTerminal />
        <h2 className="pt-2 font-medium text-primary">Connect Mac · optional, real shell</h2>
        {step === "loading" && <p className="text-sm text-muted-foreground">Checking your sign-in…</p>}
        {step === "signin" && (
          <section className="rounded-md border border-primary bg-card p-4 space-y-3">
            <h2 className="font-medium text-primary">Sign in to see your computers</h2>
            <p className="text-sm text-muted-foreground">Honeycomb is private and invite-only.</p>
            <Button asChild><Link to="/account" search={{ redirect: "/terminal" }}>Sign in</Link></Button>
          </section>
        )}
        {user && <LinkedMacs />}
        {user && computers.length > 0 && (
          <section aria-labelledby="mine-h" className="space-y-2">
            <h2 id="mine-h" className="font-medium text-primary">My computers</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {computers.map((c) => (
                <li key={c.address} className="rounded-md border border-primary bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Live · same Wi-Fi · added {new Date(c.savedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {online
                    ? <Button asChild size="lg" className="w-full"><a href={liveUrl(c.address)} target="_blank" rel="noopener noreferrer">Connect</a></Button>
                    : <Button size="lg" className="w-full" disabled>Offline — join Wi-Fi first</Button>}
                  <div className="flex justify-between gap-2">
                    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Advanced</summary>Address {c.address} · encrypted (TLS) · this device's access is approved and revoked on the Mac.</details>
                    <Button variant="outline" size="sm" aria-label={`Remove ${c.name}`} onClick={() => setComputers(removeComputer(user.id, c.address))}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">The terminal shows Searching, Pairing, Connected, Offline or Permission needed. To fully revoke a phone, type <code>devices</code> then <code>revoke</code> in the Mac's Honeycomb window. Paste / Add File on the terminal saves files to the Mac and never runs them.</p>
            {!showSetup && <Button variant="outline" onClick={() => setAdding(true)}>Add another computer</Button>}
          </section>
        )}
        {user && showSetup && (
          <ConnectMac key={prefill ?? "new"} prefill={prefill} prefillName={search.name}
            onSaved={(l) => { setComputers(saveComputer(user.id, l)); setAdding(false); }} />
        )}
        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium text-warning">Demo · simulated, nothing runs</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {hosts.map((h) => (
              <li key={h.id} className="rounded border border-border p-3 text-sm">
                <div className="flex justify-between gap-2"><span>{h.name}</span><span className="text-xs text-muted-foreground">Demo · {STATUS_INFO[h.status].label}</span></div>
                {STATUS_INFO[h.status].canOpen
                  ? <Link to="/terminal/$hostId" params={{ hostId: h.id }} className="text-primary underline text-xs">Open Demo session</Link>
                  : <p className="text-xs text-muted-foreground">{STATUS_INFO[h.status].next}</p>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </AppShell>
  );
}

function ConnectMac({ prefill, prefillName, onSaved }: { prefill: string | null; prefillName: string | undefined; onSaved: (l: MacLink) => void }) {
  const [address, setAddress] = useState(prefill ?? "");
  const [name, setName] = useState((prefillName ?? "My Mac").slice(0, 40));
  const clean = normalizeAddress(address);
  return (
    <section className="rounded-md border border-primary bg-card p-4 space-y-4" aria-labelledby="connect-h">
      <h2 id="connect-h" className="font-medium text-primary">Connect a computer · one time</h2>
      <ol className="space-y-3 text-sm">
        <li><strong className="text-primary">1. On your Mac, once:</strong> a browser can't open a Mac terminal by itself, so the Mac needs the small Honeycomb app.{" "}
          <a href="/downloads/honeycomb-companion-mac.zip" download className="text-primary underline">Download for Mac</a>, unzip, Control-click “Start Honeycomb” → Open. It's an unsigned test build, so macOS asks once.</li>
        <li><strong className="text-primary">2. {prefill ? "Computer found from your Mac's link" : "Enter the address"}</strong>{prefill ? "." : " your Mac's Honeycomb window shows."}</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Computer name" className="max-w-[12rem]" value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="Mac address" className="max-w-xs" placeholder="192.168.1.20:8765" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      {address && !clean && <p className="text-xs text-warning">Use the private address printed on the Mac (starts 192.168, 10. or 172.16–31).</p>}
      <p className="text-sm"><strong className="text-primary">3. Approve:</strong> enter the short code from the Mac window, then type approve on the Mac. Next time, just tap Connect.</p>
      {clean
        ? <Button asChild size="lg"><a href={liveUrl(clean)} target="_blank" rel="noopener noreferrer" onClick={() => onSaved({ address: clean, name: name.trim() || "My Mac", savedAt: Date.now() })}>Connect</a></Button>
        : <Button size="lg" disabled>Connect</Button>}
      <p className="text-xs text-muted-foreground">Mac is the first supported computer; Linux, Windows and cloud computers are planned. Same Wi-Fi only for now — cellular needs a private relay that isn't set up, and Bluetooth isn't available in iPhone/iPad browsers. <Link to="/install" className="text-primary underline">Troubleshooting</Link></p>
    </section>
  );
}
