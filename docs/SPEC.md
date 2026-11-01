# Honeycomb Terminal — Product Specification

## Current repair override — 2026-11-01
Existing private TLS Mac companion, account-link source and browser sandbox remain separate. Pairing/reconnect/heartbeat and first-use Inbox defects repaired; exact files, tests and physical acceptance are in `CONNECTION_REPAIR_2026-11-01.md`. Explicit existing tailnet IPv4 selection retains TLS and Mac approval; no public relay or automatic Tailscale setup. Historical blocked/skeleton statements below are not current implementation evidence. No installed companion was reset or app publicly deployed.

## Current override — private companion acceptance, 2026-10-31
Latest remaining-update scope: local console now supports explicit dedicated desktop
workspace creation/open, export-only consent diagnostics, reversible exact-duplicate
quarantine/restore and installed local VS Code open requests. These are not remote
adapters, account authority or whole-disk cleanup. Biometric sign-in remains
unsupported by the configured managed provider; native unlock is not implemented.
Current evidence and owner pass/fail checklist: `COMPANION_ACCEPTANCE.md`.

Owner now authorizes genuine Mac companion development and secure remote-shell acceptance, superseding historical execution-not-authorized wording below. Network-free Python Unix PTY and scoped encrypted-frame acceptance source now exists in `companion/`; it is verified on the Linux sandbox only, not macOS. No remote relay, production enrollment, PWA shell adapter, persistent tmux supervisor or signed installer exists. Remote terminal stays Demo. Existing private invitations/owner identity and selected-file authorization remain unchanged. Follow `companion/README.md` for local installation, runnable tests, threat boundaries and physical acceptance gates. No public deployment, audience change or paid provisioning is authorized.

Source: owner brief and complete owner-copied canonical Notion plan, supplied Oct 24 2026 (fetch timestamp 2026-10-24T19:26:56.132Z). Canonical reference: https://app.notion.com/p/403c1161030681c98771c23caa433198. Reconciliation uses the supplied text, not access to the private link. Requirement-by-requirement comparison: `GAP_CHECKLIST.md`; next native work: `IMPLEMENTATION_PLAN.md`; actual preview checks: `VERIFICATION.md`.

## Product identity
- Separate product from Honeycomb Vault. Omni is now owner-authorized parent/orchestrator and future enhancement provider; Guardian enforces deterministic selected-file authorization. Evolution remains unconnected.
- Working name: Honeycomb Terminal, a simple remote terminal for iPads and phones that feels like the user's desktop terminal. Vault remains a separate, paused concept.
- No Honeycomb Vault advertising inside Terminal. Promotion is one-way (Vault → Terminal).

## Core promise
Install host companion + mobile app, sign in, approve pairing once, then tap a paired host to open/resume the real host shell with its installed tools, files and permissions. No routine IP entry or connection commands.

## Platforms
- Mobile: iOS, iPadOS, Android (responsive web prototype now; native packaging not started).
- Host companion: macOS, Windows, Linux (planned). Choose a first host platform by feasibility before claiming universal support.
- Local iPad execution and cloud compute are separate products/features — not assumed.

## Requirements
1. Paired computers screen with accurate availability (online / asleep / offline / needs permission / revoked).
2. Pairing flow: one-time owner approval on host, code confirmation.
3. Terminal screen with persistent host sessions and reconnect after network drop where supported.
4. Instructions tab with plain-language key explanations, command examples and safe tap-to-try demonstrations.
5. Keyboard accessory: Escape, Control, Tab, arrows.
6. Customizable key combinations and command shortcuts, command preview, destructive-shortcut confirmation. Regex warnings in the simulation are not a security boundary or comprehensive shell parser.
7. Touch selection, copy, paste; external keyboard support.
8. Actionable errors: asleep, offline, permission, connection. Host must be awake and reachable.
9. Security: authenticated pairing, encrypted transport, protected device keys (Secure Enclave/Keystore/TPM where supported), device revocation, computer-owner authorization mandatory. Membership never substitutes for owner authorization. Automatically establish only permitted connections after setup.
10. Advanced settings kept out of ordinary setup.
11. Updates: regular tested bug fixes and prompt security patches, staged at safe times, preserving active sessions; rollback/recovery where supported by platform distribution. No recurring automation activated.

## Extended scope (owner-authorized 2026-10-25, second Notion proposal)
Source: https://app.notion.com/p/404c1161030681eba2bed0a29e1af38d (scope text supplied by owner; private link not fetched). All 2026-10-24 canonical requirements remain applicable.

