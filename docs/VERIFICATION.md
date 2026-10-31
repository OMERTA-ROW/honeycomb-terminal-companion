# Preview verification — 2026-10-24

## Latest local companion checks — 2026-10-31
17 Python isolated companion tests pass on Linux, not macOS. A real `/bin/sh` in a disposable directory produced `Honeycomb connected`; the marker is split in input so terminal echo cannot satisfy the assertion. Encrypted in-process input/output test passes and subsequent revoked input/output is denied; no network services, production credentials/accounts or real email used. Peer pin mismatch, replay/tamper, 120-second expiry, five-attempt bound, single-use/approval reuse, account/host/session isolation and stop checked. 94 retained web tests pass before final presentation updates. Remote Mac/iPad, real account-connected transport, persistence and signed installation remain unverified and blocked. See companion/README.md.

## Scope and environment
Automated Chromium against `http://localhost:8080`, fresh isolated browser context. Desktop viewport 1280×1800; phone-size viewport 390×844; tablet-size viewport 768×1024. This is browser automation and screenshot inspection, **not** physical iPad/iPhone/Android testing, native app testing, or testing a real companion/remote shell. All commands, hosts, owner approval and reconnect results remain simulated.

## Actual browser checks
| Check | Observed result |
|---|---|
| Left/right inside `abcdef` at position 3 | Left → 2; right → 4 |
| Start/end limits and empty command | Left at 0 stays 0; right at 6 stays 6; empty stays 0 |
| Selection from 1 to 5 | Left collapses to 1; right collapses to 5 |
| Command entry | `pwd` Enter shows sample `/Users/sample`; `whoami` simulated reply |
| History and draft | ↑ recalls `whoami`, then `pwd`; further ↑ clamps; ↓ restores `draft`; further ↓ clamps |
| Keys | Tab completes `gi` to `git status`; Ctrl+U clears input; sticky Ctrl then C clears; Esc displays simulated Escape marker |
| Risky confirmation cancellation | Open Clean build then Cancel; output unchanged, nothing submitted |
| Confirmed normal shortcut | Git status preview → Run shows simulated clean working-tree reply |
| Custom key shortcut | Add `Erase line` / Ctrl+U → preview → confirm; input erased |
| Paste selected command text | Clipboard `X` replaces positions 2–4 in `abcdef` → `abXef` |
| Clipboard success/failure | Successful copy message shown; injected clipboard denial for copy/paste produces actionable messages rather than false success |
| Actual browser offline event | Input disabled; reconnect while offline refused with network message |
| Network restoration | Manual reconnect re-enables input and displays simulated resume marker; no real persistence asserted |
| Asleep/offline/permission routes | Each displays relevant next-step message; no command input |
| Sample revoke | Revoke persists on navigation; revoked host direct URL blocks command input |
| Instructions | Try `pwd` displays explicitly simulated safe demonstration |
| Phone/tablet pages | Computers, Pair, Instructions, Terminal show no document-width overflow at both sizes; risky confirmation stays within viewport |
| Screenshots | Phone computers/confirmation and tablet terminal inspected: labels visible, navigation wraps, confirmation readable, tablet accessory keys fit; phone accessory rows intentionally scroll |
| Runtime | Final complete browser run reported no page runtime errors |

The first browser attempts exposed a stale cursor ref and a paste selection/focus issue; both were patched. An intermediate layout run reached a revoked host because the automated sample-reset click preceded loaded stored state; the test was corrected to wait for loaded revoked state before reset. The final complete run passed all listed cases. Clipboard checks used granted Chromium permissions; denial was injected, not an OS permission-dialog trial. Selection was set programmatically, not by physical finger gestures. Sample revocation does not validate a real security boundary.

Browser scripts/screenshots/logs are temporary verification evidence under `/tmp/browser/terminal-checks/`, not shipped native artifacts. Relevant regressions are retained in `src/test`.

