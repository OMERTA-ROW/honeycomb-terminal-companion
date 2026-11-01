# Honeycomb Terminal Companion — private local acceptance core

## Current repair — 2026-11-01 (supersedes historical status below)
Private TLS `lan-serve` with Mac-console one-use pairing, real PTY, reconnect, heartbeat and Inbox is implemented; Linux sandbox checks are not Mac acceptance. Account-link code is separate from device shell code. Preserve existing installed state/keys; no automatic reset/update. Full repair report: `../docs/CONNECTION_REPAIR_2026-11-01.md`.

An already authorized Tailscale network may use explicitly selected `--bind 100.x.x.x` (100.64.0.0/10); the address must belong to this Mac. Binding remains one interface, TLS and Mac approval remain required. Do not use public Serve/Funnel or port-forwarding. No auto-discovery or Tailscale configuration is performed, and physical cross-network acceptance is pending.

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

## Local desktop workspace, diagnostics and VS Code

These commands require a normal user's interactive console and a separate typed
consent for each action. They never enroll a host or dispatch from the web app.
Run from the project root after the virtual-environment setup above:

```bash
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb workspace-init
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb workspace-open
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb workspace-scan
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb vscode-open
```

Default dedicated folder: `~/Desktop/Honeycomb Workspace`, with `projects`,
`exports`, `session-logs` and hidden `.review`. Override using `--workspace`
with an owner-selected new dedicated path. Existing unrelated folders are
refused. Finder open and editor launch are macOS-only. The projects folder
is not a shell sandbox; VS Code may load project settings/extensions, so only
open projects you trust and retain VS Code Workspace Trust protections.

Scan reads only top-level exports: maximum 500 entries and 64 MiB per file,
skipping symlinks, directories and unsupported files. Reports actual filesystem
capacity and exact SHA-256 duplicate groups; not similar-photo detection,
system cleanup, malware scanning or unused-app analysis. It never scans projects
or captures shell logs. Filenames are displayed locally, not sent or persisted
in an audit service. Do not share unredacted diagnostics containing private names.

For two owner-reviewed independent duplicate copies, preserve one and move the
other into reversible local review (nothing deleted, zero bytes recovered):

```bash
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb workspace-quarantine --selected copy.txt --keeper original.txt
PYTHONPATH=companion companion/.venv/bin/python -m honeycomb workspace-restore --review-id YOUR_LOCAL_REVIEW_ID --selected copy.txt
```

Review ID is a local filename, not an auth token. Retain it for restoration.
Restore refuses to overwrite existing files. No automatic cleanup, cloud
deletion, recursive deletion or permanent purge exists. These tools are not safe
for exposure to a remote caller: durable host/account authorization, protected
directory handles and concurrency review remain required before such exposure.

VS Code must already be installed. On Mac, in VS Code's Command Palette choose
**Shell Command: Install 'code' command in PATH**, then reopen Terminal.
`doctor` checks availability without launching software. `vscode-open` invokes
only `code --new-window <approved-workspace>/projects` after consent; success
means an open request returned, not independently verified window state. It
never starts Remote Tunnels or installs an extension. Browser editing remains
blocked on a separately authenticated/authorized adapter.

Primary references (reviewed 2026-10-31):
- https://code.visualstudio.com/docs/configure/command-line
- https://code.visualstudio.com/docs/remote/tunnels
- https://developer.apple.com/documentation/localauthentication

Biometrics: no Honeycomb passkey/Touch ID/Face ID enrollment or unlock is
implemented. Managed account sign-in has no supported passkey method here.
Your Google/device provider may independently use its own device verification;
that neither proves host pairing nor grants Honeycomb membership. A native
LocalAuthentication integration needs macOS/iOS implementation and hardware
testing; no biometric templates should ever be stored by Honeycomb.

### Troubleshooting

- `workspace_not_initialized`: run workspace-init after reviewing the selected
  dedicated path. `existing_folder_denied`: choose a new folder; do not delete
  unrelated contents to bypass this check.
- `symlink_denied`: choose a direct local directory. Desktop/cloud redirection
  may require choosing another owner-approved path; never weaken the check.
- `OS operation failed`: check normal-user folder access and installed tools.
  Do not use sudo or grant blanket Full Disk Access to run these tests.
- `vscode_cli_unavailable`: use the official PATH instruction above; no remote
  tunnel or port forwarding is needed for a local editor open.
