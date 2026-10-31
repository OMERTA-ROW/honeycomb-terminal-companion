# Private companion acceptance report — 2026-10-31

## Secure Device Link — current live path (supersedes older BLOCKED rows below)

One common macOS companion: `public/downloads/honeycomb-companion-mac.zip` (served at
`/downloads/honeycomb-companion-mac.zip`, linked from Terminal and Install). It is a pure-Python
zipapp run by Apple's `/usr/bin/python3` (Command Line Tools, Python >= 3.9), so the same file runs
on Apple silicon and Intel Mac mini, iMac and MacBook. Unsigned test build; not notarized.

Built and tested (Linux sandbox, loopback TLS, not a Mac): private-IPv4-only bind, self-signed TLS
with fingerprint shown on both sides, one-use 8-char code (120 s, 5 tries, global lockout), Mac
console `approve ID`, HttpOnly/Secure/SameSite=Strict session, Host/Origin checks, real PTY,
reconnect with persistent session (30 min), revocation checked on every frame (close 4401),
secret-free audit log, file Inbox separate from shell.

Not built: account-device enrollment (the Mac is not linked to a Honeycomb account; Mac console
approval is the only authority, and website "Remove" does not revoke on the Mac), relay for
cellular/different networks, signed/notarized installer, Windows/Linux helpers, biometric unlock, website-side online probe. QR pairing IS built (2026-10-31): the Mac window prints a real QR of https://<private IP>:<port>/#pair=CODE (fragment never sent to a server; 120 s, single use, new `code` invalidates old, Mac approval still required). The earlier /pair QR was a decorative Demo grid and was removed. The website still cannot probe whether the Mac is online.

### Owner acceptance checklist (Mac + iPhone/iPad on the same Wi-Fi)

| # | Step | Pass criterion | State |
|---|---|---|---|
| 1 | Download zip on Mac from Terminal page, unzip | Folder with Start Honeycomb, .pyz, READ-ME-FIRST | NOT RUN on Mac |
| 2 | Control-click Start Honeycomb → Open; type `ALLOW LAN TERMINAL` | Prints https address, fingerprint, code | NOT RUN on Mac |
| 3 | iPhone/iPad Camera: scan QR in the Mac window, tap link | Safari opens https://<Mac IP>; warning → Show Details, SHA-256 matches Mac; code pre-filled | Sandbox PASS (browser, cert warning skipped by harness) / device NOT RUN |
| 4 | Enter code + device name; Mac types `approve ID` | Terminal opens | NOT RUN |
| 5 | Run `pwd` | Mac home path printed | Sandbox PASS / device NOT RUN |
| 6 | Lock phone 30 s, reopen | Same session resumes, scrollback kept | Sandbox PASS / device NOT RUN |
| 7 | Mac: `revoke ID` | Phone returns to pairing; reconnect refused | Sandbox PASS / device NOT RUN |
| 8 | Wrong/expired code; second use of a code | Refused | Sandbox PASS / device NOT RUN |
| 9 | Share → Add to Home Screen; reopen | Opens Terminal page | NOT RUN |
| 10 | Mac: `quit` | Phone shows offline; nothing listening | Sandbox PASS / device NOT RUN |

Prerequisites: Mac and phone on the same private Wi-Fi (no guest/client isolation), Command Line
Tools (macOS offers them on first start), Mac awake. Next platform after Mac proof: Windows helper.


## Delivered, not deployed

### Remaining-update audit, 2026-10-31

Added local-console-only dedicated desktop workspace creation/open, consent-only
export diagnostics, exact duplicate reversible quarantine/restore, and detected
installed VS Code local launch. Added fail-closed PTY shutdown/revocation for
invalid encrypted input; CLI restores console state even if resize setup fails.
No account, backend, transport infrastructure or provider configuration changed.

The web install/pair/workspace pages now separate real selected-file pairing
from Demo shell pairing, disclose local source capabilities, and link existing
device/workspace flows. The black/gold frame and four main destinations remain.
No new biometric control was fabricated: managed provider passkeys are unsupported
here, and native biometric unlock remains unimplemented.

Source audit confirms owner/invite-only account middleware and scoped transfer
operations already exist. Neither membership nor file trust grants a shell.
Existing keyboard/copy-paste controls remain Demo, browser-permission dependent.
Native cleanup is limited to owner-selected local exports, preserves originals
and all quarantined bytes, and never claims freed space. Do not expose these
filesystem tools remotely without durable authorization and race-hardening.

Current test results are recorded below after execution; historical counts in
older sections are evidence of previous runs, not additional hardware tests.

## End-to-end owner checklist (actual state)