## Automated unit/component coverage
Pure command-entry tests assert interior/boundary/selection/Unicode movement, clipboard selection replacement and history clamps. Terminal rules cover all blocked statuses and simulation-only replies. Component regressions cover destructive confirmation cancellation, drop/reconnect entry gating and selection collapse. Route matching regression retained. See final test-run result below.

Final retained test run at 22:23 UTC: **4 files passed, 13 tests passed**. Component-test setup supplies jsdom's missing scroll API; command behavior is not mocked. Latest automatic preview validation at 22:23:01 UTC reported **build OK** after correcting the safe-example tuple typing. No manual production build/typecheck was run. All four content pages retain unique Honeycomb Terminal titles/descriptions, Open Graph title/description/type and Twitter card metadata; no absolute hero image exists to tag.

## Extended scope checks — 2026-10-25
Automated Chromium, phone 390×844 and desktop 1440×900, fresh contexts. All simulated.
| Check | Observed result |
|---|---|
| Jobs page renders with hive theme | Integrations, new-job form, job list visible; no overflow at either size |
| GitHub and Evolution cards | Both show "Not connected" with honest notes; no endpoints or credentials present |
| Create job: instruction → preview | Preview shows template commands, read-only scope, and approval warnings before authorization |
| Authorize → progression | Job went queued → running → Completed with simulated log lines; log viewable |
| Execution targets on terminal | "This device" and "Hosted sandbox" taps show honest unavailable notices; only Paired computer active (simulated) |
| Page errors | None on jobs or terminal at either size |

Unit coverage added: job state transitions (including terminal-state rejection and cancellation), template preview/scope honesty, destructive-instruction flagging, target availability, integrations not connected, simulated logs never claiming real execution. Final test run: **5 files, 22 tests passed**. Build reported OK after edits.

## Not checked / not claimable
- Physical touch selection, real virtual keyboards, external hardware keyboards, orientation, safe-area behavior, Safari/WebKit, Android browser/native compatibility.
- Native installation, host OS permissions, actual pairing/key protection/encryption, remote command execution, host session persistence, sleep signaling, real revocation or active-session updates.
- Proposed subscription sustainability or device/relay limits.
- Real job execution, device-local tool capability, hosted sandbox, GitHub/Evolution authentication, and WAN transport — all documented as unimplemented; the jobs/timelines shown are timers and canned text, not real work.
- Hosted preview access settings were not inspected; no deployment/public-sharing/billing/paid-service action was taken. Existing unpublished state preserved.

These require authorized hardware and implementation described in `IMPLEMENTATION_PLAN.md`.

## Metallic hive polish — 2026-10-25
- Reference search: no original image or asset pointer found in project media listings, public/src assets, available upload mounts, saved documentation/configuration references or searchable project chat history. The written owner direction guided the polish; exact original-image fidelity is unverified.
- Changed presentation: `src/components/HiveBackdrop.tsx` (larger outline geometry, metallic gradients, layered stroke glow, instance-unique SVG definitions); `src/styles.css` (deep black tokens, shared panel rim/shadow, edge widths/fade styling); `src/routes/terminal.$hostId.tsx` (confirmation/shortcut dialogs above content layers). No transport, job or command logic changed.
- Retained suite at 11:02 UTC: **5 files passed, 22 tests passed**. Automatic preview build at **2026-10-25T11:02:19Z: build OK**. No manual production build/typecheck run.
- Automated Chromium: all five content pages at desktop **1280×1800**, phone **390×844**, tablet **768×1024** (15 page/viewport checks); no document-width overflow or page runtime errors. Hive edge SVGs sized 384px/112px/230.39px respectively on both sides; terminal retains its additional foreground backdrop over its opaque base.
- On each size: entered `pwd`, observed the simulated `/Users/sample` result, opened the risky Clean build preview and cancelled it successfully. Dialog screenshots captured above terminal controls.
- Visually inspected desktop Computers/Jobs, phone Computers/risky confirmation, and tablet Terminal screenshots: clearly visible mirrored gold outlines, black empty cells, inward fade, readable content, fine panel edging and unobstructed confirmation. Evidence script, results and screenshots: `/tmp/browser/hive-polish/` (temporary sandbox evidence).
- Content-route metadata review: all five pages retain unique Honeycomb Terminal titles, descriptions, OG titles/descriptions/type and Twitter card; no absolute hero image to tag.
- Remaining uncertainty: no original reference to compare exactly; no physical devices, Safari/WebKit, formal contrast audit or native rendering tested. No publishing, access-setting changes, paid services or real connections were performed.