12. Execution targets are explicitly distinguished: **This device** (platform-limited local tools where the OS supports them; unavailable until implemented), **Paired computer** (authorized remote execution, beyond same-LAN use), **Hosted sandbox** (future, not provisioned, separately costed). Never imply unrestricted iOS shell/other-app access or guaranteed mobile background runtime. Persistent work belongs on the authorized execution host, not on mobile background execution.
13. Jobs workflow: typed instruction → preview of commands and scope → explicit authorization → states queued/running/waiting/failed/completed (plus cancelled) → logs, cancellation, and reconnect/result retrieval.
14. Job templates: first "run existing tests and explain failures"; next "prepare code changes in an isolated worktree/container for review".
15. GitHub coding workflows and Honeycomb Evolution code generation/editing/testing are goals. Both integrations must remain visibly unconnected until actually authenticated and verified. No Evolution endpoint may be invented; no secrets requested in chat; no paid services provisioned.
16. Permissions are scoped per repository and per job. Destructive actions, publishing/deployment, spending, and external messages each require explicit approval unless separately preauthorized.
17. Remote execution must work beyond the same LAN/Wi-Fi (authenticated, encrypted WAN transport); no blanket same-Wi-Fi constraint. Transport options and native platform gaps are documented in `IMPLEMENTATION_PLAN.md`.

## Commercial (unvalidated — no billing activated)
- Proposed $20/user/year across devices.
- Unvalidated: device limits, relay costs, payment fees, support costs, margins.
- Hosted compute and heavy relay usage require separate costing.

## Preview constraints
- Private, unpublished. No deployment, no public sharing, no subscriptions, no paid services.
- No real customer passwords, no remote host access. All hosts, pairing, terminal output labelled sample/simulated.

## Approved visual direction
Deep black background with substantial outline-only metallic gold hive cells on both edges, dimensional highlights and restrained outline glow, fading into a quiet dark center. Cell interiors remain empty black, never yellow. Fine gold panel edging and readable white text preserve existing layouts, functionality and simulation disclosures. Original reference image was not recovered from available project files, upload mounts or searchable project history during the 2026-10-25 polish; fidelity follows the owner's written direction, not a verified exact-image match.

Owner's subsequent original-mockup description specifies Terminal's left half: thin luminous rounded champagne-gold outer frame, outlined geometric honeycomb mark and wordmark/header, inset dark sidebar with gold line icons and outlined active destination, substantial interlocking outlined hive cells and selective bright junctions behind the shell/sidebar. The described refinement is implemented using real SVG/CSS UI; the claimed attachment remains absent from available upload mounts/project assets, so direct image comparison is not verified. Existing Computers, Pair, Jobs and Instructions destinations and simulated execution remain intact; no Vault functionality or encryption claims are introduced.

## Native acceptance tests (to run once companion + transport exist)
- New user pairs an iPad or phone with a supported computer without shell setup commands or IP addresses.
- Pair new device: approve on host once; second launch opens without re-approval.
- Tap online host → real shell in user's home dir, `which git` matches host.
- Airplane mode 30 s → reconnect resumes same session (tmux-like persistence) and scrollback.
- Host sleep → status "Asleep" within 60 s; offline → "Offline"; permission revoked in OS → "Needs permission".
- Revoke device on host → mobile shows "Revoked", cannot open shell, keys deleted.
- Transport traffic is end-to-end encrypted (verified via capture); device private key non-exportable.
- External keyboard: Ctrl+C interrupts, arrows navigate history, Esc reaches vim.
- Update staged while session active does not drop session; failed update rolls back.

## Canonical next-step order and source status
Validate iPad-to-computer pairing and transport, choose the first desktop host platform, prototype the mobile keyboard and Instructions, test reconnect and security behavior, then cost the annual subscription. The copied source says no terminal app, companion, deployment, subscription or automatic update schedule had been built or activated. The current project adds only a simulated web preview, not a native terminal app or companion. Authentication, owner-authorized transport and real persistent sessions remain unimplemented. No native platform is claimed supported.

## Install-and-connect scope (added 2026-10-25, ref canonical plan 403c1161030681c98771c23caa433198)

Priority order: Mac host + iPhone/iPad first, Android phone/tablet next.