- `not_exact_duplicate` / `original_required`: keep both files and review them;
  similar files are never cleanup candidates.
- Interrupted local shell: exit/Ctrl+D; process group closes. Frame rejection
  in the isolated adapter now closes the PTY and revokes that fixture grant.
- Mac/iPad cannot connect: expected until enrollment/relay/PWA adapter gates
  below are implemented. Reopening a Demo screen is not live reconnect.
- Account has no membership: use a legitimate owner/invite onboarding path.
  A revoked session must reauthenticate; a Google identity alone is not access.

## LIVE local-network mode (2026-10-31) — real shell, same Wi-Fi only

`lan-serve` gives a paired iPad/iPhone your normal Mac user's real shell over
HTTPS/WSS on ONE private local-network address. It refuses 0.0.0.0, public and
IPv6 addresses, requires typed consent, an 8-character 120-second single-use
code (5 tries), and typed `approve ID` in the Mac window. Approved devices get a
12-hour HttpOnly/Secure/SameSite=Strict cookie; Host and Origin are checked and
revocation is re-checked on every frame. One shell per device survives
disconnects for 30 minutes (128 KiB scrollback). Audit file holds event codes and
random device IDs only. Quitting closes every shell; nothing stays listening.
Not internet access, not tied to Honeycomb accounts, not tmux, not signed.

### Mac install (unsigned, Apple silicon or Intel, macOS built-in Python 3.9+)

```bash
xcode-select --install        # only if python3 asks for Command Line Tools
mkdir -p ~/Honeycomb && cd ~/Honeycomb
# put honeycomb-companion.pyz + .sha256 here (from Files, or build: sh companion/scripts/build-macos.sh)
shasum -a 256 -c honeycomb-companion.pyz.sha256
xattr -d com.apple.quarantine honeycomb-companion.pyz 2>/dev/null || true
python3 honeycomb-companion.pyz doctor
python3 honeycomb-companion.pyz lan-serve        # or --bind 192.168.1.20 --port 8765
```

macOS may ask to allow incoming connections for python3: Allow (private network).
Remove: quit, then `rm -rf ~/Honeycomb "~/Library/Application Support/Honeycomb"`.

### iPad/iPhone

1. Same Wi-Fi as the Mac. In Safari open the printed `https://192.168.x.x:8765`.
2. Certificate warning is expected (self-signed). Compare the SHA-256 on the
   phone page with the Mac window before continuing. Optional trust: open
   `/honeycomb-lan.cer`, install in Settings → Profile Downloaded, then enable it
   in General → About → Certificate Trust Settings (remove it afterward).
3. Enter code + device name → on Mac type `approve ID`.
4. Share → Add to Home Screen for an app icon (opens this Mac page, not the
   hosted app; offline means "Mac unreachable").

### First pairing acceptance (record PASS/FAIL)

1. Test Connection shows `Honeycomb connected` from the Mac host name.
2. Send `printf 'Honeycomb %s\n' connected; uname -s` → `Darwin` output.
3. Ctrl‑C stops `sleep 100`; arrows/Tab/external keyboard typing work.
4. Copy selection / Copy all / Paste (destructive lines ask first).
5. Airplane mode 30 s → "Mac unreachable… Retrying" → same shell returns.
6. Wrong code ×5, reused code, expired code are refused; `deny ID` gives no access.
7. On Mac `revoke ID` → phone returns to pairing; old cookie refused.
8. `quit` → phone shows unreachable; `lsof -iTCP:8765` shows nothing.

Sandbox evidence (Linux, not a Mac): 37 companion tests PASS, including real
TLS/WSS loopback shell I/O, reconnect persistence, revocation, origin/host and
code limits; built `.pyz` driven by Chromium (tablet viewport) paired, ran
commands, Test Connection, reload-reconnect and revoke: PASS. NOT RUN: macOS,
Safari/iPad, physical keyboard, mobile clipboard, real Wi-Fi.

## Pass/fail evidence

- PASS in Linux sandbox: 30 isolated tests, including real PTY output and
  encrypted input/output → revocation denies further input/output.
- PASS: token expiry/reuse/attempt limit, host approval, cross-account/host/
  session denial, inactive-account denial, stop, tamper/replay/key-pin rejection.
- PASS: workspace consent/path denial, exact-vs-similar review, preservation,
  restore non-overwrite and mocked local editor arguments; invalid input closes
  the encrypted local shell. Non-root interactive disposable CLI flow also passed.
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
