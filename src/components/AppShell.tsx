import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="bg-warning/15 text-warning text-center text-xs py-1.5 px-3">
        Prototype preview — sample computers and a simulated terminal. Nothing connects to or runs on a real computer.
      </div>
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="hex-badge bg-primary w-7 h-7 inline-block" />
          Honeycomb Terminal
        </Link>
        <nav className="flex gap-1 text-sm">
          {[
            ["/", "Computers"],
            ["/pair", "Pair"],
            ["/instructions", "Instructions"],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }} activeOptions={{ exact: true }}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="px-4 sm:px-8 py-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