- **Pairing:** short-lived single-use code (120 s TTL in preview) with host-side confirmation; states requested / pending / confirmed / failed / expired. Preview QR is a decorative placeholder, not scannable. Fixed demo code 482617 is never a credential.
- **Test Connection:** runs a harmless command (`echo 'Honeycomb connected'`) on the paired computer and shows its output. Simulated in preview; honest denied/unreachable results for permission, revoked, asleep and offline hosts.
- **Sessions:** persistent shell sessions with disconnect/reconnect live on the authorized host; mobile background execution is never relied on. Preview simulates drop/reconnect.
- **Mac companion:** source skeleton and packaging instructions in `companion/`; no binary, installer, signing, notarization or download link exists. Blockers: no physical Mac, no Apple Developer Program membership (paid, not procured), no distribution hosting.
- **Device care (all simulated samples in preview):** authorized storage analysis (exact byte-identical duplicates kept distinct from similar photos; screenshots and unused apps listed for review; consent-gated cleanup preview preserving originals; cloud deletion propagation explained; actual recovered space reported only after a real run); Wi-Fi-only transfers by default with optional monthly cellular limit; low-overhead on-demand scans with no battery-life guarantee.
- **Security (all planned, none active, no fake metrics):** vetted malware scan integration with explicit coverage; unsafe Wi-Fi/hotspot alerts; malicious-link protection; optional VPN with honest limits (not anonymity); spam call ID/blocking via platform call-directory extensions; SMS filtering and user-initiated suspicious-message analysis. No access to end-to-end encrypted chats; no automatic replies to suspicious senders.
- **Bluetooth:** remembered pairings, multiple active connections, output switching widely supported; simultaneous dual-audio platform-dependent. Car+headphones and two-accessory tests documented for physical hardware. Honeycomb never interrupts an active call.
- **App lock:** inactivity/background lock of the Honeycomb app only — never implied to lock the whole phone; system lock-screen animation needs separate OS integration. Mechanical bees fill a honeycomb during lock, with reduced-motion mode (all-or-nothing, no animation). Trusted-device session revocation and theft response (revoke + password change); no remote wipe by default; secure recovery via re-pairing with owner approval.

## Current selected-file and creative scope supersedes simulation-only restrictions
Owner now authorizes real authenticated selected-file transfer, but not real remote terminal/creative execution or desktop installation. `/transfer` source and Guardian schema are implemented; authenticated two-client acceptance remains blocked pending first account sign-in. Historical simulation-only statements above continue to apply to terminal/host pairing/device-care, not this selected-file path. Full requirements, actual limits, architecture, acceptance and prerequisites: `TRANSFER_CREATIVE_REQUIREMENTS.md`.

Creative Unity/video and desktop-browser document-submission controls are local preview drafts only. No companion, adapter, repository access, detected tools, real diff/test/render output or execution is claimed. Transfer-first gate precedes real enhancement. No public deployment.

## Queued hive/Combs/jobs and native add-ons
Owner prioritizes hive home, saved Combs command cards and Demo job completion pass/fail notices. Simulated hosts/commands explicitly show Demo until a real companion is connected. Outbound encrypted Mac/mobile relay with device-key-bound QR and host tmux sessions is documented, not provisioned. Explain This, revocable read-only live sharing and verified Evolution CLI shortcuts remain queued; mechanical bee lock Demo remains present. Full scope/security prerequisites and acceptance: `TERMINAL_ADDONS.md`. No public share link created.

Owner reaffirmation at 21:14 UTC: Mac + iPhone/iPad remains milestone 1. Host tmux work must survive signal loss and mobile app close/lock; supported completion delivery includes pass/fail, secrets-masked authenticated logs and cancellation. These are native acceptance requirements, not working background preview features. Demo Test Connection is explicitly not acceptance; an actual paired Mac must execute the harmless command. See TERMINAL_ADDONS.md for detailed gates.

Account polish requested at 21:23 UTC is queued after this work. Reuse existing transfer auth/Guardian; do not modify Vault. Current read-only hosted settings verify Google/email enabled, signup allowed and email confirmation required; Lovable has UI but its flag was not reported. Zero accounts exist; OAuth return and two-client flow remain unverified. Future shared identity is a contract only, not existing SSO. Missing signup/recovery UI awaits the owner profile-data decision.

## Staged creative ecosystem extension — 21:54 UTC
Audio/vocal cleanup/EQ/normalization with before/after and separate export; selected video edits/cleanup/render; book manuscript/layout/cover/barcode/metadata/print-ready exports using customer-owned assigned ISBNs (no generation/publication); game code/assets/tests/build/checkpoint/review/rollback. Direct provider/model/agent choice does not confer shell access. All processing requires available authorized adapter or configured provider; none assumed connected. Versioned cross-terminal handoff revalidates Guardian scopes/recipient capabilities, never forwards credentials or grants privileges. Original files preserved. Current implementation is metadata-only local preview; full requirements and per-package/AI/handoff acceptance in CREATIVE_PACKAGES.md. Shared Honeycomb/Omni ecosystem boundary excludes Vault password/recovery flows. Transfer-first and queued account work remain unchanged.

## Honeycomb Agent Connect (future, not implemented)
See docs/AGENT_CONNECT.md. Secondary to QuickConnect acceptance; planned only.

## Platform vision (all users)
See docs/PLATFORM.md. Mac+iPad pilot first; other platforms planned.
