# Private companion acceptance report — 2026-10-31

## Delivered, not deployed

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
| Companion test discovery | PASS: 17 unittest tests, Linux sandbox |
| Real harmless PTY output and cwd | PASS: disposable local /bin/sh; not a Mac |
| Encrypted input/output then revoke | PASS: in-process channel; fixture account verifier, no WAN |
| Pair expiry/reuse/five attempts/approval | PASS: isolated model, not production pairing |
| Cross-account/host/session, inactive account, stop | PASS: isolated model |
| Pin mismatch, ciphertext tamper, replay | PASS: fresh test identities and scoped AEAD |
| Application regression discovery | PASS: 13 Vitest files, 94 tests |
| Automatic web build | PASS: latest observed 2026-10-31T02:46:41Z |
| Browser navigation | PASS: /install private readiness CTA → /account with /install return path; public Become owner absent |
| Layout | PASS: Chromium 1280×1800, 768×1024, 390×844; no horizontal overflow or page errors; native status screenshots inspected |
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