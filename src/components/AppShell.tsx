import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Monitor, Link2, ListChecks, BookOpen } from "lucide-react";
import { TerminalBrand } from "./TerminalBrand";
import { HiveBackdrop } from "./HiveBackdrop";

export function AppShell({ children, terminal = false }: { children: ReactNode; terminal?: boolean }) {
  return (
    <div className={`terminal-window ${terminal ? "terminal-window-session" : ""}`}>
      <HiveBackdrop contained className="z-0" />
      <header className="window-header">
        <TerminalBrand />
      </header>
      <div className="preview-disclosure relative z-10 text-warning text-center text-xs py-2 px-3">
        Prototype preview — sample computers and a simulated terminal. Nothing connects to or runs on a real computer.
      </div>
      <div className="window-body relative z-10">
        <nav className="window-sidebar" aria-label="Main navigation">
          {([
            ["/", "Computers", Monitor],
            ["/pair", "Pair", Link2],
            ["/jobs", "Jobs", ListChecks],
            ["/instructions", "Instructions", BookOpen],
          ] as const).map(([to, label, Icon]) => (
            <Link key={to} to={to} className={`sidebar-link ${terminal && to === "/" ? "sidebar-link-active" : ""}`} activeProps={{ className: "sidebar-link-active" }} activeOptions={{ exact: true }}>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.4} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <main className={terminal ? "window-main window-main-session" : "window-main"}>{children}</main>
      </div>
    </div>
  );
}