| Step | Pass criterion | Actual state |
|---|---|---|
| Local install | Run doctor and unittest on owner Mac, no sudo/listener | NOT RUN on Mac; source commands supplied |
| Workspace | Consent create/open, reopen files unchanged | Isolated temporary-directory tests; Finder NOT RUN |
| Diagnostics | Consent scan exports, exact vs similar, originals retained, restore | Isolated tests; owner disk NOT RUN |
| VS Code | Consent opens selected local projects, no tunnel | Mocked argument/denial tests; real Mac editor NOT RUN |
| Owner identity | Verified configured identity retains owner; ordinary account denied | Existing isolated owner tests; owner OAuth NOT RUN this update |
| Invited account | Real invite accepted, isolated devices, removed member denied | No emails/accounts created; authenticated UI NOT RUN |
| File pairing | 120s QR/code; named approval; reject expired/reused | Existing source/tests; physical two-client NOT RUN |
| File transfer | Different networks, identical SHA-256, revoke mid-transfer denied | BLOCKED acceptance: physical authorized clients required |
| Shell pairing | Authenticated Mac identity, explicit shell grant and phone approval | BLOCKED: enrollment/relay/mobile adapter absent |
| Test Connection | Actual Mac prints Honeycomb connected via encrypted WAN session | BLOCKED; local PTY output is not remote success |
| Keyboard | Phone/iPad input, resize, Ctrl+C, selected copy/paste | Existing browser tests; physical keyboard/clipboard NOT RUN |
| Reconnect | Phone offline 30s; same persistent host session resumes | BLOCKED: supervisor/reconnect protocol absent |
| Revocation | Revoke denies live input/output/reconnect immediately | Isolated local scope checks PASS; live path BLOCKED |
| Biometrics | Supported OS prompt, fallback, no raw templates | BLOCKED: native adapter/provider support absent |
| PWA | Physical Home Screen/install/update; no private data cache | NOT RUN; editor worker remains disabled |

No live end-to-end step above is marked PASS without real account/host/device
evidence. Owner must install source locally first; this does not require a paid
Apple signing account. Signed distribution needs securely supplied signing/
notarization access. Reviewed private relay infrastructure and native enrollment
remain implementation prerequisites; no service was provisioned or approved.

Runnable network-free Unix host source in companion/honeycomb: real local PTY,
opt-in normal-user console, bounded input and resize, process-group shutdown,
ephemeral host pairing/scopes/revocation, pinned directional encrypted frames
and in-process encrypted shell acceptance adapter. No server shell executes.
The install screen now distinguishes this source from unavailable native
installers and remote connectivity; its private readiness server function
requires existing active-account membership. The computer-list request now
discards stale results after an account identity change.

No auth configuration, database/schema, production audience, email, accounts,
public endpoint, billing or real-machine installation was changed.

## Actual checks

| Check | Result / limits |
|---|---|
| Companion test discovery | PASS: 30 unittest tests, Linux sandbox; initial system Python lacked cryptography, rerun succeeded in isolated venv |
| Non-root interactive local CLI | PASS: disposable workspace init → consent scan → quarantine → restore; originals byte-identical, no network |
| Consent / path / original safety | PASS: no-consent denial, symlink/escape refusal, similar-file denial, restore non-overwrite; 12 new workspace tests |
| Invalid encrypted input | PASS: PTY closes and scope revokes; subsequent output denied |
| Real harmless PTY output and cwd | PASS: disposable local /bin/sh; not a Mac |
| Encrypted input/output then revoke | PASS: in-process channel; fixture account verifier, no WAN |
| Pair expiry/reuse/five attempts/approval | PASS: isolated model, not production pairing |
| Cross-account/host/session, inactive account, stop | PASS: isolated model |
| Pin mismatch, ciphertext tamper, replay | PASS: fresh test identities and scoped AEAD |
| Application regression discovery | PASS: 13 Vitest files, 94 tests |
| Automatic web build | PASS: latest observed 2026-10-31T02:51:11Z |
| Browser navigation | PASS: install → file transfer, pair → file transfer, workspace → install; public owner setup/Become owner absent; initial check needed to await route render |
| Layout | PASS: Chromium 1280×1800, 768×1024, 390×844; no horizontal overflow or page errors; native status screenshots inspected |
| Leaf metadata | PASS: all content routes have their own head, og:title/description/type and twitter:card |
| Signed-in private readiness | NOT RUN against owner session; middleware reused, no identity fixture created |
| Mac installation / phone or iPad live use | NOT RUN; owner hardware and real transport absent |
| tmux / mobile reconnect / account-connected shell revoke | BLOCKED: enrollment, transport and supervisor not implemented |

## Links and next owner action

- Private test page: https://id-preview--f5dd4092-07a4-4e53-bf40-35c167b9eaac.lovable.app/install
- Account: same preview origin, /account. Invitations: /members (existing authorized management only).
- Local install and runnable commands: companion/README.md. Obtain the project
  source through the owner's existing source workflow; no repository access or
  download hosting was assumed and no installer download was created.
- Run the documented isolated tests on a Mac first. Local source testing needs
  Python and a normal user account, not paid signing. No port forwarding needed.
- Next implementation needs verified companion enrollment/protected keys,
  reviewed outbound authenticated relay infrastructure, PWA protocol adapter and
  persistent host supervisor. Relay infrastructure/private deployment approval
  and Mac hardware must be supplied before remote acceptance can run. No paid
  resources have been provisioned and no secure configuration request is pending.

The preview continues to refuse offline service-worker registration by design.
PWA installation/update behavior was preserved, not validated on physical iOS.
An installed web app alone never supplies shell or native device access.

## Scope and unfinished work

This prepares a local host core, not the complete Mac Companion product.
Autonomous task UI/executor, creative adapters, live sharing and native device
care remain separate unfinished milestones. Existing task database source does
not constitute a runner. Sensitive autonomous actions still require individual
approval; an unrestricted interactive shell cannot enforce those categories
through a command-warning regex. No autonomous dispatch was added.

Threat review, durable revocation, production account verification, Mac Keychain,
fresh reconnect key negotiation, global rate limits, audit delivery and relay
interoperability are mandatory before attaching this code to any internet input.