# Honeycomb — its own app, powered by OMNI

Goal: Honeycomb has its own identity on the phone/iPad. OMNI (on Railway) is the engine underneath. Everything stays off and says "Not connected to OMNI" until OMNI's secure-link self-test and sandbox runner actually pass.

## What stays the same
- Black/gold hive look, full-screen terminal, paste/copy fixes, the owner dashboard, private access, and no public publishing.
- Mac pairing, the Mac companion and Tailscale stay as an optional "Connect a computer" path. Nothing gets removed or reset.
- Password Pilot/Vault is not touched. No new OMNI server is built here; Honeycomb only connects to the existing one.
- Simulated pieces stay labeled "Demo" until the real connection works.

## 1. Identity
- Name: "Honeycomb", with the tagline "powered by OMNI" shown small in Settings and About only.
- Its own home-screen icon, splash screen, app name in the install manifest, and short, calm, direct wording.
- Home screen (new): connection pill (OMNI: Not connected / Connecting / Connected / Locked / Stopped), Resume last session, Quick actions, Pending approvals count, Snippets.

## 2. Connection to OMNI (secure link)
- Honeycomb never holds OMNI keys. The phone talks to Honeycomb's own server, which signs each request to OMNI with HMAC (timestamp + nonce + body hash) using a server-only secret. The signature format matches the desktop link.
- Each request also carries the signed-in owner's identity and the device ID, so OMNI can enforce permissions and revoke a single device.
- Live output streams through the same signed proxy. Reconnect uses backoff and picks up again from the last output position the phone received.
- Self-test screen: Reachable, Signature accepted, Clock skew OK, Sandbox runner ready, Kill switch state. Each check shows Pass/Fail with the real response. The app only unlocks when every check passes.

## 3. Mobile security
- Owner-only: the existing owner check plus an OMNI-side owner check.
- Passkey (WebAuthn) unlock on open and when returning from background. This unlock is a fresh server-verified check that expires after a short time.
- Auto-lock: when the screen hides or the phone sleeps, plus an inactivity timer (default 5 minutes, adjustable in Settings). Locking clears the visible output.
- A Stop button is always visible in the terminal and on Home. It cancels the current job through OMNI.
- Global kill switch: when OMNI reports it is on, the app shows a red "Stopped by owner" state and blocks all input. Honeycomb cannot turn it off; it can only show it and offer "Engage" (which needs a passkey).

## 4. Shared sessions
- The session list comes from OMNI: desktop and mobile sessions together, with origin, status and last activity.
- Open a session to view it live or continue it. Only one device types at a time, with a "Take control" button (passkey required). Any other device watches.
- The audit log is OMNI's, shown read-only in Honeycomb. Local actions (unlock, lock, stop, approve) are sent to OMNI's log too, not kept in a separate log.

## 5. Approvals on the go
- Push notifications (installed web app on iOS 16.4+ and desktop browsers) for: pull requests, spending, autonomous grants and dangerous commands.
- Notifications carry no secrets, only "Decision needed" plus an ID.
- Approval screen: what is being asked, scope, cost/limits, who asked, expiry. Approve or Deny, each needing a fresh passkey. The decision is signed and sent to OMNI. Expired requests become read-only.
- An in-app Approvals inbox works even when push is off.

## 6. Honeycomb's own features
- Mobile keyboard bar above the soft keyboard: Esc, Tab, Ctrl, arrows, | ~ / -, history up/down and Paste. It can be customized.
- Saved snippets: name, command, optional placeholders (`{branch}`). They insert into the input without running; you always press Enter yourself.
- Quick actions: one-tap safe commands (status, list sessions, last log). Anything that writes still needs approval.
- Session list with search and filters (running / waiting approval / ended).
- Offline/not connected: a clear full-screen state with the reason (no network / OMNI unreachable / self-test failing / locked / kill switch) and the next step. Commands are never queued silently.

## 7. Gating (until OMNI is live)
- Terminal, sessions, approvals and quick actions show "Not connected to OMNI", with a link to the self-test.
- The current browser sandbox stays available as "Demo shell", always labeled, and never mixed into OMNI sessions or the audit log.

## Screens
```text
Lock (passkey) -> Home
Home: status pill | Resume | Quick actions | Approvals (n) | Snippets
Sessions -> Session (live terminal + keyboard bar + Stop + Take control)
Approvals inbox -> Approval detail (Approve/Deny with passkey)
Snippets (list / edit)
Connect: OMNI self-test | Optional: Connect a computer (existing Mac path)
Settings: auto-lock, keyboard bar, notifications, devices (revoke), About "powered by OMNI"
Demo shell (labeled)
```
Navigation stays simple: Home, Sessions, Approvals and Settings in the existing compact header row, with no bottom tabs.

## What I'd add
- Device list with per-device revoke (sent to OMNI), plus "Lock all devices".
- A read-only watch mode for shared sessions, for safely checking on long jobs.
- A "Dry run" toggle on snippets, if OMNI supports plan-only runs.
- A clear clock-skew warning, since HMAC links fail quietly when phone time drifts.
- A small dashboard row that rolls up the self-test, so status always comes from real evidence.

## What I need from you / from OMNI
1. OMNI's secure-link details: header names, what gets signed, nonce/expiry window, base URL. The shared secret gets added by you as a server-only secret.
2. OMNI endpoints for: self-test, sessions (list/attach/stream/input/stop), audit read/write, approvals (list/decide), kill switch state, device revoke.
3. Confirmation that OMNI checks the owner identity Honeycomb forwards (or a mapping to set up).
4. Final name/icon direction. I'll keep "Honeycomb" plus the hive unless you want a new mark.

## Verification (honest)
- Automated tests: signature building, lock/auto-lock timers, gating (never "Connected" without a passing self-test), snippets never auto-run, approvals need a fresh passkey, and the kill switch blocks input.
- Browser tests: lock -> unlock -> not-connected states, and signed-out access denied.
- Real checks only once OMNI is live: self-test pass, shared session desktop<->phone, a real approval round-trip, and push on a real iPhone. Until then these are reported as "Not verified".

## Technical details
- New pure modules: `omni-link` (request signing, server-only), `lock` (passkey/inactivity state machine), `omni-status` (gating from self-test results), `snippets`, `approvals`.
- Server functions wrapped in the active-account check call OMNI and verify the passkey assertion server-side. Short-lived unlock tokens are stored per session.
- Streaming goes through an authenticated route that proxies OMNI's live output. No OMNI URL or secret reaches the browser.
- Push uses the service worker plus a VAPID key (server secret). The existing rule against caching private pages still applies.
- New tables (owner-only access): passkey credentials, push subscriptions, snippets. Sessions, approvals and audit stay in OMNI.
