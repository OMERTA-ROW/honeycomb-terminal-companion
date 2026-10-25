# Account polish and future shared identity

## Verified read-only state — 2026-10-25
The public hosted auth settings endpoint returned HTTP 200: Google and email enabled, Apple/Microsoft/phone disabled, signup allowed, email auto-confirm off. It did not report a Lovable flag. The existing transfer page has Google/Lovable sign-in, sign-out, browser-device revocation and Guardian audit events. The configured preview origin is in the hosted callback allow-list. Account count is zero. Provider buttons/configuration are not successful OAuth evidence.

Missing email signup/login and recovery pages are queued pending the owner profile-data decision. Keep email confirmation enabled; recovery must use an explicit recovery session and password update, not normal automatic sign-in. No credentials belong in chat or audit output.

## Authorization distinctions
- Account session proves the account; device signature and one-use proof prove the registered browser device. Guardian still decides each pairing/file grant.
- Signing out a browser is not device revocation. Device revocation must deny subsequent chunks/proofs and terminate transfer access; account-wide session revocation is a separate operation, with hosted semantics tested before claiming immediate token invalidation.
- Ordinary accounts must never see another account's devices, transfers or audit. Audit contains event/time/device identifiers, not file contents, pairing codes, private keys, bearer tokens or raw command logs.
- Transfer pairing is not shell, project, editor or creative-task permission.

## Future Vault shared-identity contract (not SSO)
Honeycomb Terminal and Vault remain separate products. A future mutually approved identity issuer could identify an account through a stable opaque subject, verified issuer/audience and product-specific consent. Each product independently authorizes its own resources and scopes; Terminal device trust/file grants cannot become Vault access or vice versa. No shared passwords, browser-token copies, database sharing or assumed account matching by email. Cross-product session/revocation semantics, recovery and migration need threat review and end-to-end evidence before connection. No Vault change or advertising is made here.

## Acceptance still pending
Owner first sign-in; actual Google/Lovable callback; email signup confirmation and recovery email; sign-out cache/download cleanup; expired session denial; own-account device/file operations and other-account denial; two approved foreground clients transfer intact bytes and revoked client is denied. Do not manufacture accounts or treat isolated SQL/unit tests as hosted OAuth acceptance.