# Honeycomb operational onboarding & connection log (living)

Rule: a stage is PASS only with evidence from the real path it names. Sandbox,
mock, Demo, or browser-navigation results are recorded as "Sandbox" and never as
device PASS. Update this table whenever a stage is attempted.

Status key: PASS (real device evidence) · Sandbox (real code, sandbox only) ·
NOT RUN · BLOCKED (named prerequisite) · FAIL (with fix).

| # | Stage | Expected | Actual (latest) | Evidence | Status | Blocker / next action |
|---|---|---|---|---|---|---|
| 1 | Login | Owner signs in privately; ordinary sign-up refused | Login works; not success on its own | Existing auth tests | Sandbox | Owner signs in on iPhone/iPad |
| 2 | Verification | Verified email/owner role recognised | Owner bootstrap server-side only | Isolated owner tests | Sandbox | Owner confirms role on device |
| 3 | Mac Helper install | Zip downloaded once, Start Honeycomb opens, doctor passes | Zip has starter, program, read-me; runs in Linux sandbox | Download format check 2026-10-31 | Sandbox | Owner runs on real Mac |
| 4 | Account-linked host | Mac appears under owner account | Not built; Mac console approval is the only gate | — | BLOCKED | Build account-device enrollment after stage 8 passes |
| 5 | Pairing QR | Camera scan opens Mac page with code filled; 120 s single use | Real QR built; decoded by zbar; browser prefill, reuse refused | test_qr.py (8), run_qr.py 2026-10-31 | Sandbox | Owner scans on iPhone/iPad. Earlier FAIL: /pair QR was decorative Demo grid; transfer QR held a bare code — both fixed |
| 6 | Secure terminal | TLS, fingerprint match, Mac approve, Connected | Connected after approve; cert warning skipped by harness | test_lan.py, run_qr.py | Sandbox | Owner verifies Safari "Show Details" fingerprint |
| 7 | Real command | `pwd` prints Mac home | Printed host home (Linux) | run_qr.py | Sandbox | Owner runs `pwd` on Mac |
| 8 | Reconnect | Reload/lock resumes same session | Reload kept scrollback | run_qr.py | Sandbox | Owner locks phone 30 s |
| 9 | Revoke | Mac `revoke ID` returns phone to pairing; reconnect refused | Passed | run_qr.py, test_lan.py | Sandbox | Owner revokes on Mac |
| 10 | Different network | Works over cellular | Not built | — | BLOCKED | Owner-approved private relay |
| 11 | AI connector | Agent connects with scoped permissions | Catalog only; nothing Connected | connectors.test.ts | BLOCKED | Stages 4 and 8 on real devices first |

Demo (simulated hosts, /pair) is never counted in this log.