## Original-mockup described frame refinement — 2026-10-25
- The owner stated an original mockup was attached, but neither upload mount is available and no reference image is present in accessible project assets. A second read-only investigation confirmed this. **No actual image was inspected and no direct screenshot-to-reference comparison is claimed.** Implementation follows the detailed Terminal-left-half description. Reattachment is needed for exact fidelity comparison.
- Presentation files: `src/components/TerminalBrand.tsx` (new outlined geometric brand mark/header); `src/components/AppShell.tsx` (rounded luminous frame, original four destinations in gold-icon inset sidebar, phone nav row, shared session framing); `src/components/HiveBackdrop.tsx` (contained geometry and bright junction accents); `src/styles.css` (champagne palette, window/sidebar/session presentation); `src/routes/terminal.$hostId.tsx` (shared shell around active and blocked views). Architecture guidance and SPEC/CHECKLIST/roadmap updated. No command, host, job or security logic changed.
- Full retained suite at 11:04 UTC: **5 files, 22 tests passed**. After final active-nav/blocked-view edits, targeted terminal-controls/routing suite at 11:05 UTC: **2 files, 4 tests passed**. Automatic preview validation at **2026-10-25T11:05:35Z: build OK**; no manual production build/typecheck run.
- Chromium checks: all five pages at **1280×1800 desktop**, **768×1024 tablet**, **390×844 phone**; frame and four navigation destinations present, no horizontal document overflow or runtime errors. At every size `pwd` returned simulated `/Users/sample`, risky shortcut cancellation dismissed the dialog, simulated drop disabled input and reconnect restored it, and sidebar Jobs navigation opened Jobs.
- Final additional browser check: Computers visually active during an online terminal session; Build Box's asleep screen uses the shared frame and has no command entry. Screenshot captured and inspected.
- Screenshots visually inspected: desktop Computers/Terminal, tablet Computers, phone Terminal/confirmation, final desktop asleep state. Champagne frame and line-icon sidebar readable; shell center remains black, hive cells unfilled, phone controls remain intentionally horizontally scrollable. Evidence under `/tmp/browser/mockup-frame/`.
- Discrepancies/uncertainty: no original attachment for geometric/logo/font/proportion comparison; wordmark uses the existing font with zero tracking per project authoring constraints rather than literal spaced lettering. Existing navigation/content/simulation notices replace mockup controls; phone sidebar becomes a navigation row. No physical-device, Safari/WebKit or formal contrast testing. Project remains unpublished; no access, billing, deployment or integration changes performed.
## 2026-10-25 — install-and-connect + device-care scope

Automated: vitest 36/36 passed (6 files), including 14 new device-care tests (pairing TTL expiry, simulated payload labelling, Test Connection results per host status, storage recoverable totals excluding system, Wi-Fi-only and cellular-limit policy, bee fill progress + reduced-motion all-or-nothing). Build checked via dev server; routeTree regenerated for /device-care.

Browser checks (Playwright, Chromium): see results below this section for pairing flow (request → pending → confirm → Test Connection), device-care tabs, app-lock bee animation, phone/tablet/desktop layout.

Not verified: physical Mac/iPhone/Android, real pairing/transport, native OS integrations, Safari/WebKit, formal contrast audit. No real-device test results are claimed anywhere.

