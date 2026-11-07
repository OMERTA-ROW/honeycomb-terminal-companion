# Honeycomb operational onboarding & connection log (living)

## Latest acceptance repair — 2026-11-01
| Stage | Expected | Actual / evidence | Status / next |
|---|---|---|---|
| Pair requests / approval | Single-use, bounded, errors visible | Exact 120-second expiry, 300-second approval expiry, full-device non-consumption, request/JSON failures, approval retry covered | Sandbox; physical Mac+iPad needed |
| Secure shell / reconnect / revoke | Authenticated host output; one socket; revoke denies access | Chromium + pinned fixture SPKI, real Linux `/bin/sh` pwd read-back, reload history, revoke pairing UI; zero companion page errors | Sandbox, not Mac PASS |
| First-use file save | Inbox available; bytes only | Authenticated destination creates 0700 Inbox, saved selected text verified, no execution; revoked upload blocked | Sandbox; verify Mac file bytes/mode |
| Account code request | Normal signed-in member receives code or visible error | Active-account wrapper + serialized issuance; managed test session rejected with visible “Session expired or revoked” | NOT VERIFIED successful issuance; owner normal sign-in required |
| Dashboard | Unauthorized denied; truthful status | Signed-out redirect; rejected test session displays Failed, shell and Gemini/Claude stay Test Pending | Sandbox; normal owner membership acceptance required |
| Keyboard / paste / README | Full-screen controls preserved | Native paste event pwd, denied-clipboard Paste box insertion, ls lists README.txt and cat README.txt reads it; 390×844 and 1280×1800 screenshots inspected, no overflow | Sandbox; physical Safari/PWA/keyboard required |
| Tailscale | Private authorization preserved | Explicit 100.64/10 bind/address allowed, adjacent public ranges rejected; no setup or public relay | NOT RUN on real tailnet |
| Regression suites / archive | Source tested and packaged | 179 app tests (24 files), 67 companion tests incl. 5 JS scenarios; preview build OK; archive/source checked; doctor exits 0 | Sandbox; installed Mac not touched |

Exact file list and owner steps: `CONNECTION_REPAIR_2026-11-01.md`. No publish, secrets change, auth relaxation or local companion reset. Historical table below is prior-stage evidence, not current physical acceptance.

Rule: a stage is PASS only with evidence from the real path it names. Sandbox,
mock, Demo, or browser-navigation results are recorded as "Sandbox" and never as
device PASS. Update this table whenever a stage is attempted.

Status key: PASS (real device evidence) · Sandbox (real code, sandbox only) ·
NOT RUN · BLOCKED (named prerequisite) · FAIL (with fix).

| # | Stage | Expected | Actual (latest) | Evidence | Status | Blocker / next action |
|---|---|---|---|---|---|---|
| 1 | Login | Owner signs in privately; ordinary sign-up refused | Login works; not success on its own | Existing auth tests | Sandbox | Owner signs in on iPhone/iPad |
| 2 | Verification | Verified email/owner role recognised | Owner bootstrap server-side only | Isolated owner tests | Sandbox | Owner confirms role on device |
| 3 | Mac Helper install | Zip downloaded once, Start Honeycomb opens, doctor passes | Zip has starter, program, read-me; runs in Linux sandbox | Download format check 2026-10-31 | Sandbox | Owner runs on real Mac |
| 4 | Account-linked host | Mac appears under owner account; account revoke cuts phones | Built 2026-10-31: app issues 12-char 10-min one-use code (hash only); helper `link CODE` enrolls via backend; 60 s check-in; account revoke → helper revokes all phones, refuses pairing | Real backend: wrong/reused code refused, anon list 401, host file 0600, status active→revoked; running helper disconnected live browser session after account revoke; revoked helper start refuses pairing. Owner code was issued via SQL as owner (sandbox token lacks session id) | Sandbox (real backend) | Owner taps Link this Mac on a real signed-in device, types link CODE on Mac |
| 5 | Pairing QR | Camera scan opens Mac page with code filled; 120 s single use | Real QR built; decoded by zbar; browser prefill, reuse refused | test_qr.py (8), run_qr.py 2026-10-31 | Sandbox | Owner scans on iPhone/iPad. Earlier FAIL: /pair QR was decorative Demo grid; transfer QR held a bare code — both fixed |
| 6 | Secure terminal | TLS, fingerprint match, Mac approve, Connected | Connected after approve; cert warning skipped by harness | test_lan.py, run_qr.py | Sandbox | Owner verifies Safari "Show Details" fingerprint |
| 7 | Real command | `pwd` prints Mac home | Printed host home (Linux) | run_qr.py | Sandbox | Owner runs `pwd` on Mac |
| 8 | Reconnect | Reload/lock resumes same session | Reload kept scrollback | run_qr.py | Sandbox | Owner locks phone 30 s |
| 9 | Revoke (Mac console) | Mac `revoke ID` returns phone to pairing; reconnect refused | Passed | run_qr.py, test_lan.py | Sandbox | Owner revokes on Mac |
| 10 | Different network | Works over cellular | Not built | — | BLOCKED | Owner-approved private relay |
| 12 | Browser sandbox terminal | Built-ins run without a Mac | Simulated commands on browser-local file tree, not Unix processes | unit tests + phone-size browser run | Sandbox | Owner opens Terminal on iPhone, starts sandbox session, runs pwd |
| 11 | AI connector | Agent connects with scoped permissions | Catalog only; nothing Connected | connectors.test.ts | BLOCKED | Stages 4 and 8 on real devices first |

