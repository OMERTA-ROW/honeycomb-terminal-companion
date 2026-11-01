import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/instructions")({ component: Instructions });
function Instructions() {
  return (
    <AppShell>
      <article className="max-w-2xl space-y-5">
        <h1 className="text-2xl font-semibold">Using Honeycomb</h1>
        <section>
          <h2 className="font-medium text-primary">Open your Mac</h2>
          <p className="mt-2 text-sm leading-6">
            Keep the Honeycomb helper running on your Mac. Open Mac terminal, enter the private address it shows, and
            approve this browser using a fresh eight-character code. Your account link is separate and normally needed
            only once.
          </p>
          <Link to="/terminal" className="mt-2 block text-sm underline">
            Open Mac terminal
          </Link>
        </section>
        <section>
          <h2 className="font-medium text-primary">One terminal screen</h2>
          <p className="mt-2 text-sm leading-6">
            Type in the command field and press Enter or Send. Use the key row for control keys. Tools contains copy,
            paste, connection testing and unpairing. Files saves selected bytes to the Mac inbox. The current text
            renderer is best for line commands; full-screen terminal programs may not display correctly.
          </p>
        </section>
        <section>
          <h2 className="font-medium text-primary">Agents and websites</h2>
          <p className="mt-2 text-sm leading-6">
            Use the dashboard to ask configured AI models a question or open a website. AI questions use provider
            credits. Codex and Claude Code run on the paired Mac in the project folder you choose; sign in to those
            providers on the Mac. Opening a website does not give an agent permission to operate it.
          </p>
          <Link to="/dashboard" className="mt-2 block text-sm underline">
            Open dashboard
          </Link>
        </section>
        <section>
          <h2 className="font-medium text-primary">Reconnect</h2>
          <p className="mt-2 text-sm leading-6">
            A page reload can reattach to your existing shell. If the helper restarts or approval expires, pair again. A
            saved address or account heartbeat alone does not prove shell access. Keep both devices on the same private
            network or your authorized Tailscale network.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
