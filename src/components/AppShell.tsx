import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { searchDestinations } from "@/lib/destinations";
import { Monitor, Link2, ListChecks, BookOpen, ShieldCheck, Files, Folder, UserRound, Download, SquareTerminal, Search } from "lucide-react";
import { Button } from '@/components/ui/button';
import { TerminalBrand } from "./TerminalBrand";
import { HiveBackdrop } from "./HiveBackdrop";

export function AppShell({ children, terminal = false }: { children: ReactNode; terminal?: boolean }) {
  return (
    <div className={`terminal-window ${terminal ? "terminal-window-session" : ""}`}>
      <HiveBackdrop contained className="z-0" />
      <header className="window-header flex flex-wrap items-center justify-between gap-3">
        <TerminalBrand />
        <SiteSearch />
        <div className="flex gap-2"><Button asChild variant="outline" size="icon"><Link to="/install" aria-label="Install & updates" title="Install & updates"><Download className="h-4 w-4"/></Link></Button><Button asChild variant="outline" size="icon"><Link to="/workspace" aria-label="Honeycomb workspace" title="Honeycomb workspace"><Folder className="h-4 w-4"/></Link></Button><Button asChild variant="outline" size="icon"><Link to="/account" aria-label="Your account" title="Your account"><UserRound className="h-4 w-4"/></Link></Button></div>
      </header>
      <div className="preview-disclosure relative z-10 text-warning text-center text-xs py-2 px-3">
        Items marked Demo are simulated. A live shell runs only through your Mac’s Honeycomb window on the same Wi-Fi. File transfer uses selected bytes between authenticated browser devices.
      </div>
      <div className="window-body relative z-10">
        <nav className="window-sidebar" aria-label="Main navigation">
          {([
            ["/terminal", "Terminal", SquareTerminal],
            ["/", "Computers", Monitor],
            ["/pair", "Pair", Link2],
            ["/jobs", "Jobs", ListChecks],
            ["/transfer", "File transfer", Files],
            ["/device-care", "Device care", ShieldCheck],
            ["/instructions", "Instructions", BookOpen],
          ] as const).map(([to, label, Icon]) => (
            <Link key={to} to={to} className={`sidebar-link ${terminal && to === "/terminal" ? "sidebar-link-active" : ""}`} activeProps={{ className: "sidebar-link-active" }} activeOptions={{ exact: to !== "/terminal" }}>
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

function SiteSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = searchDestinations(q);
  return (
    <div className="relative" role="search">
      <label htmlFor="site-search" className="sr-only">Search Honeycomb</label>
      <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2">
        <Search aria-hidden="true" className="h-4 w-4 text-primary" />
        <input id="site-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search (e.g. Terminal)" autoComplete="off"
          className="h-9 w-40 bg-transparent text-sm outline-none sm:w-56"
          onKeyDown={(e) => { if (e.key === "Enter" && results[0]) { navigate({ to: results[0].to }); setQ(""); } if (e.key === "Escape") setQ(""); }} />
      </div>
      {q.trim() && (
        <ul aria-label="Search results" className="absolute right-0 z-50 mt-1 w-72 rounded-md border border-primary bg-card p-1 shadow-lg">
          {results.length ? results.map((r) => (
            <li key={r.to}><Link to={r.to} onClick={() => setQ("")} className="block rounded px-3 py-2 hover:bg-muted focus:bg-muted">
              <span className="block text-sm text-primary">{r.label}</span><span className="block text-xs text-muted-foreground">{r.hint}</span>
            </Link></li>
          )) : <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
        </ul>
      )}
    </div>
  );
}
