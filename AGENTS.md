<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep command cursor/selection editing in a browser-safe pure module shared by the terminal and behavioral tests, so touch editing is testable without a transport.
- Preview command and key shortcuts share a confirmation path; simulated host data remains device-local and must not be interpreted as authorization or live connectivity.
- Keep canonical requirements, requirement gaps, verification evidence and future native implementation gates in docs; proposed native choices are not implemented architecture.

- Keep decorative hive geometry in the shared HiveBackdrop and its metallic colors in global semantic tokens; use instance-unique SVG IDs so overlapping route backdrops cannot resolve each other’s definitions.
- Keep the branded window frame and destination navigation (Terminal first) and site search in AppShell, sourced from src/lib/destinations.ts, including active terminal sessions; adapt the inset sidebar into a compact navigation row on phones without changing destinations.
- Selected-file transfer uses authenticated server functions plus service-only atomic Guardian database operations; ordinary clients have no direct data permissions, so device signatures, one-use proofs and scoped grants cannot be bypassed through the Data API.
- Browser device identity uses non-exportable IndexedDB WebCrypto keys, and relay chunks are private database bytes; this enables revocation checks on every chunk without public or signed download URLs, but is not hardware-backed or end-to-end encryption.
- Editor handoff contracts stay client-safe and separate from transport; UI uses no simulated hosts as authorization and cannot launch host/editor links until a verified adapter exists, preventing preview capabilities from becoming access grants.
- Combs reuse the terminal's existing preview/confirmation and local shortcut storage; Demo job notices derive from terminal job states only, keeping UI completion separate from real host execution or push delivery.
- Demo connection helpers must return a Demo-specific state, never a connected state; native acceptance requires independent authenticated host evidence.
- Creative package previews and allowlisted handoff envelopes stay in browser-safe pure modules with account-keyed metadata-only drafts; they carry no credentials or grants and never dispatch, so recipient authorization cannot be inferred from preview selections.
- Basic profiles use owner/session RLS and signup triggers; all account and Guardian server functions compose requireActiveAccount so subsequent requests reject explicitly revoked sessions independently of provider token expiry.
- Workspace selected-file copies use account-keyed IndexedDB records, never native paths or automatic capture; header entries preserve the existing navigation destinations.
- Installable app uses public/manifest.webmanifest plus vite-plugin-pwa generateSW registered only from src/lib/pwa.ts; it caches the hashed app frame only (no HTML for account/transfer/workspace/terminal, no server calls) and never reloads without user consent, so private data and Demo output never land in caches.
- Owner bootstrap happens only after sign-in, server-side, when the provider-verified account email matches the server-only owner setting and no owner exists; public pages never show owner setup or its configuration state.
- Keep Unix PTY execution exclusively in companion/honeycomb, outside the web import graph; its network-free local acceptance adapter uses ephemeral protocol fixtures, never production account authority, because internet-reachable shells stay blocked until verified enrollment and relay exist (same-network lan-serve is the only live path).
- Keep local workspace/diagnostic/editor tools in companion/honeycomb/workspace.py behind interactive console consent; limit review to dedicated exports, preserve quarantined bytes and never treat local filesystem selection as remote authority.
- Live shell access is only the companion's lan-serve: private-IPv4 bind, TLS, one-use code plus Mac-console approval, per-frame revocation; it stays outside the web app and accounts so no hosted/public endpoint can reach a shell.
- Paste / Add File in lan-serve only saves bytes (0600, no overwrite) into ~/Honeycomb/Inbox or Mac-created subfolders; it never touches the PTY, so file transfer stays separate from execution.
