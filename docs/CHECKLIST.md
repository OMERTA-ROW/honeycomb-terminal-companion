# Implementation checklist

Legend: [x] Working in preview · [~] Prototype / simulated UI · [ ] Blocked / not started

## Preview (web, responsive iPad/phone)
- [~] Paired computers list — sample hosts, simulated status (not live availability)
- [~] Pairing flow — simulated code + approval; no keys generated
- [~] Terminal screen — simulated shell; no command executes anywhere
- [~] Reconnect after drop — banner + resume message simulated; browser offline event detected
- [x] Instructions tab — key explanations, safe simulated command examples
- [x] Keyboard accessory: Esc, sticky Ctrl, Tab, arrows (↑/↓ history + draft restoration; ←/→ cursor movement + selection collapse)
- [x] Custom command and supported key-combination shortcuts — add/remove, saved on this device when storage is available
- [x] Command preview before every shortcut; destructive commands require confirmation
- [x] Copy selection / paste at cursor or replace selection; success/denial feedback (browser permission required)
- [x] External keyboard event handling: Enter, arrows, Tab, Esc, Ctrl+C/L/U; automation only, physical keyboards pending
- [x] Revoke device (sample) → host shows Revoked, shell blocked
- [x] Actionable messages for asleep / offline / permission / revoked
- [x] All sample/simulated content labelled; no Vault advertising
- [x] Phone/tablet viewport automation and screenshot inspection; physical devices not tested
- [x] Copied canonical plan reconciled requirement by requirement in GAP_CHECKLIST.md
- [x] Concrete gated companion/security/persistence plan in IMPLEMENTATION_PLAN.md; planning only
- [x] Actual checks and limitations recorded in VERIFICATION.md

## Blocked / not started (native & backend)
- [ ] Host companion (macOS/Windows/Linux) — first-host feasibility decision pending
- [ ] Mobile packaging iOS/iPadOS/Android
- [ ] Accounts & sign-in
- [ ] Authenticated pairing, device key storage, encrypted transport, relay
- [ ] Real availability signal, persistent host sessions
- [ ] Update staging / rollback (no automation activated)
- [ ] Billing ($20/user/year proposed; costs unvalidated; not activated)
- [ ] Physical iPad/iPhone/Android and hardware keyboard testing — authorized test hardware needed
