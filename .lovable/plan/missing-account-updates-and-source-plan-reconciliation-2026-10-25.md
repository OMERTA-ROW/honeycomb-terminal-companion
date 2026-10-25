# Missing account updates and source-plan reconciliation

Preserve the existing hive design, layouts, Demo flows and transfer-first priority. The owner has approved display-name/preferences profiles and resuming development; older profile/plan pauses no longer apply.

## Missing updates
- Reuse existing login services; add a simple account entry, email signup/sign-in, confirmation notice, password recovery and profile editing. Keep email confirmation enabled.
- Add owner-only basic profiles and secret-free account security records. Support signing out this session or all account sessions, while clearly separating account sign-out from Guardian device revocation and explaining token expiry limits.
- Clear account-specific visible transfer state and downloaded file links on identity changes. Preserve device keys and existing Guardian checks.
- Reconcile the supplied plan with completed work and remaining Mac/iPhone/iPad, Android, device-care and VS Code prerequisites. Record Vault payment/passkey/privacy requirements only; no Vault features or payment integration.
- Add a quick-access Honeycomb workspace: browser-local project, export/download and session-log folders with selected-file import, reopen and export. Actual native folder opening remains unavailable; document native Files support, approved companion folder/optional desktop shortcut and truthful web Home Screen guidance.

## Verification
Run profile validation, owner-isolation/access-denial, workspace persistence/export and existing relevant tests. Check account/recovery/workspace screens at desktop/tablet/phone sizes and the automatic build result. Test signed-in read/write/sign-out only if a real account is available; do not manufacture accounts. Record OAuth/email recovery, physical transfers and native runtime tests as unverified where evidence is unavailable.

## Technical details
Use existing Lovable Cloud identity and root auth notification, owner-scoped profile policies and authenticated server functions. Account revocation must be enforced on protected application calls rather than treating refresh-token sign-out as immediate bearer invalidation. No companion installer, shell runner, platform permissions, billing or publication is introduced.