# Honeycomb platform architecture (owner vision 2026-10-31) — feasibility vs implemented

Vision: for all invited users, one mobile-first QuickConnect experience to reach authorized capabilities that run on their OWN enrolled hosts (Mac/Windows/Linux desktops, approved cloud computers) and supported AI agents. Phones are controllers only: execution always happens on the enrolled host/cloud, never by bypassing the phone sandbox. No universal remote-control claims.

Pilot first: real Mac host + iPad/iPhone acceptance (QuickConnect first-run) before any other platform.

## User journey (provider/device neutral)
Sign in (invite) → choose: Computer · Cloud computer · Agent → enroll/approve once (host-side consent) → Connect → Terminal / Files / Approved tools → disconnect/revoke anytime.

## Platform matrix
| Role | Platform | Status |
|---|---|---|
| Controller | iPhone/iPad Safari + Home Screen | Implemented (LAN live page + web app); real-device test BLOCKED (owner) |
| Controller | Desktop browsers | Implemented, browser-tested |
| Controller | Android Chrome | Expected to work (same web page); NOT tested |
| Host | macOS (Python 3.9+ companion, unsigned) | Implemented, same-Wi-Fi only; real Mac test BLOCKED (owner) |
| Host | Linux | Companion code runs in Linux sandbox tests; no packaged installer — Planned |
| Host | Windows | Unsupported (companion uses Unix PTY; needs ConPTY port) — Planned |
| Host | Approved cloud computer | Planned; needs owner-approved provider (may cost money) |
| Transport | Same Wi-Fi (TLS, code + host approval) | Implemented |
| Transport | Cellular / different networks | BLOCKED: needs approved private relay |
| Agents | Codex/Claude CLI, MCP, Perplexity research | Design + rule contract only (docs/AGENT_CONNECT.md) |
| Unsupported by design | Running shells on the phone, Bluetooth-only shells, controlling hosts without host-side consent | Never |

## Multi-user design (planned unless noted)
- Tenant isolation: every row keyed by owning account; RLS owner-only; Guardian server functions only (existing pattern for transfers — implemented).
- Invitation/onboarding: invite-only, single-use expiring email-bound invites, owner/admin/member roles — implemented.
- Device enrollment: user-owned; host shows one-time code, host-side approval; enrollment record linked to the user's account — LAN pairing implemented, account linking planned.
- Revocation: per device, per session, per agent profile; checked every request/frame — implemented for LAN sessions and transfers; account-level planned.
- Scoped MCP/API: per-agent profiles, expiring scoped grants, owner/host approvals, rate limits — contract only.
- Status: Searching / Pairing / Connected / Offline / Permission needed, shown only from real evidence — implemented on LAN page and Terminal page.
- Audit: event codes + random ids, no content/tokens — implemented for LAN and transfers; unified audit planned.

## Expansion gates (in order)
1. Mac + iPad pilot passes on real hardware (owner).
2. Account-linked host enrollment + server device registry.
3. Owner-approved private relay (cellular).
4. Linux package, then Windows (ConPTY) host, Android controller test.
5. Cloud computers (owner approves provider/cost).
6. Agent Connect (OAuth + MCP endpoint, publish decision).
