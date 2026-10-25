// PROTOTYPE ONLY: job workflow, execution targets and integrations are simulated.
// No job runs on a real computer, no GitHub or Evolution connection exists.
import { isDestructive } from "@/lib/terminal";

export type ExecutionTargetId = "device" | "host" | "sandbox";

export interface ExecutionTarget {
  id: ExecutionTargetId;
  label: string;
  available: boolean;
  note: string;
}

export const EXECUTION_TARGETS: ExecutionTarget[] = [
  { id: "device", label: "This device", available: false, note: "Platform-limited local tools. Not available until implemented; mobile platforms restrict local shell access." },
  { id: "host", label: "Paired computer", available: true, note: "Simulated — the selected sample computer. Persistent work belongs on the authorized host, not on mobile background execution." },
  { id: "sandbox", label: "Hosted sandbox", available: false, note: "Future option. Not provisioned; would be separately costed and authorized." },
];

export type JobState = "queued" | "running" | "waiting" | "failed" | "completed" | "cancelled";

export const JOB_STATE_INFO: Record<JobState, { label: string; terminal: boolean }> = {
  queued: { label: "Queued", terminal: false },
  running: { label: "Running", terminal: false },
  waiting: { label: "Waiting", terminal: false },
  failed: { label: "Failed", terminal: true },
  completed: { label: "Completed", terminal: true },
  cancelled: { label: "Cancelled", terminal: true },
};

export type JobEvent = "start" | "wait" | "resume" | "complete" | "fail" | "cancel";

const TRANSITIONS: Record<JobState, Partial<Record<JobEvent, JobState>>> = {
  queued: { start: "running", cancel: "cancelled" },
  running: { wait: "waiting", complete: "completed", fail: "failed", cancel: "cancelled" },
  waiting: { resume: "running", cancel: "cancelled" },
  failed: {},
  completed: {},
  cancelled: {},
};

export function transition(state: JobState, event: JobEvent): JobState | null {
  return TRANSITIONS[state][event] ?? null;
}

export interface JobTemplate {
  id: string;
  title: string;
  summary: string;
  commands: string[];
  scope: string;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: "test-failures",
    title: "Run existing tests and explain failures",
    summary: "Runs the project's existing test command on the authorized host and summarizes any failures in plain language.",
    commands: ["git status", "run the project's existing test command", "summarize failures"],
    scope: "Read-only on the selected repository. No file changes, no publishing, no external messages.",
  },
  {
    id: "worktree-changes",
    title: "Prepare code changes in an isolated worktree for review",
    summary: "Creates an isolated worktree/container, applies the proposed edits there, and runs tests for your review.",
    commands: ["git worktree add (isolated copy)", "apply proposed edits", "run existing tests", "report diff for review"],
    scope: "Writes only to a new isolated worktree. Your main checkout is untouched until you review and approve.",
  },
];

export interface JobPreview {
  commands: string[];
  scope: string;
  approvals: string[];
}

export function previewFor(templateId: string, instruction: string): JobPreview | null {
  const template = JOB_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const approvals = ["Publishing, deployment, spending, or external messages always require separate explicit approval."];
  if (isDestructive(instruction)) approvals.unshift("Your instruction matches a potentially destructive pattern — it would require explicit confirmation at run time.");
  return { commands: template.commands, scope: template.scope, approvals };
}

export interface Job {
  id: string;
  templateId: string;
  title: string;
  instruction: string;
  target: ExecutionTargetId;
  state: JobState;
  createdAt: string;
  log: string[];
  demoOutcome?: "pass" | "fail";
}

export function jobCompletionNotice(job: Job): string | null {
  if (job.state === "completed") return `Demo · PASS — ${job.title}`;
  if (job.state === "failed") return `Demo · FAIL — ${job.title}`;
  return null;
}

export function simulatedLog(templateId: string): string[] {
  if (templateId === "worktree-changes")
    return [
      "[simulated] Created isolated worktree .worktrees/job-sample",
      "[simulated] Applied proposed edits (2 files)",
      "[simulated] Tests: 13 passed",
      "[simulated] Diff ready for your review — nothing merged or published",
    ];
  return [
    "[simulated] $ git status — clean",
    "[simulated] Running existing tests…",
    "[simulated] 13 passed, 0 failed",
    "[simulated] No failures to explain. Nothing was changed or sent anywhere.",
  ];
}

export interface Integration {
  id: string;
  label: string;
  connected: false;
  note: string;
}

export const INTEGRATIONS: Integration[] = [
  { id: "github", label: "GitHub", connected: false, note: "Not connected. Repository-scoped jobs stay simulated until you connect and verify your own GitHub account. No credentials have been requested or stored." },
  { id: "evolution", label: "Honeycomb Evolution", connected: false, note: "Not connected. No Evolution endpoint has been defined or verified yet; nothing is configured." },
];

export const JOBS_KEY = "hct-jobs";
