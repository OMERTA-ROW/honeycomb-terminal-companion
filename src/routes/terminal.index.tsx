import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LinkedMacs } from "@/components/LinkedMacs";
import { useAccountUser } from "@/hooks/use-account-user";
import { liveUrl, loadComputers, normalizeAddress, removeComputer, saveComputer, type MacLink } from "@/lib/mac-link";
export const Route = createFileRoute("/terminal/")({
  validateSearch: z.object({ add: z.string().optional(), name: z.string().optional() }),
  head: () => ({ meta: [{ title: "Mac terminal — Honeycomb" }] }),
  component: MacTerminal,
});
function MacTerminal() {
  const { user, ready } = useAccountUser(),
    search = Route.useSearch();
  const [computers, setComputers] = useState<MacLink[]>([]),
    [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState(search.add ?? ""),
    [name, setName] = useState(search.name ?? "My Mac");
  const [adding, setAdding] = useState(Boolean(search.add));
  useEffect(() => {
    if (ready) {
      setComputers(user ? loadComputers(user.id) : []);
      setLoaded(true);
    }
  }, [ready, user?.id]);
  const clean = normalizeAddress(address);
  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <Link to="/dashboard" className="text-sm font-semibold text-primary">
          Honeycomb
        </Link>
        <span className="text-xs text-muted-foreground">Mac terminal</span>
        <Link to="/dashboard" className="text-xs underline">
          Dashboard
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-10">
        {!ready || !loaded ? (
          <p role="status">Checking account…</p>
        ) : !user ? (
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold">Your Mac, here.</h1>
            <p className="text-sm text-muted-foreground">Sign in to open your private terminal.</p>
            <Button asChild>
              <Link to="/account" search={{ redirect: "/terminal" }}>
                Sign in
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">Open your Mac terminal</h1>
            <p className="mt-3 text-sm text-muted-foreground">Choose your Mac. Its shell opens in this screen.</p>
            <ul className="mt-6 space-y-3">
              {computers.map((c) => (
                <li key={c.address} className="rounded-xl border border-border p-4">
                  <a href={liveUrl(c.address)} className="block">
                    <span className="block font-medium text-primary">{c.name} →</span>
                    <span className="mt-1 block break-all text-xs text-muted-foreground">{c.address}</span>
                  </a>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Access verified when opened</span>
                    <button
                      className="text-xs underline"
                      onClick={() => setComputers(removeComputer(user.id, c.address))}
                    >
                      Remove shortcut
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {!computers.length || adding ? (
              <form
                className="mt-5 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!clean) return;
                  setComputers(
                    saveComputer(user.id, { address: clean, name: name.trim() || "My Mac", savedAt: Date.now() }),
                  );
                  window.location.assign(liveUrl(clean));
                }}
              >
                <label className="block text-sm">
                  Computer name
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-card p-3"
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Mac address
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-card p-3"
                    value={address}
                    placeholder="https://computer.tailnet.ts.net"
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                {address && !clean && (
                  <p role="alert" className="text-xs text-warning">
                    Enter a private IPv4 address and port, or your Tailscale HTTPS hostname. No passwords, codes or
                    extra paths.
                  </p>
                )}
                <Button className="w-full" disabled={!clean} type="submit">
                  Open Mac terminal
                </Button>
              </form>
            ) : (
              <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>
                Add Mac address
              </Button>
            )}
            <details className="mt-7 border-t border-border pt-4">
              <summary className="cursor-pointer text-sm">Connection help</summary>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Start the installed Honeycomb helper on your Mac and keep its window open.</li>
                <li>
                  Use the private address it shows. For Tailscale, both devices must be on your authorized private
                  network.
                </li>
                <li>
                  For a new browser, type code in the helper, enter the 8-character code within two minutes, and approve
                  that device on the Mac.
                </li>
                <li>
                  After a helper restart or 12-hour session expiry, pair again. Account linking is separate and normally
                  needed only once.
                </li>
              </ol>
              <a href="/downloads/honeycomb-companion-mac.zip" download className="mt-3 block text-xs underline">
                Download helper if not installed
              </a>
            </details>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">Account-linked Macs</summary>
              <div className="mt-3">
                <LinkedMacs key={user.id} />
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
