# UI component rules (moved from root AGENTS.md)
- Keep command cursor/selection editing in a browser-safe pure module shared by the terminal and behavioral tests, so touch editing is testable without a transport.
- Preview command and key shortcuts share a confirmation path; simulated host data remains device-local and must not be interpreted as authorization or live connectivity.
- Keep decorative hive geometry in the shared HiveBackdrop and its metallic colors in global semantic tokens; use instance-unique SVG IDs so overlapping route backdrops cannot resolve each other’s definitions.
- Combs reuse the terminal's existing preview/confirmation and local shortcut storage; Demo job notices derive from terminal job states only, keeping UI completion separate from real host execution or push delivery.
- Demo connection helpers must return a Demo-specific state, never a connected state; native acceptance requires independent authenticated host evidence.
