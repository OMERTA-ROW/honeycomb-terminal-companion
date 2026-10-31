import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHosts } from "@/hooks/use-hosts";
import { useAccountUser } from "@/hooks/use-account-user";
import { STATUS_INFO } from "@/lib/terminal";
import { forgetMacLink, liveUrl, loadMacLink, normalizeAddress, saveMacLink, terminalStep, type MacLink } from "@/lib/mac-link";

export const Route = createFileRoute("/terminal/")({
  head: () => ({
    meta: [
      { title: "Terminal — connect to your Mac | Honeycomb Terminal" },
      { name: "description", content: "Sign in, connect your Mac once, then reopen your live terminal in one tap." },
      { property: "og:title", content: "Terminal — Honeycomb Terminal" },
      { property: "og:description", content: "Private live Mac terminal on your Wi-Fi, with a separate labelled Demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminalHub,
});

function TerminalHub() {
  const { user, ready } = useAccountUser();
  const [online, setOnline] = useState(true);
  const [link, setLink] = useState<MacLink | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  useEffect(() => { if (ready) { setLink(user ? loadMacLink(user.id) : null); setLoaded(true); } }, [ready, user]);
  const step = terminalStep(ready && loaded, user?.id ?? null, link);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-primary">Terminal</h1>
          <span role="status" className={`rounded-full border px-3 py-1 text-xs ${online ? "border-primary text-primary" : "border-destructive text-destructive"}`}>
            This device: {online ? "online" : "offline — no network"}
          </span>
        </div>
        {step === "loading" && <p className="text-sm text-muted-foreground">Checking your sign-in…</p>}
        {step === "signin" && (
          <section className="rounded-md border border-primary bg-card p-4 space-y-3">
            <h2 className="font-medium text-primary">Sign in to use your terminal</h2>
            <p className="text-sm text-muted-foreground">Honeycomb is private and invite-only.</p>
            <Button asChild><Link to="/account" search={{ redirect: "/terminal" }}>Sign in</Link></Button>
          </section>
        )}
        {step === "reconnect" && link && user && (
          <Reconnect link={link} online={online} onForget={() => { forgetMacLink(user.id); setLink(null); }} />
        )}
        {step === "connect" && user && (
          <ConnectMac onSaved={(l) => { saveMacLink(user.id, l); setLink(l); }} />
        )}
        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium text-warning">Demo · simulated, nothing runs</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {useHosts().hosts.map((h) => (
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

function Reconnect({ link, online, onForget }: { link: MacLink; online: boolean; onForget: () => void }) {
  return (
    <section className="rounded-md border border-primary bg-card p-4 space-y-3" aria-labelledby="mac-h">
      <h2 id="mac-h" className="font-medium text-primary">Live · {link.name}</h2>
      <p className="text-sm text-muted-foreground">Saved {new Date(link.savedAt).toLocaleDateString()} at {link.address}. Your Mac must be awake, on the same Wi-Fi, with Honeycomb running.</p>
      {online
        ? <Button asChild size="lg"><a href={liveUrl(link.address)} target="_blank" rel="noopener noreferrer">Open live terminal</a></Button>
        : <Button size="lg" disabled>Offline — reconnect to Wi-Fi first</Button>}
      <p className="text-xs text-muted-foreground">The live page shows Connected, Reconnecting, Offline or Revoked. If the Mac revoked this device, it asks for a new code — this page cannot check that from here.</p>
      <Button variant="outline" size="sm" onClick={onForget}>Forget this Mac</Button>
    </section>
  );
}

function ConnectMac({ onSaved }: { onSaved: (l: MacLink) => void }) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("My Mac");
  const clean = normalizeAddress(address);
  return (
    <section className="rounded-md border border-primary bg-card p-4 space-y-4" aria-labelledby="connect-h">
      <h2 id="connect-h" className="font-medium text-primary">Connect Mac · one time</h2>
      <ol className="space-y-3 text-sm">
        <li><strong className="text-primary">1. On your Mac, once:</strong> a browser cannot open a Mac shell by itself, so the Mac needs the small Honeycomb app.{" "}
          <a href="/downloads/honeycomb-companion-mac.zip" download className="text-primary underline">Download for Mac</a>, unzip, Control-click “Start Honeycomb” → Open. It is an unsigned test build, so macOS asks once.</li>
        <li><strong className="text-primary">2. Type the address</strong> the Mac window shows:</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Mac address" className="max-w-xs" placeholder="192.168.1.20:8765" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input aria-label="Mac name" className="max-w-[10rem]" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {address && !clean && <p className="text-xs text-warning">Use the private address printed on the Mac (starts 192.168, 10. or 172.16–31).</p>}
      <p className="text-sm"><strong className="text-primary">3. Pair:</strong> enter the code from the Mac window, then type approve on the Mac.</p>
      {clean
        ? <Button asChild size="lg"><a href={liveUrl(clean)} target="_blank" rel="noopener noreferrer" onClick={() => onSaved({ address: clean, name: name.trim() || "My Mac", savedAt: Date.now() })}>Connect Mac</a></Button>
        : <Button size="lg" disabled>Connect Mac</Button>}
      <p className="text-xs text-muted-foreground">Same Wi-Fi only for now; cellular needs a private relay that isn't set up. <Link to="/install" className="text-primary underline">Troubleshooting</Link></p>
    </section>
  );
}
