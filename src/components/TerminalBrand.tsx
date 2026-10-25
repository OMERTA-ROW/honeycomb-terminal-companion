import { Link } from "@tanstack/react-router";

export function TerminalBrand() {
  return (
    <Link to="/" className="terminal-brand" aria-label="Honeycomb Terminal">
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-11 w-11 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z M32 14 47.5 23v18L32 50l-15.5-9V23Z M32 3v11M57 17.5 47.5 23M57 46.5 47.5 41M32 61V50M7 46.5 16.5 41M7 17.5 16.5 23 M32 14v18l15.5 9M32 32 16.5 41" />
      </svg>
      <span className="min-w-0"><span className="brand-wordmark">HONEYCOMB</span><span className="brand-product">TERMINAL</span></span>
    </Link>
  );
}