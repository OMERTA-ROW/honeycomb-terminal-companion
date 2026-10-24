# Actual companion and connection implementation plan

Planning only, 2026-10-24. No companion, native package, account service, transport, keys, relay, real shell, deployment, paid service or recurring update automation has been created. This work does not authorize real remote access. Retain the isolated simulated web preview.

## First-host options

| Option | First concrete spike | Strengths | Dependencies / risks |
|---|---|---|---|
| macOS first (provisional recommendation if owner has a test Mac) | Local owner-launched, unprivileged companion opens a PTY with the user's login shell; compare cwd, env, `which git`, resize and Ctrl+C | Unix PTY plus direct iPad-to-Mac test path | Test Intel/Apple Silicon as scoped; signing/notarization credentials later; Keychain/Secure Enclave supported algorithms; sleep, firewall, permissions and launch agent lifecycle |
| Linux first | Unprivileged PTY and supervised persistent session on a declared distro; validate reconnect locally | Straightforward PTY/tmux feasibility and inspectable host lifecycle | Choose distro/session manager; desktop permission/secret-service differences; TPM non-exportable keys are not universal; packaging/update variation |
| Windows first | User-scoped ConPTY with PowerShell, UTF-8 and resize/interrupt tests | Reaches Windows-only owner test hardware early | Minimum supported Windows version, ConPTY differences, service/user-session separation, Credential Manager/CNG/TPM feasibility, installer/signing and console application compatibility |

**Decision gate:** owner identifies available authorized host and physical iPad/phone; run local-only PTY/key-store/persistence spikes without network access, accounts or paid distribution. Record supported OS versions, hardware, failure modes and spike evidence before selecting first host. Do not advertise universal compatibility. macOS is a proposed first choice, not a decision or implementation.

## Gated work sequence

### 1. Host companion feasibility — local, no remote access
- Choose a maintained native PTY adapter (`portable-pty`/Rust or a reviewed equivalent); use ConPTY on Windows. Do not implement shell parsing or a terminal emulator from scratch.
- Run under the signed-in OS user, never root/system; use the user's actual login shell/home/env and preserve host file permissions. Owner-visible stop/revoke controls are mandatory.
- Prototype a detached supervisor/session broker so the UI/network process can restart without killing the PTY. Assess tmux on Unix as an optional dependency, not a universal prerequisite; Windows needs its own session supervisor.
- Acceptance: tool paths match local terminal, cwd/user correct, Unicode output, resize, exit code, Ctrl+C and an interactive editor work. No access tokens/passwords in logs.

### 2. Native mobile input and protected keys
- Propose a shared native client (e.g. React Native) outside this web project's runtime; validate a maintained terminal rendering/input engine before packaging. This repository remains TanStack Start.
- Test iPad first, then iPhone and Android independently: keyboard viewport/safe areas, touch selection, clipboard, Esc/Control/arrows, key combinations, modifiers, screen readers and landscape.
- Generate per-device signing keys on device; keep private keys in native protected keystores, never browser storage. iOS Secure Enclave and Android Keystore hardware support/algorithms require capability tests; macOS Secure Enclave/Keychain and Windows TPM/CNG are conditional, Linux TPM availability varies. Non-exportability is a release gate where promised, not an assumption. Declare unsupported platforms rather than silently claim equivalent guarantees.

### 3. Identity and owner-authorized pairing
- Separate identity from authority: account membership discovers candidate hosts only; a local host owner must explicitly approve a particular mobile public key, host identity and requested capabilities.
- Once authorized to add backend services, enable approved identity/rendezvous infrastructure; this preview has none and no service is enabled by this plan. Apply worker/server-function rules before any server implementation.
- Host creates short-lived, single-use pairing challenge with expiry, attempt limits and replay protection. Show matching confirmation fingerprint/code on both devices; bind host identity, device public key, challenge and protocol version to a signed transcript. A six-digit display code alone is not authentication or a secret transport key.
- Require proof of device key possession and affirmative host-owner consent; mint scoped authorization only after both checks. No customer passwords handled in the companion.
- Store approved public keys/authorization on host; native private keys never leave devices. Second launch connects without reapproval only while authorization remains valid. Device removal deletes client authorization/keys where supported and denies reconnect at the host, even if rendezvous still lists the host.
- Acceptance: expiry, replay, wrong code, swapped identities, unauthorized member, stolen/revoked device and pairing rejection all fail; logs contain no private keys/tokens.

