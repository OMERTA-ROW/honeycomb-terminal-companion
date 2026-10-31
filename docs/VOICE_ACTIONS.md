# Honeycomb Voice Actions — portable contract

Status: vertical slice built in Honeycomb only. Not rolled out to other projects.

## Flow
mic tap → one-time privacy opt-in → record complete WAV (≤30 s, browser) → `POST /api/transcribe` (signed-in, active session only; audio not stored) → Lovable AI `openai/gpt-transcribe` streamed → `parseVoice(transcript)` → intent shown → **read** intents run automatically, **confirm** intents wait for a tap → executed through the app's existing handlers (terminal keystrokes, router navigation). Voice adds no permissions.

## Modules
- `src/lib/voice-actions.ts` — pure: `parseVoice`, `riskOf`, intent types. Copy as-is to another project and replace the registry.
- `src/lib/voice-client.ts` — browser: `recordWav`, `transcribeClip` (mic denied/unsupported errors).
- `src/routes/api/transcribe.ts` — server: auth check, size/type checks, forwards to gateway.

## Intents (Honeycomb)
| Spoken | Action | Risk |
|---|---|---|
| open terminal / start sandbox | open /terminal/sandbox | read |
| new session | new sandbox tab | read |
| run pwd (in sandbox), list files, history, status, agents | type command + Enter | read |
| connect gemini / perplexity / codex / claude code | `connect <p>` (shows the provider's real auth method) | read |
| connect my mac | open pairing page (Mac approval still required) | read |
| ask gemini/claude/openai/perplexity … | `ask …` (spends credits) | confirm |
| disconnect …, any other command (writes, rm, echo >, URLs) | typed command | confirm |

## Rules for rollout to another project (owner approval per project)
- Each project has its own registry, own transcription route, own secrets; no shared tokens or cross-project calls.
- Intents may only call handlers the signed-in user can already invoke; server permission checks stay authoritative.
- Never auto-run payments, publishing, secrets, device access or destructive actions — always `confirm`.

## Not built
Spoken replies (text-to-speech), push-to-talk hardware keys, provider OAuth/token vault (no provider used here offers app OAuth; Gemini/Claude/OpenAI use Lovable AI, Perplexity uses a workspace connection), voice for the Mac companion page.
