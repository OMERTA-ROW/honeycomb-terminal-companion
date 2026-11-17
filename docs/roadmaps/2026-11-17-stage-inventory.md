# Honeycomb Terminal — feature inventory and staged delivery

Status: design inventory; not a claim of implemented or verified functionality.

## Intended capabilities
- iPhone/iPad mobile terminal paired with owner-approved Mac/desktop companion; short-lived one-use pairing codes, device-bound approval, revoke and audit.
- Terminal command sessions with explicit owner consent, isolated execution, clear local/remote boundaries, session timeout and emergency stop.
- Security suite integrations: device posture, VPN integration, remote lock/wipe only for enrolled owned devices with confirmation, credential vault integration, quiet-mode alerts, audit history.
- Black/gold hive interface, silver/gold mechanical bee motifs, unobtrusive quiet mode, boot indicator.
- Subscription concept: $20/year, pending billing/compliance implementation.

## Independent stage gates
1. Architecture and threat model: inventory services, capabilities, trust boundaries, platform restrictions.
2. Authentication and pairing: replay prevention, revocation, owner approvals, QR/pairing usability.
3. Sandbox and terminal: deny-by-default network/secrets, allowlisted commands, resource limits, safe stop.
4. Device protection: platform-specific entitlements, VPN, remote lock/wipe approvals, security event trails.
5. Preproduction: integration tests, penetration review, rollback, monitoring and recovery exercises.
6. Production autonomy: bounded scopes, signed permits, quotas, human approval for destructive operations, staged rollout.

## Troubleshooting register
- Pairing: check expiration, device identity, revoked tokens, clock drift, connectivity and error classification.
- Commands: distinguish browser simulation from real host execution; verify runner, session reuse, logs and kill switch.
- iOS/iPadOS: validate OS sandbox and MDM/entitlement limits before promising device-wide actions.
- Vault/VPN: test failure modes, lost device recovery, secrets redaction, network egress and safe fallback.

## Acceptance evidence required
Each stage must link test runs, deployment SHA, device/OS matrix, owner approval, observed logs and rollback procedure. No production permission is granted by merging this document.