Browser results (Playwright, Chromium, 2026-10-25): pairing flow request → pending → owner approval → Test Connection shows "Honeycomb connected" (labelled simulated) at desktop 1280×1800, phone 390×844, tablet 768×1024. App-lock bee animation fills the honeycomb and reaches "Honeycomb is locked"; unlock returns. Cellular policy: unchecking Wi-Fi shows "Transfer paused — Wi-Fi only is on". Storage: consent checkbox gates Preview cleanup; result reports simulated recoverable space. Terminal Test Connection button appends the simulated echo and a simulated notice. No horizontal overflow on /, /pair, /jobs, /device-care, /instructions at any size. No console errors beyond a pre-existing code-splitting notice for the terminal route.

## Real selected-file source and creative preview — 2026-10-25
- `bunx vitest run`: 7 files, 44 tests passed at 19:37 UTC. Includes binary round-trip, corruption/truncation rejection, operation/file proof binding, unavailable creative execution and cancellation identity preservation.
- `psql -X -v ON_ERROR_STOP=1 -f src/test/guardian.integration.sql`: final run passed 15 reported scenarios, ending ROLLBACK. The sandbox role cannot invoke the service-only live RPC; tests clone actual installed table definitions into temporary tables and use the installed function body with schema qualifiers redirected to pg_temp. Tests exercise real PostgreSQL logic/bytes, **not** authenticated HTTP/browser end-to-end. No auth accounts or persistent fixtures created.
- SQL scenarios: wrong account; expired/replayed device proof; expired/replayed pairing; exact name/repeated approval; five-attempt limit; unpaired recipient; file/directional denial; intact binary transfer/receipt purge; corrupted digest; cancellation; zero-byte file; revocation; live grant denial. Initial attempts correctly encountered protected live privileges; isolated clones resolved test access without weakening production grants.
- Live schema inspection confirmed Guardian exists and pg_catalog SHA-256 exists. Live authenticated RPC execution and authenticated/anonymous chunk SELECT grants are false after explicit revokes. RLS remains enabled. No policies expose these service-only tables.
- Chromium at 1280×1800, 768×1024, 390×844: signed-out transfer page and sign-in choices render; creative draft review/save/cancel persists after reload; execution/build/render/output/apply/rollback controls disabled. No document-width overflow or page runtime errors. Screenshots inspected, hive theme retained. First script attempted controls before hydration, then passed with readiness wait. Evidence under /tmp/browser/transfer.
- Automatic validation reported build OK at 19:36:50 UTC and later entries checked before completion; no manual production build/typecheck.
- **Unverified/blocker:** zero auth users. `lovable auth-session --json` returned no-user error; no authenticated two-client UI test could run. Owner first sign-in needed. Google/Lovable providers configured, but complete OAuth return/session/transfer flow not verified. No different-network/physical iPhone/iPad/Android/Safari/hardware test.
- Installer/artifacts: no native binary, download, Unity/video/browser adapter, Omni/GitHub connection, diff/build/render artifact or real project change exists. No real remote execution or publication was performed.
- Changed source: transfer route; transfer.functions/device-key/transfer-shared; creative-tasks/CreativeTasks; AppShell/root/jobs/styles; five Guardian migrations and generated Cloud integration/types; package/lock; retained integrity and SQL tests; AGENTS/roadmap and specification/checklist/verification plus TRANSFER_CREATIVE_REQUIREMENTS.

