# Canonical requirement-by-requirement gap checklist

Reconciled 2026-10-24 against the full Notion text copied by the owner (source fetch 19:26:56.132Z); no private-link fetch required. Existing work preserved. See `VERIFICATION.md` for actual evidence and `IMPLEMENTATION_PLAN.md` for remaining implementation gates.

Legend: **Working preview** = real browser interaction only; **Simulation** = UI represents a future host capability; **Not implemented** = no native/transport/backend implementation. A browser check is not native acceptance.

| ID | Canonical requirement | Current result / gap | Next gate |
|---|---|---|---|
| R01 | Simple desktop-like terminal for iPads and phones; separate from paused Vault | Simulation: Honeycomb Terminal branding, no Vault ads or Omni/Evolution coupling | Preserve separation |
| R02 | Install companion + mobile app, same-account sign-in | Simulation walkthrough only; no installable native apps or accounts | Host platform spike, native client and identity |
| R03 | Approve pairing once, then automatically establish only permitted connections | Simulation: fixed demonstration code and owner-approval button save a sample host locally; no authorization | Expiring cryptographic pairing plus host-owner approval |
| R04 | Default paired computers, availability, one tap; no routine IP/shell setup commands | Working preview list/navigation without IP entry; hosts/status are samples, not real paired endpoints | Authenticated discovery and live heartbeat |
| R05 | Actual host shell, installed tools, files, settings and expected user permissions | Simulation only, no remote execution | User-scoped PTY + actual host tool/permission tests |
| R06 | iPad, iPhone and Android cross-platform goal | Automated web layouts at phone/tablet sizes; no native build or physical-device checks | Platform packaging, real software/hardware keyboards |
| R07 | macOS, Windows, Linux support implemented/tested per platform | All three sample OS labels; none supported by a companion yet | Choose first platform; separate qualification for others |
| R08 | Instructions: plain-language keys, examples, safe tap-to-try | Working preview: added key explanations and four explicitly simulated safe examples | Physical touch/keyboard usability |
| R09 | Esc, Ctrl, Tab and all arrow keys | Working preview: sticky Ctrl and history; patched ←/→ cursor movement, boundary clamps and selection collapse | Real PTY key encoding, apps such as vim |
| R10 | Custom key combinations and command shortcuts | Working preview: add/remove command shortcuts; added selectable supported key combinations; device-local only | General native key encoding and synchronized preferences if approved |
| R11 | Preview commands and confirm destructive shortcuts | Working preview shared confirmation; cancel leaves command/output unchanged; explicit simulation copy | Real execution gate; regex warning is NOT a shell security control |
| R12 | Comfortable selection/copy/paste | Browser selection supported; patched cursor/selection paste and honest success/denial feedback | Physical touch selection, OS clipboard restrictions, multiline handling in real shell |
| R13 | External keyboard support | Automated key events for entry, history, Tab, Esc and Ctrl actions; native browser left/right | Real external keyboards, modifier layouts, accessibility testing |
| R14 | Phone/tablet layouts | Wrapped navigation/header and pairing steps; dialogs contained; accessory rows scroll within the screen | Real virtual-keyboard/safe-area and orientation tests |
| R15 | Advanced settings accessible but not necessary | Shortcut management accessible; no transport/security settings implemented or needed in ordinary demo | Add only proven troubleshooting controls after transport exists |
| R16 | Secure authenticated pairing; membership is not owner authorization | Not implemented; clicking simulated approval grants no access | Independent host-owner consent, proof of device key possession |
| R17 | Encrypted transport and protected device keys | Not implemented; no keys stored; localStorage is sample/preferences only | Vetted E2E protocol and native protected keystores |
| R18 | Device revocation blocks new sessions | Working preview sample revoke blocks sample shell on navigation; no real authorization/security | Host-side revoked-key checks at every connection, active-stream teardown policy |
| R19 | Preserve host session over temporary drops and reconnect where supported | Simulation: browser offline detection disables input; offline reconnect refused; simulated resume marker; no durable PTY or scrollback across reload | Detached session supervisor, authenticated resume and replay |
| R20 | Accurate asleep/offline/permission/connection errors with concrete next step | Working sample state gates; network banner patched to avoid claiming persistence | Authenticated live status, distinguish unknown/unreachable from proven sleep |
| R21 | Host awake/reachable; local iPad and hosted compute separate | Preserved in specification/instructions; no local or cloud compute offered | Test actual reachability and sleep lifecycle |
| R22 | Regular bug fixes, prompt security patches | Not implemented release process; preview changes tested manually/automatically as recorded | Signed distribution and documented security response |
| R23 | Stage updates safely, protect sessions, rollback/recovery where supported | Not implemented; no recurring automation activated | Session-preserving upgrade/fault-injection tests per platform |
| R24 | USD 20/user/year across devices proposed only | Preserved, unvalidated; no billing | Validate limits, relay/payment/support costs and sustainable margin |
| R25 | Hosted compute/heavy relay usage separately costed | Not implemented; no paid services or hosted compute | Cost worksheet after measured transport use; separate authorization |
| R26 | Initial acceptance: novice pairing without commands/IPs | Simulation walkthrough only; not native acceptance | Physical new-user pairing trial |
| R27 | Initial acceptance: one tap authorized host shell | Simulation navigation only | Real owner-approved device opens user shell with host permissions |
| R28 | Initial acceptance: temporary loss preserves supported session | Simulation only | 30-second airplane-mode trial with same host session and scrollback |
| R29 | Initial acceptance: instructions/keys/shortcuts with touch/external keyboard | Browser automation passed specified cases; physical tests pending | iPad/iPhone/Android with real keyboards |
| R30 | Initial acceptance: accurate offline/denied permission messages | Sample gates tested; no live signals | Host sleep, OS permission denial and network fault tests |
| R31 | Initial acceptance: revoked device blocked; updates tested with active work | Sample revoke tested; real revocation/update tests unavailable | Security and update release gates |
| R32 | Next steps: pairing/transport feasibility, first host, keyboard/instructions, security/reconnect, costing | Keyboard/instructions preview advanced; concrete gated plan written | Owner chooses available test host/hardware; no services activated |
| R33 | Source status: no app, companion, deployment, subscription or automatic update schedule activated | Source captured as historical status; current work is only simulated web preview | Never conflate preview with a native release |
| R34 | Owner constraints: private, unpublished; no real remote access/customer passwords/unrelated features | Preserved; no deployment/public sharing/paid services/billing enabled by this work | Any future real-host test requires explicit owner authorization |

