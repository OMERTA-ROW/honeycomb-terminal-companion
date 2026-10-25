import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Monitor, Link2, ListChecks, BookOpen, ShieldCheck, Files } from "lucide-react";
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
        Terminal, host pairing and jobs are simulated. File transfer uses actual selected bytes between authenticated browser devices; no remote shell executes.
      </div>
      <div className="window-body relative z-10">
        <nav className="window-sidebar" aria-label="Main navigation">
          {([
            ["/", "Computers", Monitor],
            ["/pair", "Pair", Link2],
            ["/jobs", "Jobs", ListChecks],
            ["/transfer", "File transfer", Files],
            ["/device-care", "Device care", ShieldCheck],
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
