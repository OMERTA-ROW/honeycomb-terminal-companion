import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/connectors")({ component: Connectors });
function Connectors() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-semibold">Agents & web</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "AI questions",
              text: "Use OpenAI, Claude, Gemini or your configured Perplexity connection. Configuration and actual replies are shown separately.",
              to: "/dashboard" as const,
              action: "Open agent desk",
            },
            {
              title: "Coding agents",
              text: "Codex and Claude Code run in your real Mac shell. Open your Mac, choose a project folder, and use the installed CLI there.",
              to: "/terminal" as const,
              action: "Open Mac terminal",
            },
            {
              title: "Web workspace",
              text: "Open websites in their own tabs and sign in directly. Website automation needs a supported integration and separate approval.",
              to: "/dashboard" as const,
              action: "Open web workspace",
            },
            {
              title: "Account & access",
              text: "Manage your Honeycomb session. Mac device approval and provider sign-in remain separate.",
              to: "/account" as const,
              action: "Manage account",
            },
          ].map((x) => (
            <section key={x.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-medium text-primary">{x.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{x.text}</p>
              <Button asChild variant="outline" className="mt-5">
                <Link to={x.to}>{x.action}</Link>
              </Button>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
