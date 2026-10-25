# Reconcile the queued Terminal add-ons

Preserve the current theme, transfer-first work and private preview. Milestone 1 remains Mac host + iPhone/iPad.

## Changes
- Keep existing hive, Combs, Demo job notices and in-app bee lock; do not rebuild completed features.
- Clarify the pairing screen's planned outbound relay flow, per-device keys, one-time expiring token and explicit Mac approval. The current QR remains a clearly non-scannable Demo.
- Make Demo Test Connection results explicitly ineligible for real acceptance; keep a real-test control unavailable until a verified companion exists.
- Update the queue and architecture notes for tmux resume after closing/locking the phone, completion notification pass/fail and secrets-masked logs, cancellation, consent-based Explain This and revocable read-only sharing.
- Keep real host connections, locked-phone notifications and sharing unavailable; no software installs, public links or publishing.

## Verification
Run relevant pairing/terminal/job tests and check pairing screens at phone/tablet/desktop sizes. Record what was checked and retain the physical two-network transfer and real Mac acceptance blockers.

## Technical details
The existing browser-safe Demo connection helper will expose Demo status rather than a real connected state. No relay, native transport or backend authorization changes are included. Native acceptance requires a real paired Mac executing `echo 'Honeycomb connected'`, durable tmux session identity across a signal drop, and revoked-device rejection.