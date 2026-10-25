# Honeycomb Terminal — Product Specification

Source: owner brief and complete owner-copied canonical Notion plan, supplied Oct 24 2026 (fetch timestamp 2026-10-24T19:26:56.132Z). Canonical reference: https://app.notion.com/p/403c1161030681c98771c23caa433198. Reconciliation uses the supplied text, not access to the private link. Requirement-by-requirement comparison: `GAP_CHECKLIST.md`; next native work: `IMPLEMENTATION_PLAN.md`; actual preview checks: `VERIFICATION.md`.

## Product identity
- Separate product from Honeycomb Vault, Omni and Evolution.
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
