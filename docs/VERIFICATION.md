# Preview verification — 2026-10-24

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

## Not checked / not claimable
- Physical touch selection, real virtual keyboards, external hardware keyboards, orientation, safe-area behavior, Safari/WebKit, Android browser/native compatibility.
- Native installation, host OS permissions, actual pairing/key protection/encryption, remote command execution, host session persistence, sleep signaling, real revocation or active-session updates.
- Proposed subscription sustainability or device/relay limits.
- Hosted preview access settings were not inspected; no deployment/public-sharing/billing/paid-service action was taken. Existing unpublished state preserved.

These require authorized hardware and implementation described in `IMPLEMENTATION_PLAN.md`.