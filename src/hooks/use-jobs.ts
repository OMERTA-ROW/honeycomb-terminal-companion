import { useEffect, useState } from "react";
import { JOBS_KEY, JOB_STATE_INFO, type Job } from "@/lib/jobs";

function isJob(j: unknown): j is Job {
  if (!j || typeof j !== "object") return false;
  const o = j as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    typeof o["templateId"] === "string" &&
    typeof o["title"] === "string" &&
    typeof o["instruction"] === "string" &&
    ["device", "host", "sandbox"].includes(o["target"] as string) &&
    typeof o["state"] === "string" &&
    o["state"] in JOB_STATE_INFO &&
    typeof o["createdAt"] === "string" &&
    Array.isArray(o["log"]) &&
    (o["log"] as unknown[]).every((l) => typeof l === "string")
  );
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOBS_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(stored) && stored.every(isJob)) setJobs(stored);
    } catch { /* Invalid or unavailable device storage starts with an empty simulated list. */ }
  }, []);
  const save = (next: Job[]) => {
    setJobs(next);
    try { localStorage.setItem(JOBS_KEY, JSON.stringify(next)); } catch { /* In-memory simulation remains usable. */ }
  };
  const update = (id: string, patch: Partial<Job>) => save(jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  return { jobs, save, update };
}
