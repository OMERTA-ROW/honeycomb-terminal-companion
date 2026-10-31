# Honeycomb Terminal Companion — private local acceptance core

Status, 2026-10-31: **runnable source, not a remote companion release.** No
macOS build/hardware verification, signed binary, installer or download exists.
The web terminal still runs Demo commands. This code opens no sockets, serves
no HTTP and cannot be reached from a phone. No production backend was changed.

## Implemented

- Real Unix PTY with bounded input, terminal resize, user shell, temporary-test
  working directory and process-group shutdown. The local CLI refuses root,
  requires an interactive console and explicit local consent.
- Ephemeral host-side pairing model: 120-second single-use tokens, five attempts
  per issued token, explicit host approval, account/host/device/session scope,
  monotonic input authorization, revocation and stop. No global internet rate
  limiter or durable trust store exists; this model is not remotely exposed.
- X25519 key agreement, HKDF-SHA256 directional keys and AES-GCM scoped frames,
  peer fingerprint pinning, tamper/replay rejection using the cryptography
  library. Peer fingerprints must come from independently authenticated pairing;
  encryption alone does not authenticate a user. Keys stay in test memory and
  must be regenerated each run; do not persist/reuse channel keys or counters.
- In-process authorized encrypted input/output adapter, verified against a real
  sandbox shell and denied after revocation. Its account verifier is a fixture,
  not a deployed identity connection. Never replace it with a browser flag.
- Bounded fixed-code security events, never shell input/output, email or secrets.

## Owner Mac preparation and local installation

Requires macOS, Python 3.11+ already installed by the owner, project source,
outbound package downloads, and a normal user account. No Apple paid membership
is required for this local source test. Do not use sudo. Dependencies install
inside a virtual environment; this does not install a system service.

Run from the project root in Terminal.app:

```bash
python3 -m venv companion/.venv
companion/.venv/bin/python -m pip install -r companion/requirements.txt
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb doctor
PYTHONPATH=companion companion/.venv/bin/python -m unittest discover -s companion/tests -v
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb local-shell
```

For local-shell, type `ALLOW LOCAL SHELL` at the consent prompt. It launches your
own login shell in your home directory, **not an isolated project sandbox**.
Use harmless `whoami`, `pwd`, `which git` and `printf 'Honeycomb %s\n' connected`;
compare with Terminal.app. Type `exit` to stop. This is a real LOCAL shell, not
mobile pairing or Omni autonomous execution. Never enter secrets for testing.
No commands/outputs are saved by the companion. Test fixtures use disposable
temporary directories and do not create application accounts or send email.

## Pass/fail evidence

- PASS in Linux sandbox: 17 isolated tests, including real PTY output and
  encrypted input/output → revocation denies further input/output.
- PASS: token expiry/reuse/attempt limit, host approval, cross-account/host/
  session denial, inactive-account denial, stop, tamper/replay/key-pin rejection.
- NOT RUN: Mac CLI, macOS shell/permissions, physical keyboard, iPhone/iPad PWA,
  different-network connection, mobile clipboard, background behavior, tmux,
  signing/notarization/install/update. Sandbox success is not Mac acceptance.

## Minimum remaining implementation gates

1. Verify this source on an owner-authorized Mac. Add native menu-bar consent,
   Keychain/non-exportable host identity and protected durable trust storage.
2. Implement host enrollment tied to provider-verified private membership and
   account/session revocation. Existing file-transfer trust does not grant shell
   access. No sample host or last-seen timestamp is connectivity evidence.
3. Supply a reviewed outbound authenticated relay supporting both Mac and PWA;
   this project's server-function runtime cannot host a persistent shell daemon.
   Relay hosting/capacity/private access need owner approval; none provisioned.
   No port forwarding, unauthenticated endpoint or public shell is acceptable.
4. Implement verified single-use QR containing host identity, host-side device
   confirmation, bound capabilities and revocation on every message. Integrate
   PWA cryptography, fresh reconnect keys and server-side membership verification.
5. Add host tmux/session supervision, bounded scrollback and live status based on
   authenticated heartbeats; label offline/unknown honestly, never infer sleep.
6. Connect terminal controls only after the above. Autonomous money, deletion,
   credentials, public publication and external messages need per-task approval;
   shell shortcut warnings are not a security sandbox. No autonomous dispatch yet.
7. Optional signed distribution needs Developer ID/notarization credentials and
   signing access supplied securely by the owner; no purchases made here.

## Smallest physical remote acceptance (BLOCKED until gates 2–5)

1. Sign in as verified owner; issue a member invitation, accept with that person's
   own login. Confirm nonmember/removed member and cross-account hosts are denied.
2. On Mac approve a named iPhone/iPad via one-use expiring QR; reject wrong,
   expired, reused and revoked proofs. Pairing approval is performed on the Mac.
3. Phone on cellular, awake Mac on home Wi-Fi: execute
   `printf 'Honeycomb %s\n' connected`; verify actual Mac output and session ID.
4. Test input, resize, Ctrl+C, history, selected output copy and selected input
   paste. Phone airplane mode 30 seconds: reconnect to same host tmux session.
5. Revoke device during execution; deny subsequent input/output/reconnect. Stop
   on host; verify session closed. Logs contain event codes, not credentials.
6. Test Mac sleep/offline, OS permission refusal and expired account session.
   No Demo result can satisfy any remote acceptance step.
