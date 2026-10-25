import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Monitor, Moon, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useHosts } from "@/hooks/use-hosts";
import { SAMPLE_HOSTS, STATUS_INFO } from "@/lib/terminal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paired computers — Honeycomb Terminal" },
      { name: "description", content: "Open your paired computer's shell from iPad or phone. Prototype preview." },
      { property: "og:title", content: "Honeycomb Terminal" },
      { property: "og:description", content: "Remote terminal for your own computers, from iPad or phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { hosts, save } = useHosts();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState("studio-mac");
  const selected = hosts.find((h) => h.id === selectedId) ?? hosts[0];
  return (
    <AppShell>
      <div className="flex items-end flex-wrap justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Your hive</h1>
          <p className="text-muted-foreground text-sm mt-1">Demo computers · simulated availability. No real companion is connected.</p>
        </div>
        <Button asChild><Link to="/pair">Pair a computer · Demo</Link></Button>
      </div>
      <ul className="computer-hive" aria-label="Demo paired computers">
        {hosts.map((h) => {
          const info = STATUS_INFO[h.status];
          return (
            <li key={h.id} data-testid={`host-${h.id}`}>
              <Button variant="ghost" className={`computer-cell ${h.status === "online" ? "computer-cell-online" : "computer-cell-dim"}`} aria-label={`${h.name} · ${info.label} · Demo${info.canOpen ? " · Open shell" : " · View status"}`} onClick={() => { setSelectedId(h.id); if (info.canOpen) void navigate({to:"/terminal/$hostId",params:{hostId:h.id}}); }}>
                <svg viewBox="0 0 200 174" aria-hidden="true" className="computer-cell-outline"><polygon points="50,3 150,3 197,87 150,171 50,171 3,87" /></svg>
                <span className="computer-cell-content">
                  {h.status === "asleep" ? <Moon aria-hidden="true"/> : h.status === "offline" ? <WifiOff aria-hidden="true"/> : h.status === "permission" || h.status === "revoked" ? <ShieldAlert aria-hidden="true"/> : <Monitor aria-hidden="true"/>}
                  <span className="text-sm font-medium">{h.name.replace(/ \((sample|simulated)\)$/, "")}</span>
                  <span className="text-xs">{info.label}</span>
                  <span className="text-xs text-muted-foreground">{h.os} · Demo</span>
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
      {selected && <section aria-label="Selected Demo computer details" className="mt-6 border-t pt-4">
        <h2 className="font-medium">{selected.name} · Demo</h2>
        <p className="text-xs text-muted-foreground mt-1">{selected.os} · last seen {selected.lastSeen} · {STATUS_INFO[selected.status].label} (simulated)</p>
        <p className="text-sm text-muted-foreground mt-2">{STATUS_INFO[selected.status].next}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_INFO[selected.status].canOpen ? <Button asChild><Link to="/terminal/$hostId" params={{hostId:selected.id}}>Open shell · Demo</Link></Button> : <Button variant="outline" disabled>Unavailable</Button>}
          {selected.status !== "revoked" && <Button variant="outline" className="text-destructive" onClick={() => confirm(`Revoke Demo access to ${selected.name}? Real transfer devices are unaffected.`) && save(hosts.map(h => h.id === selected.id ? {...h,status:"revoked"} : h))}>Revoke Demo host</Button>}
        </div>
      </section>}
      <Button variant="outline" onClick={() => save(SAMPLE_HOSTS)} className="mt-6 text-xs text-muted-foreground">Reset sample computers · Demo</Button>
    </AppShell>
  );
}
