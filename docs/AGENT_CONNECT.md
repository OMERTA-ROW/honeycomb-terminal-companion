# Honeycomb Agent Connect — future design (owner-approved 2026-10-31, NOT IMPLEMENTED)

Status: planned. Secondary to QuickConnect real-Mac first-run acceptance; must not change it.
Nothing below is installed, connected or tested. No credentials have been collected.

## Goal
Optional, provider-neutral "doors" letting a user connect AI agents of their choice to their own paired computers/projects, with explicit scopes and revocation.

## Providers and honest capability classes
| Provider | Door | Capability class | Status |
|---|---|---|---|
| Codex CLI | Approved local CLI adapter on the paired Mac (companion launches it in a scoped project folder) | Coding agent: read, propose edits, run approved commands | Planned |
| Claude Code CLI | Approved local CLI adapter on the paired Mac | Coding agent: same as above | Planned |
| Custom compatible agent | MCP (Honeycomb as server, OAuth-scoped) or scoped authenticated API | Depends on granted scopes | Planned |
| Perplexity | Server-side research API only | Research/search answers — NO terminal, file-edit or MCP shell capability | Planned |

Perplexity must never be presented as having coding-agent, MCP-server or terminal abilities.

## Rules
- Multiple agent profiles per account; each profile bound to specific computers + project folders.
- Scopes are distinct and default-off: `read` (list/read files in scoped folders), `propose` (diffs for review), `edit` (apply after user approval), `command` (each command or allowlisted template approved). No blanket shell, no home-directory scope.
- Credentials are user-managed: API keys stored only server-side as encrypted secrets or kept on the Mac in the companion (CLI logins stay in the CLI's own store). Never in browser storage, chat, logs or audit.
- Explicit connect / disconnect / revoke per profile; revoke is checked on every request/frame (same pattern as lan-serve).
- Audit: event codes, profile id, scope, approve/deny — never prompts, file contents, tokens or output.
- UI states: Planned / Unavailable / Installed (adapter present, evidence) / Connected (auth verified) / Tested (owner check passed). Never show Connected without evidence.
- Guardian enforces scopes; Omni may orchestrate but grants nothing implicitly.

## Prerequisites / blockers
- QuickConnect real-device acceptance passed first.
- Account-linked companion enrollment (today lan-serve is not tied to accounts).
- For internet use: owner-approved private relay.
- MCP server needs OAuth activation and a publish decision (owner forbids publishing so far).
- Perplexity needs the owner to choose a connection; nothing connected now.

## Agent-to-Device QuickConnect (owner-approved 2026-10-31, contract only)
Goal: a command like "Connect Honeycomb to my Mac" lets an authorized agent start pairing/reconnect and hand the owner a terminal link — without repeated setup.

Implemented now: `src/lib/agent-device-contract.ts` — tool list, scopes, approval level, rate limits and a deny-by-default decision function, with tests. It is NOT connected to any MCP server, API, account or companion.

Tools: list_approved_devices, get_connection_status, request_pairing (Mac approval), request_connection (owner), open_terminal_session (owner; returns a link the owner opens — agent never sees shell I/O), disconnect_session, revoke_device (owner).
Never allowed: remote companion install/update, self-approval of enrollment, privilege elevation, keystrokes/terminal output to the agent, files outside the Inbox.

App access vs Mac access: an agent would only call Honeycomb's app tools. It never controls macOS directly. No agent (ChatGPT, Claude or other) is connected today.

Remaining prerequisites (BLOCKED):
1. QuickConnect real Mac/iPad first-run acceptance (priority).
2. Server-side device registry tied to accounts — today approved computers live only in the browser and on the Mac, so a server/agent cannot list them.
3. Account-linked companion enrollment + outbound companion channel (companion today only listens on local Wi-Fi; the hosted app cannot reach it).
4. Agent profiles table, expiring tokens, audit and rate-limit storage with RLS.
5. OAuth authorization server activation + consent page + MCP endpoint, and an owner decision to publish (the hosted endpoint only exists after publishing).
6. Owner approval UI for "owner"-level requests.
