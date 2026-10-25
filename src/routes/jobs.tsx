import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useJobs } from "@/hooks/use-jobs";
import { CreativeTasks } from "@/components/CreativeTasks";
import { EditorHandoff } from "@/components/EditorHandoff";
import {
  EXECUTION_TARGETS,
  INTEGRATIONS,
  JOB_STATE_INFO,
  JOB_TEMPLATES,
  jobCompletionNotice,
  previewFor,
  simulatedLog,
  transition,
  type ExecutionTargetId,
  type Job,
  type JobState,
} from "@/lib/jobs";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — Honeycomb Terminal" },
      { name: "description", content: "Authorize and track coding jobs on your paired computer. Prototype preview." },
      { property: "og:title", content: "Jobs — Honeycomb Terminal" },
      { property: "og:description", content: "Typed instruction, command preview, explicit authorization, tracked states and logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Jobs,
});

const stateStyle: Record<JobState, string> = {
  queued: "border-primary text-primary",
  running: "border-primary text-primary",
  waiting: "border-warning text-warning",
  failed: "border-destructive text-destructive",
  completed: "border-success text-success",
  cancelled: "border-muted-foreground text-muted-foreground",
};

function Jobs() {
  const { jobs, save, update } = useJobs();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(JOB_TEMPLATES[0]?.id ?? "test-failures");
  const [instruction, setInstruction] = useState("");
  const [target, setTarget] = useState<ExecutionTargetId>("host");
  const [open, setOpen] = useState<string | null>(null);
  const [demoOutcome, setDemoOutcome] = useState<"pass" | "fail">("pass");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const preview = previewFor(templateId, instruction);
  const template = JOB_TEMPLATES.find((t) => t.id === templateId);

  // Simulated progression: queued jobs start, running jobs finish. Nothing executes anywhere.
  useEffect(() => {
    const timers = jobs.flatMap((j) => {
      if (j.state === "queued")
        return [setTimeout(() => update(j.id, { state: transition("queued", "start") ?? "running", log: ["[simulated] Job started on the selected sample computer"] }), 900)];
      if (j.state === "running")
        return [setTimeout(() => update(j.id, j.demoOutcome === "fail" ? {state:"failed",log:[...j.log,"[Demo · simulated] Test command exited 1 — fixture failure; no real tests ran.","[Demo · simulated] Inspect logs before retry; nothing changed on a host."]} : { state: transition("running", "complete") ?? "completed", log: [...j.log, ...simulatedLog(j.templateId)] }), 2400)];
      return [];
    });
    return () => timers.forEach(clearTimeout);
  }, [jobs]);

  const authorize = () => {
    const job: Job = {
      id: crypto.randomUUID(),
      templateId,
      title: template?.title ?? "Job",
      instruction: instruction.trim(),
      target,
      state: "queued",
      createdAt: new Date().toISOString(),
      log: ["[simulated] Authorized by you. Queued — no real execution exists in this preview."],
      demoOutcome,
    };
    save([job, ...jobs]);
    setStep(0);
    setInstruction("");
  };

  const cancel = (j: Job) => {
    const next = transition(j.state, "cancel");
    if (next) update(j.id, { state: next, log: [...j.log, "[simulated] Cancelled by you."] });
  };

  return (
    <AppShell>
      <h1 className="text-2xl sm:text-3xl font-semibold">Jobs</h1>
      <p className="text-muted-foreground text-sm mt-1">Demo · simulated workflow. Every job, state and log is a preview; nothing runs on a real computer.</p>
      <section className="mt-4 border-b pb-4" aria-label="Demo job notifications">
        <h2 className="text-sm font-medium text-primary">Completion notices · Demo</h2>
        <p className="mt-1 text-xs text-muted-foreground">In-app only while Jobs is open; saved results return here. Background/push notifications require a real host runner and supported mobile delivery.</p>
        <ul aria-live="polite" aria-relevant="additions" className="mt-2 space-y-2">
          {jobs.filter(j=>jobCompletionNotice(j)&&!dismissed.includes(j.id)).map(j=><li key={j.id} className="flex flex-wrap items-center gap-2 text-sm"><span className={j.state==='failed'?'text-destructive':'text-success'}>{jobCompletionNotice(j)}</span><Button variant="outline" size="sm" onClick={()=>{setOpen(j.id);document.getElementById(`job-${j.id}`)?.scrollIntoView({block:'nearest'});}}>View logs</Button><Button variant="ghost" size="sm" onClick={()=>setDismissed(ids=>[...ids,j.id])}>Dismiss</Button></li>)}
        </ul>
      </section>
      <CreativeTasks />
      <EditorHandoff />

      <section className="mt-6 rounded-lg border bg-card p-4">
        <h2 className="font-medium">Integrations</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <li key={i.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{i.label}</span>
                <span className="text-xs rounded-full border border-warning text-warning px-2 py-0.5">Not connected</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{i.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 max-w-2xl">
        <h2 className="font-medium mb-3">New job · Demo (simulated)</h2>
        {step === 0 && (
          <div className="space-y-3">
            <label className="block text-sm">
              Template
              <select aria-label="Job template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full bg-background border rounded px-3 py-2 text-sm">
                {JOB_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">{template?.summary}</p>
            <label className="block text-sm">Demo completion outcome<select aria-label="Demo job outcome" value={demoOutcome} onChange={e=>setDemoOutcome(e.target.value === 'fail' ? 'fail' : 'pass')} className="mt-1 w-full bg-background border rounded px-3 py-2 text-sm"><option value="pass">Pass · simulated</option><option value="fail">Fail · simulated</option></select></label>
            <label className="block text-sm">
              Your instruction
              <textarea aria-label="Job instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} placeholder="e.g. Run the test suite on my project and tell me why anything fails" className="mt-1 w-full bg-input/40 rounded px-3 py-2 text-sm" />
            </label>
            <fieldset>
              <legend className="text-sm mb-1">Execution target</legend>
              <div className="flex flex-wrap gap-2">
                {EXECUTION_TARGETS.map((t) => (
                  <Button
                    variant="outline"
                    key={t.id}
                    disabled={!t.available}
                    onClick={() => setTarget(t.id)}
                    aria-pressed={target === t.id}
                    title={t.note}
                    className={`rounded-md border px-3 py-1.5 text-xs ${target === t.id ? "border-primary text-primary" : ""} ${!t.available ? "opacity-50" : ""}`}
                  >
                    {t.label}{!t.available && " · not available"}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{EXECUTION_TARGETS.find((t) => t.id === target)?.note}</p>
            </fieldset>
            <Button variant="outline" disabled={!instruction.trim()} onClick={() => setStep(1)} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">Preview commands & scope</Button>
          </div>
        )}
        {step === 1 && preview && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Preview before anything runs · simulated</h3>
            <pre className="whitespace-pre-wrap break-all font-mono text-sm bg-terminal text-terminal-foreground p-3 rounded">{preview.commands.join("\n")}</pre>
            <p className="text-sm"><span className="text-muted-foreground">Scope: </span>{preview.scope}</p>
            <ul className="text-xs text-warning space-y-1 list-disc pl-4">
              {preview.approvals.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="px-4 py-2 rounded-md border text-sm">Back</Button>
              <Button variant="outline" onClick={authorize} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Authorize job (simulated)</Button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-medium mb-3">Your jobs · stored on this device (simulated)</h2>
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs yet. Create one above to see the workflow.</p>}
        <ul className="grid gap-3">
          {jobs.map((j) => (
            <li key={j.id} id={`job-${j.id}`} className="rounded-lg border bg-card p-4" data-testid={`job-${j.id}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium text-sm">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.instruction} · {EXECUTION_TARGETS.find((t) => t.id === j.target)?.label}</div>
                </div>
                <span className={`text-xs rounded-full border px-2 py-0.5 ${stateStyle[j.state]}`}>{JOB_STATE_INFO[j.state].label}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={() => setOpen(open === j.id ? null : j.id)} className="rounded-md border px-3 py-1.5 text-xs">{open === j.id ? "Hide log" : "Show log"}</Button>
                {!JOB_STATE_INFO[j.state].terminal && (
                  <Button variant="outline" onClick={() => cancel(j)} className="rounded-md border px-3 py-1.5 text-xs text-destructive">Cancel</Button>
                )}
              </div>
              {open === j.id && (
                <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-xs bg-terminal text-terminal-foreground p-3 rounded">{j.log.join("\n")}</pre>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-4">Leaving and returning retrieves these results from this device — a stand-in for reconnect and result retrieval in the real product, where persistent work lives on the authorized execution host.</p>
      </section>
    </AppShell>
  );
}
