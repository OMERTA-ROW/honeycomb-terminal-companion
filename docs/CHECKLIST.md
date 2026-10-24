# Implementation checklist

Legend: [x] Working in preview · [~] Prototype / simulated UI · [ ] Blocked / not started

## Preview (web, responsive iPad/phone)
- [~] Paired computers list — sample hosts, simulated status (not live availability)
- [~] Pairing flow — simulated code + approval; no keys generated
- [~] Terminal screen — simulated shell; no command executes anywhere
- [~] Reconnect after drop — banner + resume message simulated; browser offline event detected
- [x] Instructions tab
- [x] Keyboard accessory: Esc, sticky Ctrl, Tab, arrows (↑/↓ history; ←/→ focus only)
- [x] Custom shortcuts — add/remove, saved on this device
- [x] Command preview before every shortcut; destructive commands require confirmation
- [x] Copy selection / paste from clipboard (browser permission required)
- [x] External keyboard: Enter, arrows, Tab, Esc, Ctrl+C/L/U
- [x] Revoke device (sample) → host shows Revoked, shell blocked
- [x] Actionable messages for asleep / offline / permission / revoked
- [x] All sample/simulated content labelled; no Vault advertising

## Blocked / not started (native & backend)
- [ ] Host companion (macOS/Windows/Linux) — first-host feasibility decision pending
- [ ] Mobile packaging iOS/iPadOS/Android
- [ ] Accounts & sign-in
- [ ] Authenticated pairing, device key storage, encrypted transport, relay
- [ ] Real availability signal, persistent host sessions
- [ ] Update staging / rollback (no automation activated)
- [ ] Billing ($20/user/year proposed; costs unvalidated; not activated)
- [ ] Reconcile with canonical Notion plan (page not accessible from preview)
