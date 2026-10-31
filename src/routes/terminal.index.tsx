import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHosts } from "@/hooks/use-hosts";
import { STATUS_INFO } from "@/lib/terminal";

export const Route = createFileRoute("/terminal/")({
  head: () => ({
    meta: [
      { title: "Terminal — live Mac shell or Demo | Honeycomb Terminal" },
      { name: "description", content: "Open the live Mac terminal on your local network, or a clearly labelled Demo session." },
      { property: "og:title", content: "Terminal — Honeycomb Terminal" },
      { property: "og:description", content: "Live Mac terminal on your local network, plus labelled Demo sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminalHub,
});

const ADDRESS_KEY = "honeycomb.lan.address";
const PRIVATE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/;

function TerminalHub() {
  const { hosts } = useHosts();
  const [online, setOnline] = useState(true);
  const [address, setAddress] = useState("");
  useEffect(() => {
    setOnline(navigator.onLine);
    try { setAddress(localStorage.getItem(ADDRESS_KEY) ?? ""); } catch { /* storage unavailable */ }
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);
  const clean = address.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const valid = PRIVATE.test(clean);
  const url = valid ? `https://${clean.includes(":") ? clean : `${clean}:8765`}` : "";
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-primary">Terminal</h1>
          <span role="status" className={`rounded-full border px-3 py-1 text-xs ${online ? "border-primary text-primary" : "border-destructive text-destructive"}`}>
            This device: {online ? "online" : "offline — no network"}
          </span>
        </div>
        <section className="rounded-md border border-primary bg-card p-4 space-y-3" aria-labelledby="live-h">
          <h2 id="live-h" className="font-medium text-primary">Live · your Mac on the same Wi-Fi</h2>
          <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Connection</dt><dd>Not checked from here. The live page on your Mac shows Connected, Reconnecting, Offline or Revoked.</dd>
            <dt className="text-muted-foreground">Pairing</dt><dd>Done on the live page: code from the Mac window, then approve on the Mac.</dd>
            <dt className="text-muted-foreground">Needs</dt><dd>“Start Honeycomb” running on your Mac. Different networks (cellular) are not supported yet.</dd>
          </dl>
          <label className="block text-sm" htmlFor="mac-address">Mac address shown in its Honeycomb window</label>
          <div className="flex flex-wrap gap-2">
            <Input id="mac-address" className="max-w-xs" placeholder="192.168.1.20:8765" value={address}
              onChange={(e) => { setAddress(e.target.value); try { localStorage.setItem(ADDRESS_KEY, e.target.value); } catch { /* ignore */ } }} />
            {valid ? <Button asChild><a href={url} target="_blank" rel="noopener noreferrer">Open live terminal</a></Button>
              : <Button disabled>Open live terminal</Button>}
          </div>
          {address && !valid && <p className="text-xs text-warning">Use the private address printed on the Mac (starts 192.168, 10. or 172.16–31).</p>}
          <p className="text-xs text-muted-foreground">No Mac yet? <Link to="/install" className="text-primary underline">Download the Mac companion</Link>.</p>
        </section>
        <section className="rounded-md border border-border bg-card p-4 space-y-2" aria-labelledby="demo-h">
          <h2 id="demo-h" className="font-medium text-warning">Demo · simulated, nothing runs</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {hosts.map((h) => (
              <li key={h.id} className="rounded border border-border p-3 text-sm">
                <div className="flex justify-between gap-2"><span>{h.name}</span><span className="text-xs text-muted-foreground">Demo · {STATUS_INFO[h.status].label}</span></div>
                {STATUS_INFO[h.status].canOpen
                  ? <Link to="/terminal/$hostId" params={{ hostId: h.id }} className="text-primary underline text-xs">Open Demo session</Link>
                  : <p className="text-xs text-muted-foreground">{STATUS_INFO[h.status].next}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
