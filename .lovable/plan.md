# Real selected-file transfer

Preserve the black-and-gold Terminal and its existing simulated shell/jobs. Add a separate **File transfer** experience; do not modify Vault.

## Working slice
- Reuse the newly connected Lovable Cloud account system for sign-in and device registration.
- Register named browser devices with a device-held key. Pair two devices on the same account using a scannable QR or manual code, expiry, single-use consumption, enforced attempt limits and explicit approval showing the requesting device name.
- Require the sender to select each file and approve its named recipient. Guardian checks account, device possession, pairing, individual-file permission and revocation at every access boundary.
- Transfer actual bytes through a private HTTPS relay, with observable upload/download progress, cancellation, failure and SHA-256 integrity verification. No public download links, whole-filesystem access or automatic sync.
- Show an audit trail containing action/time/device/transfer identifiers, never pairing credentials or file contents.
- Provide the selected-project Omni handoff surface with diff/test evidence and approval/rollback gates, visibly unavailable until a real enhancement API is connected. Do not substitute Omni's analytics connector for a coding API.

## Boundaries and assumptions
- First slice pairs two signed-in browser devices belonging to the **same account**; cross-account sharing is excluded.
- Both clients must remain open. Browser/device keys are not a claim of hardware-backed native security. iOS/Android background transfer and companion installs remain unavailable.
- HTTPS relay protection is **not** an end-to-end encryption claim. Cloud infrastructure can process transferred bytes.
- Use a conservative small-file cap and temporary relay retention, displayed explicitly; no paid relay service or unattended cleanup schedule will be enabled.

## Technical approach
- Authenticated TanStack server functions and database-enforced atomic pairing/governance operations; private relay data inaccessible to anonymous users or ordinary direct table writes.
- Short-lived device proof challenges, single-use nonces and browser-held signing keys; account membership alone cannot impersonate another registered device.
- Store durable authorization and audit records in Cloud, not local simulated-host storage. No long-lived signed download URL that bypasses revocation.
- Keep shared validation/integrity logic testable separately; add integration checks against the actual authorization boundary.

## Verification and report
- Test expired/replayed pairing, failed-attempt lockout, wrong-account/device access, denied files, revocation, cancellation and corrupted-byte rejection.
- Exercise registration → pairing → named approval → selected-file transfer → verified download in two isolated browser clients, where account access permits.
- Check phone/tablet/desktop presentation and existing Terminal tests; inspect the automatic build result.
- Record exact commands/results, changed files and what remains untested, including real cross-network devices. Keep everything unpublished.