## Compact Device Care + VS Code boundary — 2026-10-25
- Existing transfer plan is archived in `.lovable/plan/real-selected-file-transfer-2026-10-25.md`; preserved, no pending approval bypass or rerun of migrations. No prior build interrupted.
- Device Care Storage, Security and Bluetooth categories now use responsive compact grids; same labels/details/actions. Cleanup handler and consent requirement unchanged; no compression/deletion functionality added.
- Jobs adds VS Code workspace-request review and desktop/browser mode selection. Execution host/open are disabled; no simulated host accepted as authority. No connection request, external URI, install, tunnel or port exposure occurs. Contract checks are client UX, not actual server authorization.
- Microsoft primary documentation reviewed via read-only research; source URLs and security/adapter prerequisites recorded in TRANSFER_CREATIVE_REQUIREMENTS.
- `bunx vitest run src/test/device-care.test.ts src/test/editor-handoff.test.ts`: 22/22 passed. `bunx vitest run`: 52/52 passed across 8 files.
- Chromium script `/tmp/browser/device-editor/check_layout.py` passed desktop 1280×1800, tablet 768×1024, phone 390×844: storage first two cards side-by-side on desktop/tablet and stacked on phone; cleanup disabled before consent and reports no deletion after simulated consent; Security/Bluetooth no overflow; editor review reports nothing sent/opened, host/open stay disabled; keyboard focus visible; zero page errors. Tablet storage and phone editor screenshots inspected. Initial attempt ran before hydration and timed out on disabled cleanup; readiness wait corrected script, no app behavior changes.
- Automatic build log: build OK at 19:40:04 UTC. No manual build/typecheck. Every content route retains unique app metadata.
- Changed: src/routes/device-care.tsx, src/routes/jobs.tsx, src/components/EditorHandoff.tsx, src/lib/editor-handoff.ts, src/test/editor-handoff.test.ts, AGENTS.md, roadmap.md, this document, TRANSFER_CREATIVE_REQUIREMENTS, project memory.
- Unverified: physical devices/Safari; authenticated two-client transfers (first account sign-in still required) and different-network acceptance; VS Code editor/tunnel/adapter end-to-end. No companion/editor installer, remote session or artifacts. Actual adapter prerequisites and disposable-workspace acceptance documented; no real host/project or access changes, no publication.

## Hive / Combs / Demo job notices — 2026-10-25
- Implemented priority UI 3/4/5: Demo SVG hive cells and unavailable-host details; saved Combs cards reuse shortcut preview/cancel/run; Demo pass/fail outcome and in-app completion notices/log retrieval/dismissal. Retained current theme, keyboard tools, saved commands and bee lock.
- `bunx vitest run`: 54/54 passed across 8 files. Automatic validation then reported test option typing errors; removed unsupported Testing Library `exact` options. `bunx vitest run src/test/terminal-controls.test.tsx src/test/jobs.test.ts`: 14/14 passed afterward. Latest automatic build OK at 19:44:43 UTC; no manual build/typecheck.
- `/tmp/browser/hive-addons/check_addons.py`: Chromium desktop 1280×1800, tablet 768×1024, phone 390×844 passed: four Demo cells; asleep details and disabled connect; online tap opens Demo shell; risky Comb cancel leaves output unchanged; safe Comb confirms before output; Demo failure notice/logs persist after reload; no horizontal overflow/page errors. Phone hive, tablet Combs and desktop hive screenshots inspected.
- Changes: index/terminal/jobs routes, AppShell, styles, jobs lib, terminal-controls/jobs tests, AGENTS/roadmap, SPEC/CHECKLIST/VERIFICATION, TERMINAL_ADDONS and project memory.
- Outbound key-bound Mac relay/tmux architecture documented only. No native companion, tmux session, real job/notification, public share link or Evolution command invoked. Explain This/share/Evolution queued pending provider/consent/host/CLI prerequisites; existing bee lock remains simulated. Physical devices, Safari, authenticated different-network transfers and native host acceptance remain unverified. No publication/access/installer changes.