### 4. End-to-end encrypted transport
- Compare a vetted mutually authenticated protocol/library (e.g. reviewed Noise implementation) with an audited WebRTC data-channel design bound to verified device identities. Select after threat modeling; HTTPS or an unverified relay alone is insufficient for E2E claims.
- Encrypt authenticated session payloads endpoint-to-endpoint with fresh ephemeral keys, replay protection, explicit protocol versions and no downgrade path; bind connection to host authorization. Never invent cryptography.
- Start with explicitly authorized local-network test transport. Later evaluate NAT traversal and optional opaque relay; neither relay nor discovery may read shell content or grant access. Measure direct success rate and relay bandwidth before purchasing/enabling relay service.
- Dependencies: reviewed crypto library compatible with native keystores, identity binding, rendezvous contract, packet capture tooling, test networks and security review.
- Acceptance: unauthorized peers cannot open a stream; relay capture contains no plaintext commands/output; tampering/replay/revocation fail. Test local and NAT networks separately; encryption claims require evidence.

### 5. Persistent shell and honest availability
- Host supervisor owns PTY session IDs, lifecycle and bounded scrollback, independent of mobile socket. Resume requires current authorization plus a session-bound resume capability; IDs alone never grant access.
- Define sequenced output/ack/replay and input delivery semantics. Never automatically replay uncertain/destructive input after a drop; tell the user when delivery cannot be confirmed. Bound memory/disk use and protect stored scrollback.
- Authenticate heartbeats; use stale/unknown/unreachable when sleep cannot be proven. Implement OS sleep/permission signals per platform. Do not call unreachable hosts “asleep” without evidence.
- Acceptance: 30 seconds of airplane mode resumes the same shell, PID/cwd/job and scrollback; host reboot/exit is reported as session ended, not resumed. Revocation denies new/resumed streams and tears down an active stream according to an explicit host-owner policy. Preserve host work where safe without permitting revoked control.

### 6. Updates, release qualification and cost gate
- Separate signed UI/transport updates from the session supervisor; drain new work, defer unsafe replacement while sessions are active, and test recovery across supervisor changes. Support signed staged artifacts and rollback to known-good versions where platform distribution permits; document App Store rollback limitations.
- Fault-inject interrupted install, corrupted artifact, failed startup and incompatible protocol with active host work. Define security-patch response and rollback/runbook before a release. Do not activate recurring automation or deploy from this plan.
- Run native acceptance from `SPEC.md` on each declared platform; physical devices and actual keyboards required, not viewport emulation alone.
- Cost worksheet: $20/user/year proposed revenue less payment fees, taxes as applicable, measured direct/relay use, storage, support, updates and sustainable margin. Validate device limits and abuse caps. Hosted compute and heavy relay are separately costed, not bundled assumptions. No subscription or billing activation without further owner authorization.

## Inputs needed before actual implementation
- Owner's first authorized test OS/version/hardware and physical iPad/phone availability.
- Explicit authorization for local companion execution, then for any real-device network test; the current no-real-access constraint remains until changed.
- Selected native packaging/keystore/PTY libraries after spikes, security review availability, and later distribution credentials provided securely (never in source/chat).
- Later approval for identity/rendezvous/relay infrastructure and associated costs. No paid accounts/services or public rollout implied.

**Definition of done:** a chosen supported host and a physical mobile device meet owner-authorized pairing, actual user-shell, E2E verification, persistent reconnect, revoke and session-safe update tests with recorded evidence. Until then label every remote capability unimplemented or simulated.