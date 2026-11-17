# Honeycomb ↔ OMNI mobile companion integration contract

## Objective
Make Honeycomb Terminal a mobile client of the existing OMNI Mothership, not a second autonomous executor or a duplicate agent brain.

## Verified Lovable snapshot (2026-11-17)
Honeycomb Terminal Companion published/ready, Lovable commit 1b09174d9183c33949d5b2b946c9529b883b2e69. Mothership published/ready, commit 841acdabc94164f3251a66502edfe318a49d2343. Published/ready does not establish live terminal or sandbox isolation.

## Proposed client integration
- Authenticate with Mothership using existing owner identity; support passkeys/MFA and short-lived device-bound session tokens.
- Establish pairing with one-time approval and server-side revoke; never persist provider API keys or executor secrets on mobile.
- Show list of authorized OMNI agent sessions; attach to existing session; subscribe to streaming text/voice output and job status.
- Request commands through Mothership job API with signed permit and Jackboy policy validation; Honeycomb does not execute privileged commands on its own.
- Provide visible command origin, scope, cost, confirmation, emergency stop, disconnection and retry handling.
- Mobile-friendly terminal UI with black/gold Honeycomb styling, accessibility, iPhone/iPad safe-area and keyboard support.
- Fail closed on offline, expired auth, lost pairing, kill switch, revoked permit and stale job status.

## Integration stages
1. Discover actual Mothership API schema and current Honeycomb auth/session architecture; reconcile Lovable sync and deployed commits.
2. Define versioned client contract (session, pair, attach, stream, submit, cancel, revoke) and shared fixtures.
3. Implement read-only mobile session list and streaming terminal viewer.
4. Implement owner-approved pairing and command submission with policy checks.
5. Test on iOS/iPadOS and desktop, including network loss, concurrent sessions, denied commands, stop and recovery.
6. Production canary with rollback and observability.

## Verification requirements
No claim of sandbox isolation until tests show distinct execution namespaces, filesystem/process/network/secret boundaries, teardown and denied egress. No live execution enabled by this PR.

## Troubleshooting
Track pairing 403/unsupported arguments, auth QR recovery, websocket reconnect, stale session reuse, mismatch between Lovable build and deployed backend, job permit expiry and emergency stop behavior.

## Implementation note
This is a contract/specification PR. Follow-up code PRs must target existing app files only after reading actual backend interfaces; avoid inventing endpoints.