## Approved add-on reconciliation and account inspection — 2026-10-25
- Approved plan archived as reconcile-the-queued-terminal-add-ons-2026-10-25. Added Mac/iPhone/iPad relay pairing prerequisites, disabled real test, Demo-specific test state and explicit terminal Demo acceptance warning; Jobs states locked-phone delivery/log masking are unavailable. Theme and existing controls preserved.
- `bunx vitest run src/test/device-care.test.ts src/test/terminal-controls.test.tsx src/test/jobs.test.ts src/test/transfer-integrity.test.ts`: **4 files, 36 tests passed** at 21:53 UTC. Demo response asserts state `demo`; transfer integrity/proof binding and command cancellation regressions retained. No new account/session test is claimed.
- Chromium `/tmp/browser/queue-polish/check_pairing.py`: desktop 1280×1800, tablet 768×1024, phone 390×844; request/pending/approve/Demo test completed, real test stayed disabled, terminal warning observed, jobs limitation visible; no horizontal overflow or page errors. Phone and desktop screenshots inspected; phone screenshot is at the post-click scroll position. No physical Mac/iPhone test, tmux, push or secret-redaction engine exists.
- Automatic preview validation: build OK at 21:53:12 UTC. No manual build/typecheck. Content routes inspected for unique Honeycomb titles/descriptions, OG title/description/type and Twitter cards; no absolute hero image to tag.
- Read-only hosted auth settings returned HTTP 200: Google/email enabled; signup allowed; email confirmation required; Apple/Microsoft/phone disabled. Lovable flag not reported. Hosted preview callback origin is allowed; account count is zero. No provider settings changed, fake account created or OAuth/recovery flow tested. Missing email/signup/recovery polish waits for owner profile-data answer; future Vault identity contract documented only.
- Changed: pair/terminal/jobs routes, device-care helper/test, TERMINAL_ADDONS/SPEC/CHECKLIST, ACCOUNT_IDENTITY_BOUNDARY, AGENTS, roadmap and memories. No install, paid service, public share, publication or access-policy change.

## Staged creative packages — 2026-10-25 21:54 owner request
- Approved staged plan archived unchanged; transfer-first and pending account-profile answer preserved. Added audio/video/book/game preview scope, explicit file metadata selection and original media playback, disconnected provider/model/agent choices, ISBN checksum/owner consent and inert no-grant handoff inspection. Processing/render/comparison/export/apply/rollback/send remain disabled. No backend/auth/Guardian logic changed.
- Full `bunx vitest run`: **9 files, 66 tests passed** at 21:59:05 UTC; 12 new behavioral rules cover four unavailable packages, original/separate-output policy, ISBN syntax/consent/no generation, cancellation identity, allowlisted no-credential/no-grant handoff, reconnect identity, absent evidence, disconnected choices and older draft parsing. After automatic validation caught exact-optional-property typing on saved book metadata, corrected the type; focused creative/integrity run: **20 tests passed** at 22:00:01 UTC. Latest automatic validation **build OK at 21:59:53 UTC**. No manual build/typecheck.
- Chromium `/tmp/browser/creative-packages/check_packages.py` completed desktop 1280×1800, tablet 768×1024 and phone 390×844: explicitly selected disposable WAV loads with actual one-second media metadata; selected scope/provider/model/agent, inspect/save, no-grant/unavailable contract, disabled processing, cancel/reload preserving cancellation; invalid ISBN blocked, valid checksum still blocked until assignment consent, review/discard, blank ISBN accepted without generation. Video/game/browser choices render without horizontal overflow. Zero page errors. Phone/desktop screenshots inspected: form readable, theme preserved and controls within viewport.
- Browser evidence establishes **local preview**, not enhanced audio quality, video render, book preflight, Unity execution, provider connection or live handoff. No user account/fake account, actual file upload or provider call was needed or performed. Existing authenticated two-client/different-network transfer gate remains unverified; physical Safari/iOS/Android/native/provider/host processing acceptance tests in CREATIVE_PACKAGES.md remain pending.
- Changed: CreativeTasks, CreativeMedia, creative-package/creative-tasks modules, retained creative-package tests; CREATIVE_PACKAGES, TRANSFER_CREATIVE_REQUIREMENTS, SPEC/CHECKLIST/VERIFICATION, AGENTS/roadmap and requirement memory. No host install, ports, paid activation, original modification, book submission or publication.
