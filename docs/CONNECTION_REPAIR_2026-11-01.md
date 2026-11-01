# Existing connection repair — 2026-11-01

## Root causes and changes
- Pair request JSON parsing and approval polling rejected without a catch. Shared ten-second request timeout, explicit errors, duplicate-submit guard and approval retry/backoff now retain the original request.
- Codes were accepted at exact expiry, approval could occur after expiry without polling, and a full device list consumed a valid code. Inclusive expiry and limit checks now happen under the existing lock; successful requests still consume the hash once.
- Close, online and foreground events could race into multiple sockets. One socket/timer, stale callback guards, authenticated ready/pong and 10-second heartbeat with 35-second browser / 45-second server timeout now drive status. Reconnect preserves the existing PTY; expiry/revoke still denies access.
- First-use file destinations were empty because Inbox did not exist until an upload that the disabled button prevented. Authenticated folder loading now creates the dedicated 0700 Inbox; writes remain 0600, distinct names, no execution. Upload authorization is rechecked after reading bytes.
- Account-code creation could reject outside error handling and leave busy state stuck. Existing RPCs now sit behind active-account server functions; creation always clears busy and shows errors, expired account codes can be replaced. Account link (12 characters, ten minutes) is explicitly separate from shell pairing (8 characters, 120 seconds).
- Concurrent account-code issuance is serialized by owner transaction lock in migration 0012. No host rows, installed keys, sessions, auth configuration or secrets reset.
- Saved addresses no longer imply live connectivity; missing heartbeat means unknown, not confirmed asleep. Shared 150-second freshness rejects invalid/future dates. Dashboard and transfer refreshes discard late results.
- Explicit 100.64.0.0/10 tailnet IPv4 is accepted alongside private LAN; helper must bind the selected local interface. No Tailscale installation/configuration, automatic discovery, DNS proxy, public relay or certificate bypass added. Tailnet ACLs, logged-in devices, TLS and Mac approval are all still required.

## Exact changed files
Code: `companion/honeycomb/lan.py`, `companion/honeycomb/lan_page.py`, `src/components/LinkedMacs.tsx`, `src/lib/host-link.functions.ts`, `src/lib/request-sequence.ts`, `src/lib/mac-link.ts`, `src/lib/host-enrollment.ts`, `src/lib/feature-status.ts`, `src/routes/terminal.index.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/transfer.tsx`.

Tests: `companion/tests/test_lan.py`, `companion/tests/test_lan_browser.py`, `companion/tests/lan_browser_checks.cjs`, `src/lib/request-sequence.test.ts`, `src/lib/mac-link.test.ts`, `src/lib/host-enrollment.test.ts`, `src/lib/feature-status.test.ts`.

Database: `drizzle/migrations/0012_serialize_host_link_code_issuance.sql` plus tool-managed migration metadata and regenerated client types.

Documentation: `AGENTS.md`, `companion/AGENTS.md`, `roadmap.md`, `docs/SPEC.md`, `docs/CHECKLIST.md`, `docs/OPERATIONAL_LOG.md`, `docs/COMPANION_ACCEPTANCE.md`, `companion/README.md`, this report. Download: `public/downloads/honeycomb-companion-mac.zip` rebuilt from repaired source without touching any installed Mac copy.

## Evidence
- 58 focused app tests passed: Mac address validation, host/dashboard truthfulness, refresh ordering, paste/line discipline, sandbox filesystem, routing and transfer integrity.
- Companion suite: final count recorded in operational log. Covers real Unix PTY reconnect/revoke, TLS hostname verification, wrong Origin/Host, one-use/expiry, heartbeat, first-use Inbox, file scope/mode/no execution, workspace and QR. Five deterministic browser scenarios cover request/JSON errors, approval retry, reconnect event races, heartbeat timeout and revocation.
- Chromium on loopback: actual `/bin/sh` `printf 'CHECK-PWD:'; pwd` read back the isolated Linux directory. Mac-console approval, reload reconnect, file bytes saved without running them, revoke returns pairing; zero page errors. TLS test trusts only the generated fixture SPKI, not all certificates. This is Linux sandbox evidence, not real Mac evidence.
- Signed-out dashboard redirected to Account. Managed owner test session was rejected by existing session-revocation checks, so code issuance and authenticated transfer success are NOT verified. Dashboard honestly showed Failed account and pending shell/providers; checks were not weakened to force success.
- Desktop/phone browser terminal layout and preserved keyboard/paste flow checked separately. No Safari, iOS Camera, physical keyboard or PWA certificate persistence claim.

## Owner acceptance — do not reset a working Mac
The running installed helper is not automatically changed. Keep it running until a deliberate update window; inspect/download the new archive separately. Do not unlink, delete Application Support, replace host.json or regenerate certificates as troubleshooting. Restarting to load repaired source ends existing shells and creates new pairing codes; old codes from before restart will not work.

1. Sign in normally to the private app, open Dashboard and Connect Mac. Request the **account link** only if the Mac is not already linked; confirm either a visible code or actionable error. Never paste that code into shell pairing.
2. On the awake Mac's existing Honeycomb console type `code`; scan the newly printed QR on iPad. Confirm certificate fingerprint independently against the Mac. Do not bypass certificate verification. An old QR, used code or regenerated code must fail.
3. Request access once, approve its exact device request on the Mac within five minutes. During a brief Wi-Fi interruption the same approval request must retry, not consume another code.
4. Once authenticated status says Connected, run `pwd` and `whoami`; compare with Terminal.app on that Mac. Browser sandbox output is never this proof.
5. Use native paste/Cmd+V, visible Paste, selection Copy and external keyboard. Clipboard-denied feedback must leave a native text-field fallback; pasted draft should not run until Send. Test iPad keyboard open/close and full-screen sandbox separately.
6. Save a selected harmless file into Inbox. Verify exact bytes and 0600 mode on Mac; contents must not execute. First-use Inbox should be selectable; repeat save must not overwrite.
7. Lock/unlock or disconnect/rejoin network; verify same PTY variable and scrollback, one connection, honest interim status. iOS may suspend tabs; reconnect timeout must not be reported as confirmed Mac sleep.
8. Mac `revoke ID` must stop output/input/reconnect/file requests. Website account revoke must stop helper sessions after its next account check; account backend outages remain an existing grace behavior, not immediate revocation proof.
9. Tailscale test is separate: both devices already authorized in the same private tailnet, correct ACLs, selected Mac `100.x` interface/port, trusted certificate. No public Serve/Funnel/port-forward. Record same-LAN and cellular tailnet results separately.
10. Safari Home Screen/PWA certificate, cookie, soft-keyboard and clipboard behavior require physical checks. Gemini/Claude remain Test Pending; no provider calls were performed in this repair.