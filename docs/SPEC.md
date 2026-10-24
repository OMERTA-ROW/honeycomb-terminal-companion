# Honeycomb Terminal — Product Specification

Source: owner brief (Oct 24 2026). Canonical plan: https://app.notion.com/p/403c1161030681c98771c23caa433198 (not readable from this preview — private Notion page; reconcile when accessible).

## Product identity
- Separate product from Honeycomb Vault, Omni and Evolution.
- No Honeycomb Vault advertising inside Terminal. Promotion is one-way (Vault → Terminal).

## Core promise
Install host companion + mobile app, sign in, approve pairing once, then tap a paired host to open/resume the real host shell with its installed tools, files and permissions. No routine IP entry or connection commands.

## Platforms
- Mobile: iOS, iPadOS, Android (responsive web prototype now; native packaging not started).
- Host companion: macOS, Windows, Linux (planned). Choose a first host platform by feasibility before claiming universal support.
- Local iPad execution and cloud compute are separate products/features — not assumed.

## Requirements
1. Paired computers screen with accurate availability (online / asleep / offline / needs permission / revoked).
2. Pairing flow: one-time owner approval on host, code confirmation.
3. Terminal screen with persistent host sessions and reconnect after network drop where supported.
4. Instructions tab.
5. Keyboard accessory: Escape, Control, Tab, arrows.
6. Customizable command/key shortcuts, command preview, destructive-action confirmation.
7. Touch selection, copy, paste; external keyboard support.
8. Actionable errors: asleep, offline, permission, connection. Host must be awake and reachable.
9. Security: authenticated pairing, encrypted transport, protected device keys (Secure Enclave/Keystore/TPM), device revocation, owner authorization mandatory.
10. Advanced settings kept out of ordinary setup.
11. Updates: tested patches staged at safe times, preserving active sessions; rollback/recovery where supported. No automation activated.

## Commercial (unvalidated — no billing activated)
- Proposed $20/user/year across devices.
- Unvalidated: device limits, relay costs, payment fees, support costs, margins.

## Preview constraints
- Private, unpublished. No deployment, no public sharing, no subscriptions, no paid services.
- No real customer passwords, no remote host access. All hosts, pairing, terminal output labelled sample/simulated.

## Native acceptance tests (to run once companion + transport exist)
- Pair new device: approve on host once; second launch opens without re-approval.
- Tap online host → real shell in user's home dir, `which git` matches host.
- Airplane mode 30 s → reconnect resumes same session (tmux-like persistence) and scrollback.
- Host sleep → status "Asleep" within 60 s; offline → "Offline"; permission revoked in OS → "Needs permission".
- Revoke device on host → mobile shows "Revoked", cannot open shell, keys deleted.
- Transport traffic is end-to-end encrypted (verified via capture); device private key non-exportable.
- External keyboard: Ctrl+C interrupts, arrows navigate history, Esc reaches vim.
- Update staged while session active does not drop session; failed update rolls back.
