import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAccountUser } from "@/hooks/use-account-user";
import { CONNECTORS, CONNECTOR_SECRET_NOTE, STATUS_LABEL, effectiveStatus, type ConnectorGroup } from "@/lib/connectors";

export const Route = createFileRoute("/connectors")({
  head: () => ({ meta: [
    { title: "Connectors — Honeycomb Terminal" },
    { name: "description", content: "Choose AI agents, custom MCP, custom API and service integrations for Honeycomb, with truthful status." },
    { property: "og:title", content: "Connectors — Honeycomb Terminal" },
    { property: "og:description", content: "AI agent, MCP, API and service connectors with scoped permissions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Connectors,
});

const GROUPS: ConnectorGroup[] = ["AI agents", "Custom MCP", "Custom API", "Websites & services"];

function Connectors() {
  const { user, ready } = useAccountUser();
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Connectors</h1>
      <section aria-label="Connect your Mac" className="mt-4 rounded-md border border-primary p-4 space-y-2">
        <h2 className="text-lg font-medium text-primary">Want your Mac's terminal? Use QuickConnect.</h2>
        <p className="text-sm text-muted-foreground">Connecting your Mac doesn't need anything on this page. The Mac app is ready to download: start it on your Mac, then pair this device on the same Wi-Fi.</p>
        <Button asChild><Link to="/terminal">Open Terminal · Connect Mac</Link></Button>
      </section>
      <p className="text-sm text-muted-foreground mt-4">The items below are planned add-ons for AI agents and services. None are connected yet — each shows what's still needed.</p>
      <p className="text-sm mt-2 text-warning">{CONNECTOR_SECRET_NOTE}</p>
      {!ready ? <p className="mt-4">Checking account…</p> : !user ? (
        <Button asChild className="mt-4"><Link to="/account">Sign in to manage your connectors</Link></Button>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Connections will belong only to your account; other members can't see or use them.</p>
      )}
      {GROUPS.map((g) => (
        <section key={g} className="mt-6" aria-label={g}>
          <h2 className="text-lg font-medium text-primary">{g}</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {CONNECTORS.filter((c) => c.group === g).map((c) => {
              const s = effectiveStatus(c);
              return (
                <li key={c.id} className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{c.name}</h3>
                    <span className="text-xs rounded border px-2 py-0.5 text-muted-foreground" aria-label={`Status: ${STATUS_LABEL[s]}`}>{STATUS_LABEL[s]}</span>
                  </div>
                  <p className="text-sm">{c.summary}</p>
                  <p className="text-xs text-warning">{c.blocker}</p>
                  <details className="text-sm">
                    <summary className="cursor-pointer">Steps & permissions</summary>
                    <ol className="list-decimal ml-5 mt-2">{c.steps.map((x) => <li key={x}>{x}</li>)}</ol>
                    <p className="mt-2 font-medium">Allowed</p><ul className="list-disc ml-5">{c.scopes.map((x) => <li key={x}>{x}</li>)}</ul>
                    <p className="mt-2 font-medium">Never</p><ul className="list-disc ml-5">{c.never.map((x) => <li key={x}>{x}</li>)}</ul>
                  </details>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" disabled title="Not available yet">Connect</Button>
                    <Button size="sm" variant="outline" disabled title="Nothing to test yet">Test connection</Button>
                    <Button size="sm" variant="outline" disabled title="Nothing connected">Disconnect</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </AppShell>
  );
}
