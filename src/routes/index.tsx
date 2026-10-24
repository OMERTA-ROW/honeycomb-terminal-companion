import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useHosts } from "@/hooks/use-hosts";
import { SAMPLE_HOSTS, STATUS_INFO, type HostStatus } from "@/lib/terminal";

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

const dot: Record<HostStatus, string> = {
  online: "bg-success",
  asleep: "bg-warning",
  offline: "bg-muted-foreground",
  permission: "bg-warning",
  revoked: "bg-destructive",
};

function Index() {
  const { hosts, save } = useHosts();
  return (
    <AppShell>
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Your computers</h1>
          <p className="text-muted-foreground text-sm mt-1">Sample computers. Status shown is simulated, not live.</p>
        </div>
        <Link to="/pair" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">Pair a computer</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {hosts.map((h) => {
          const info = STATUS_INFO[h.status];
          return (
            <li key={h.id} className="rounded-xl border bg-card p-4" data-testid={`host-${h.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.os} · last seen {h.lastSeen}</div>
                </div>
                <span className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${dot[h.status]}`} />
                  {info.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{info.next}</p>
              <div className="flex gap-2 mt-4">
                {info.canOpen ? (
                  <Link to="/terminal/$hostId" params={{ hostId: h.id }} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">Open shell</Link>
                ) : (
                  <button disabled className="rounded-md bg-secondary text-muted-foreground px-3 py-1.5 text-sm">Unavailable</button>
                )}
                {h.status !== "revoked" && (
                  <button
                    onClick={() => confirm(`Revoke this device's access to ${h.name}?`) && save(hosts.map((x) => (x.id === h.id ? { ...x, status: "revoked" } : x)))}
                    className="rounded-md border px-3 py-1.5 text-sm text-destructive"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <button onClick={() => save(SAMPLE_HOSTS)} className="mt-6 text-xs text-muted-foreground underline">Reset sample computers</button>
    </AppShell>
  );
}
