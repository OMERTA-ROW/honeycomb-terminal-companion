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
