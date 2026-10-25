# Implementation checklist

Legend: [x] Working in preview · [~] Prototype / simulated UI · [ ] Blocked / not started

## Preview (web, responsive iPad/phone)
- [~] Paired computers list — sample hosts, simulated status (not live availability)
- [~] Pairing flow — simulated code + approval; no keys generated
- [~] Terminal screen — simulated shell; no command executes anywhere
- [~] Reconnect after drop — banner + resume message simulated; browser offline event detected
- [x] Instructions tab — key explanations, safe simulated command examples
- [x] Keyboard accessory: Esc, sticky Ctrl, Tab, arrows (↑/↓ history + draft restoration; ←/→ cursor movement + selection collapse)
- [x] Custom command and supported key-combination shortcuts — add/remove, saved on this device when storage is available
- [x] Command preview before every shortcut; destructive commands require confirmation
- [x] Copy selection / paste at cursor or replace selection; success/denial feedback (browser permission required)
- [x] External keyboard event handling: Enter, arrows, Tab, Esc, Ctrl+C/L/U; automation only, physical keyboards pending
- [x] Revoke device (sample) → host shows Revoked, shell blocked
- [x] Actionable messages for asleep / offline / permission / revoked
- [x] All sample/simulated content labelled; no Vault advertising
- [x] Phone/tablet viewport automation and screenshot inspection; physical devices not tested
- [x] Copied canonical plan reconciled requirement by requirement in GAP_CHECKLIST.md
- [x] Concrete gated companion/security/persistence plan in IMPLEMENTATION_PLAN.md; planning only
- [x] Actual checks and limitations recorded in VERIFICATION.md
- [x] Black-and-gold hive theme: near-black background, thin gold hexagon outlines on both edges fading inward, gold accents, white text
- [x] Metallic hive refinement: larger visible outline-only cells, layered gold highlights/glow, quiet black center and shared fine panel edging; automated three-size checks (original reference unavailable)
- [x] Original-mockup written direction: champagne rounded window frame, outlined brand mark, inset gold-icon navigation and bright hive junctions; phone navigation adapts to a compact row. Attachment remains unavailable for direct comparison.
- [~] Execution target selector (This device / Paired computer / Hosted sandbox) — device and sandbox honestly unavailable; host simulated
- [~] Jobs workflow — instruction → command/scope preview → authorize → queued/running/waiting/failed/completed/cancelled, logs, cancellation, device-local result retrieval; all simulated
- [~] Job templates — "run existing tests and explain failures" (read-only scope), "prepare code changes in isolated worktree for review"
- [~] GitHub and Evolution integration cards — visibly Not connected; no endpoints invented, no credentials requested

## Blocked / not started (native & backend)
- [ ] Host companion (macOS/Windows/Linux) — first-host feasibility decision pending
- [ ] Mobile packaging iOS/iPadOS/Android
- [x] Account sign-in source and Google/Lovable provider configuration for selected-file transfer (end-to-end sign-in pending owner account)
- [ ] Authenticated pairing, device key storage, encrypted transport, relay
- [ ] Real availability signal, persistent host sessions
- [ ] Update staging / rollback (no automation activated)
- [ ] Billing ($20/user/year proposed; costs unvalidated; not activated)
- [ ] Physical iPad/iPhone/Android and hardware keyboard testing — authorized test hardware needed
- [ ] Device-local tool execution (platform-limited) — iOS/Android capability spikes needed
- [ ] Hosted sandbox — not provisioned; separate costing and authorization required
- [ ] Real job runner on authorized host with authenticated result sync
- [ ] GitHub connection (owner-authorized, verified) and Evolution endpoint definition
- [ ] Authenticated encrypted WAN transport beyond same LAN

## Install-and-connect scope (2026-10-25)

- [~] QR-style pairing with requested/pending/confirmed/failed/expired states and 120 s expiry (simulated; QR is decorative placeholder)
- [~] Test Connection returning 'Honeycomb connected' (simulated; honest denied/unreachable for permission/revoked/asleep/offline)
- [~] Session drop/reconnect (simulated in terminal)
- [~] Device care page: storage, cellular & battery, security, Bluetooth, app lock (simulated samples; planned items labelled)
- [~] Bee honeycomb lock animation with reduced-motion mode
- [x] Trusted-device revocation UI and theft-response guidance (no remote wipe by default)
- [x] Mac companion source skeleton + packaging/blocker docs (companion/README.md)
- [ ] Real Mac companion binary/installer — blocked: no physical Mac, no Apple Developer membership, no signing/notarization
- [ ] Real pairing, transport, persistent sessions — blocked: native implementation not started
- [ ] Native security/Bluetooth/storage integrations — blocked: require native apps and OS entitlements

## Real selected-file milestone and creative follow-up
- [x] Implemented authenticated browser registration with device-held signing key, one-use device proofs and atomic Guardian authorization; schema/grants verified.
- [x] Implemented 120-second single-claim QR/manual code, five attempts/ten minutes, named-device approval and remembered trust.
- [x] Implemented individual file grants, private byte relay, server/browser SHA-256 checks, progress, cancel/fail/receipt and real revocation source.
- [ ] Authenticated two-client UI transfer verification — blocked: no auth user exists; owner first sign-in needed. Do not mark source as end-to-end verified.
- [ ] Two physical clients on different internet networks — blocked: authorized devices/network test required.
- [~] Creative Unity/video/browser task preview with UUID, local persistence, cancellation and proposed scope review; no dispatch or fabricated execution evidence.
- [x] Omni/Guardian project adapter/checkpoint/idempotency boundary and disposable Unity acceptance documented in TRANSFER_CREATIVE_REQUIREMENTS.md.
- [ ] Native companion/tool adapters/Omni/GitHub/browser automation — not installed/connected; no installer/artifact available.