Demo (simulated hosts, /pair) is never counted in this log.

## 2026-10-31 — Full-screen terminal + in-terminal agents
| Step | Status | Evidence |
|---|---|---|
| Terminal/menu → full-screen /terminal/sandbox, Exit button + Esc (view only, sessions kept) | Sandbox | Playwright 390px: Esc returned to previous page; session text survived reopen |
| `agents`, `connect codex/claude` (BLOCKED message) | Sandbox | Playwright output captured |
| `ask gemini` (Lovable AI, Gemini model) | BUILT-UNVERIFIED in app | Same request via direct server call returned HONEYCOMB-OK; in-browser test session lacked session id → "Session expired" (real sign-ins pass the check) |
| `ask perplexity` | BLOCKED | No Perplexity connection in workspace; owner must create and link one |
| `connect api/mcp <https url>` | BUILT-UNVERIFIED | Private/local URLs refused by unit tests |
| Codex / Claude Code CLI | BLOCKED | Cannot run programs in browser or server runtime; needs Mac add-on |
| xterm.js inline terminal (prompt/input/output in one viewport), Tab, history, Ctrl+C, resize, persistence, Esc×2 exit | Sandbox | Playwright 390px→1280px: pwd/mkdir/cd (Tab)/ls ~/history/Ctrl+C inline; width 374→1264; reload kept session; Esc Esc exited. Not a PTY — no vim/real processes; Mac PTY only via companion lan-serve page |
| Connectors statuses: Works in Terminal (Gemini, Claude API, OpenAI API, MCP test, API test) / Needs authorization (Perplexity) / Not built (Codex, Claude Code, Gemini CLIs) / Unsupported (websites); cards open Terminal with command typed, never auto-run | Sandbox | Playwright: statuses read back; "Open in Terminal" → /terminal/sandbox?cmd=ask+gemini+; signed-out ask refused. Gateway: Claude Sonnet 5 → CLAUDE-OK, GPT-6 Astra → GPT-OK, Gemini → HONEYCOMB-OK (direct server-side calls, same request bodies) |
| Hosted PTY sandbox | BLOCKED | Server runtime cannot start processes; needs an owner-approved external sandbox service (paid) or the Mac companion |
| Voice actions (mic → transcript → intent → run/confirm) | Sandbox | Gateway transcription of spoken WAV returned "Run pwd in sandbox." → parser maps to `pwd` (read); browser: mic denied shows clear message; mic allowed records then server rejects the test sign-in (no session id) — real sign-ins not yet tried; signed-out POST → 401 |

## 2026-11-07 — Autonomous modes (owner controls, OFF)
- Added /autonomy (signed-in): independent Local and OMNI remote switches, permissions, job budget, Emergency Stop, fail-closed gates (src/lib/autonomy.ts, 10 tests).
- Neither mode can become Active: no OMNI Docking Bay endpoint is configured and no verified executor exists; Test connection always reports FAILED and records nothing.
- Fixed 4 stale checks (Terminal first in search, Connectors label, connect codex/claude navigation). 209/209 app tests pass.
- Unverified: owner sign-in run of the page, real Mac+iPad pairing/pwd/ls/reconnect/revoke acceptance, OMNI dispatch/logs/cancel.
