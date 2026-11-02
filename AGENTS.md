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

- Keep canonical requirements, requirement gaps, verification evidence and future native implementation gates in docs; proposed native choices are not implemented architecture.

- Keep the branded window frame and destination navigation (Terminal first) and site search in AppShell, sourced from src/lib/destinations.ts, including active terminal sessions; adapt the inset sidebar into a compact navigation row on phones without changing destinations.
- Selected-file transfer uses authenticated server functions plus service-only atomic Guardian database operations; ordinary clients have no direct data permissions, so device signatures, one-use proofs and scoped grants cannot be bypassed through the Data API.
- Browser device identity uses non-exportable IndexedDB WebCrypto keys, and relay chunks are private database bytes; this enables revocation checks on every chunk without public or signed download URLs, but is not hardware-backed or end-to-end encryption.
- Editor handoff contracts stay client-safe and separate from transport; UI uses no simulated hosts as authorization and cannot launch host/editor links until a verified adapter exists, preventing preview capabilities from becoming access grants.
- Creative package previews and allowlisted handoff envelopes stay in browser-safe pure modules with account-keyed metadata-only drafts; they carry no credentials or grants and never dispatch, so recipient authorization cannot be inferred from preview selections.
- Basic profiles use owner/session RLS and signup triggers; all account and Guardian server functions compose requireActiveAccount so subsequent requests reject explicitly revoked sessions independently of provider token expiry.
- Workspace selected-file copies use account-keyed IndexedDB records, never native paths or automatic capture; header entries preserve the existing navigation destinations.
- Installable app uses public/manifest.webmanifest plus vite-plugin-pwa generateSW registered only from src/lib/pwa.ts; it caches the hashed app frame only (no HTML for account/transfer/workspace/terminal, no server calls) and never reloads without user consent, so private data and Demo output never land in caches.
- Owner bootstrap happens only after sign-in, server-side, when the provider-verified account email matches the server-only owner setting and no owner exists; public pages never show owner setup or its configuration state.
- Connectors page reads a browser-safe catalog in src/lib/connectors.ts; effectiveStatus never reports Ready/Connected without a verified adapter, and working cards deep-link to /terminal/sandbox?cmd= (prefilled, never auto-run) so the Terminal stays the integration workspace.

- Mac host enrollment: the signed-in app creates a hashed one-use code (hc_create_host_enrollment); the helper redeems it with the publishable key (hc_enroll_host) and keeps its host secret in host.json 0600; hc_host_status heartbeats revocation. Why: account-linked hosts without exposing service keys or reaching the Mac from the cloud.
- The sandbox terminal is a full-viewport xterm.js route (/terminal/sandbox) outside AppShell, loaded client-only, with input handled by the pure line discipline in src/lib/line-editor.ts feeding the pure device-local src/lib/sandbox-shell.ts (never presented as macOS/iOS/hosted); it is not a PTY. /terminal stays the optional Connect Mac page. Why: inline traditional terminal on phones/desktops without pairing, while Workers cannot host processes.
- In-terminal agent commands are parsed in src/lib/agent-commands.ts (pure) and executed only by authenticated server functions in src/lib/agent.functions.ts; CLIs never run in the browser/worker. Why: real provider calls without exposing keys or faking agents.
- Voice actions: pure intent registry in src/lib/voice-actions.ts, browser capture in src/lib/voice-client.ts, signed-in /api/transcribe route; intents execute only through existing terminal/router handlers with read vs confirm risk. Why: voice can never exceed what a tap can do and the contract ports to other projects (docs/VOICE_ACTIONS.md).
- Owner dashboard (/dashboard under the client-only _authenticated gate redirecting to /account) derives every status from server evidence via pure src/lib/feature-status.ts; why: only fresh backend proof may show Live Connected, browser sandbox is always Simulated.
- Subdirectories (e.g. companion/, src/components/) have their own AGENTS.md; read it before changing files there.
- Account host UI calls active-account server functions; async refreshes use request-sequence guards, and heartbeat freshness is shared in host-enrollment, so stale responses and convenience addresses cannot imply live shell authority.
- Downloads (/downloads, signed-in) fetch only allowlisted https hosts through the authenticated /api/download proxy (Range passthrough, every redirect re-checked) into account-keyed IndexedDB chunks via pure src/lib/downloads.ts rules; files are exported as octet-stream and never opened or run. Why: resumable, checksum-verified downloads without a terminal session or executing untrusted code.
- Dev workspace (/workspace-shell, signed-in) uses the pure adapter registry in src/lib/providers.ts; GitHub runs through validated active-account server functions with server-enforced write approval, Codex/Claude stream model replies via /api/agent-stream, and every call lands in owner-RLS hc_workspace_audit. The hosted runner stays unavailable until a real sandbox exists. Why: one workspace without pairing, while never implying CLI execution.