| R35 | Distinguished execution targets: this device / paired computer / hosted sandbox | Working preview: target selector on terminal and jobs; device and sandbox honestly unavailable with reasons; host simulated | Implement platform-limited device-local tools; provision sandbox only with separate authorization |
| R36 | No implied unrestricted iOS shell/other-app access or guaranteed background runtime | Documented in SPEC and target notes; preview claims neither | Native capability spikes per platform |
| R37 | Jobs: typed instruction → preview commands/scope → authorize → queued/running/waiting/failed/completed, logs, cancellation, reconnect/result retrieval | Working preview: full simulated flow with all states, cancellation, device-local result retrieval; no real execution | Real job runner on authorized host with authenticated result sync |
| R38 | First template: run existing tests and explain failures | Working preview template with read-only scope and canned simulated log | Real test-runner execution on host |
| R39 | Next template: prepare code changes in isolated worktree/container for review | Working preview template scoped to isolated worktree | Real worktree/container isolation on host |
| R40 | GitHub and Evolution coding workflows | Visibly "Not connected" integration cards; no endpoints invented, no credentials requested, nothing provisioned | Owner-authorized OAuth/app connection, then verification before any claim |
| R41 | Per-repo/per-job scoped permissions; explicit approval for destructive, publishing, spending, external messages | Preview shows scope and approval notes per job; destructive instructions flagged | Real authorization scopes enforced host-side |
| R42 | Remote execution beyond same LAN; authenticated encrypted WAN transport; no blanket same-Wi-Fi constraint | Documented options in IMPLEMENTATION_PLAN.md; not implemented | Threat model, protocol selection, WAN feasibility tests |

## Preview patches delivered
- Real left/right input caret movement, selection collapse, Unicode grapheme boundaries and empty-input limits.
- History index clamps and draft restoration; paste replaces selected input instead of always appending.
- Clipboard success is reported only after success; denial gives a concrete alternative.
- Offline input blocked and reconnect refused while offline; banner no longer claims a real running host session.
- Custom supported key-combination shortcuts use the same preview/cancel path as commands.
- Instructions include safe simulated examples; small-screen navigation/pair steps wrap.
- Pairing uses a deterministic demonstration code to avoid mismatched server/client random values; completion explicitly grants no real access.
- Malformed/unavailable local sample/preference storage no longer crashes the preview.