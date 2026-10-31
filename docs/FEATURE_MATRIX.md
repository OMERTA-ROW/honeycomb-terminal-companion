# Honeycomb feature matrix — 2026-10-31

Statuses: NOT BUILT · BLOCKED · BUILT-UNVERIFIED (works in sandbox/browser tests, not on owner devices) · VERIFIED LIVE (owner device evidence) · FAILED.
Nothing is VERIFIED LIVE until the owner runs docs/COMPANION_ACCEPTANCE.md on a real Mac + iPhone/iPad.

| Page / feature | What it really does | Status | Evidence / blocker |
|---|---|---|---|
| Terminal → Browser sandbox | Real command execution (pwd, ls, cd, mkdir, touch, cat, echo >/>>, rm, history, clear, whoami, date, uname, help) on a device-local file tree; history ↑↓, new session, terminate, survives reload. Not macOS/iOS, no network | BUILT-UNVERIFIED | 7 unit tests; phone-size browser run signed out: pwd → /home/honeycomb, cd → /home/honeycomb/demo, sudo refused, reload kept session |
| Hosted server Linux sandbox | — | BLOCKED | App server runs on Cloudflare Workers (no processes). Needs an owner-approved, likely paid sandbox provider and its key |
| Native iOS shell | — | NOT SUPPORTED | iOS browsers cannot run native commands |
| Terminal → Connect Mac (helper lan-serve) | TLS, QR/code (120 s, one use), Mac approval, real PTY, reconnect, revoke, Paste/Add File | BUILT-UNVERIFIED | 57 helper tests; actual download driven by browser in sandbox; Safari cert step untested |
| Terminal → Link Mac to account | One-use 10-min code, helper `link CODE`, check-ins, Helper online/offline, account revoke disconnects phones | BUILT-UNVERIFIED | Real backend run; "Link this Mac" button needs a real sign-in (test token lacks session id) |
| Cellular / other networks | — | BLOCKED | Needs owner-approved private relay |
| Signed Mac app | — | BLOCKED | Needs paid Apple Developer ID |
| Windows / Linux helpers | Linux source runs; no installer. Windows none | NOT BUILT | After Mac proof |
| Terminal → Demo hosts (/terminal/$hostId) | Simulated sessions | Demo (labelled) | Never counted as live |
| Computers (/) | Demo host list + account readiness | Demo (labelled) | Real linked Macs are on Terminal |
| Pair (/pair) | Simulated walkthrough; fake QR removed | Demo (labelled) | Real pairing = Mac window QR |
| Jobs | Demo job states | Demo (labelled) | No host executor |
| File transfer | Authenticated device keys, one-use proofs, chunked relay, revoke | BUILT-UNVERIFIED | Earlier isolated tests; needs two real signed-in devices |
| Workspace | Selected file copies in browser storage | BUILT-UNVERIFIED | Browser tests |
| Device care | Browser storage/lock info; native cleanup only in helper with consent | BUILT-UNVERIFIED | Helper workspace tests |
| Account / Invite / Members / Reset password | Invite-only accounts, roles, session revoke | BUILT-UNVERIFIED | Isolated owner tests; no real invite sent this round |
| Install & downloads | honeycomb-companion-mac.zip, Home Screen steps | BUILT-UNVERIFIED | Zip format checked; real Mac open untested |
| Connectors (Codex, Claude Code, Gemini API/CLI, Perplexity, MCP, API, websites) | Truthful catalog; buttons disabled | NOT BUILT | Each needs adapter + owner credentials/approval; never shows Connected |
| Vault | Kept out of Terminal by owner rule | N/A | — |
