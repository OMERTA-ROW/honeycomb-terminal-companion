# Authorized transfer-first and creative milestones — 2026-10-25

Source: owner conversation requirements, not a claim that a private Notion document was read. Canonical reference: https://app.notion.com/p/403c1161030681c98771c23caa433198.

## Roles and order
Omni is parent/orchestrator and future enhancement provider. Honeycomb performs device pairing and selected-file transfer. Guardian is deterministic authorization, not malware scanning. Vault remains a separate password/security product and is not modified.

1. Verify secure pairing and selected-file transfers first.
2. Creative enhancement follows that verified gate. Current creative controls only save local preview drafts, never dispatch jobs.

## Implemented transfer source and deployment boundary
`/transfer` uses authenticated TanStack functions, P-256 browser signatures binding each operation/payload to a 60-second one-use proof, service-only atomic Guardian database operations, and private 64 KiB byte chunks. Direct authenticated/anonymous database access cannot read or mutate transfer data. Same-account clients only. No public/signed download URL bypasses revocation.

Named-device registration stores a non-exportable signing key in IndexedDB. This is not hardware-backed: same-origin script compromise can use it. Clearing browser data loses identity. Account access alone cannot impersonate a device signature. Pairing code is 64 random bits rendered as QR/plain text, valid 120 seconds, single claim, five attempts per device per ten minutes. Issuer must explicitly approve the claimant name before trust is created. Revocation blocks subsequent chunks and cancels active relay files. Previously downloaded copies cannot be recalled.

Sender selects individual files and explicitly grants each to a named approved recipient. Upload and download report actual byte progress. SHA-256 is checked in the database before readiness and again in the recipient browser before a save link exists. Maximum 5 MiB, 20 active files/account, 12 active devices/account. Expiry after one hour immediately denies access; bytes are purged opportunistically on account activity, receipt, cancellation or revocation. No unattended cleanup schedule exists; inactive expired bytes may remain stored until later activity. Audit records contain event/time/device/resource IDs, never pairing codes, signatures or contents.

HTTPS protects transport; relay infrastructure processes plaintext bytes. **Not end-to-end encryption.** No malware scanner. Keep both browser clients foreground/awake: a recent heartbeat is only an availability hint, not guaranteed connectivity. Phone/tablet/laptop/desktop directions are desired where WebCrypto/IndexedDB/file selection/download are supported; physical Safari/iOS/Android and different-network acceptance remain pending. No sync, blanket filesystem access, unattended mobile access, shell execution or host companion is added.

Browser network type is not reliably available, especially iOS. Native Wi-Fi-only enforcement remains unavailable; the device-care simulated Wi-Fi setting does not enforce this real transfer path. Users must select Wi-Fi themselves; cellular may incur charges. No billing/paid provisioning/publication.

## Two-client smallest real acceptance gate
Sign in with the same account on phone/tablet cellular and desktop/laptop home Wi-Fi (or two independently verified internet networks). Register descriptive names; create code on A, enter/scanned code on B, verify B's name and approve on A. Send a selected disposable document, verify both declared size and SHA-256, save and independently compare bytes. Repeat reverse direction. Deny unapproved C, test expired/replayed code, revoke B on A and verify later access is denied. Keep both foreground. Record browser/OS/network/actual results; same-machine automation does not establish different-network support.

## Creative task architecture boundary (not implemented host execution)
Mobile typed/natural-language instruction selects a specifically approved desktop/laptop and approved project. Unity and video/movie work require an installed authorized companion and per-tool adapters on that host. Capability negotiation returns verified tool/version/project permissions, not guessed availability. No website-only Unity/editor execution.

Omni receives a scoped job request; Guardian validates current account/device trust, exact project, allowed commands and separate approvals for destructive operations, external messages, publication/deployment and spending. Idempotency key/unique durable job ID must be committed before dispatch; host persists accepted IDs, execution/result/checkpoint state so reconnect never repeats work. Offline queue requires expiry/revalidation after reconnect; cancellation tombstone must win against delayed dispatch. Existing preview drafts have UUIDs but no real queue or authorization.

Host creates disposable versioned copy/worktree/checkpoint, proposes diff, runs allowed tests/build or render, reports authentic logs/artifact hashes, and waits for review before applying to original. Apply requires explicit approval plus original-version match; rollback restores an authenticated checkpoint, not a simulated success. Host owns persistence; mobile background execution is unnecessary. UI retrieval/apply/rollback stay disabled without evidence.

### First Unity acceptance
Owner-approved tiny change (e.g. cube color) in a disposable project copy on an awake paired Mac/desktop with verified Unity version/license and adapter. Guardian approves exact project and commands. Submit one UUID, disconnect/reconnect and prove exactly one run. Compare diff, run project tests/build, retrieve actual preview/build artifact and verify hash. Confirm originals unchanged before apply approval; apply approved diff and exercise checkpoint rollback. Revoke requesting device and deny subsequent execution/output retrieval. This test has **not** run; no Unity installation, project modification, repository connection or installer exists.

### Video adapter
Actual editor selection is pending. Adapter must use its supported automation/export API and installed version/license; no claim of universal arbitrary editor control. Render evidence and output retrieval remain unavailable.

### Desktop-browser document submission
Future selected document transfer to an awake approved desktop plus authorized browser interaction for sites with failing mobile upload workflows; phone cellular and desktop Wi-Fi may differ. Website support is per-site capability, not universal. User signs in and retains explicit final submission/publication approval. No bypass of site authentication/security/restrictions. Current transfer only delivers bytes to a foreground browser save action; it does not operate another desktop browser or publish documents.

## Host prerequisites and artifacts
No companion binary, installer/download link, native iOS/Android app, Unity/video/browser adapter, Omni API, GitHub repository access, signing/notarization or hardware acceptance evidence exists. Unavailable actions stay disabled. Owner plans repositories for future handoff; no access is assumed. Source is in this project only; no downloadable archive was requested. Keep private/unpublished.
