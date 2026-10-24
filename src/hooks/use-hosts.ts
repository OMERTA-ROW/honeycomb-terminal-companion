import { useEffect, useState } from "react";
import { HOSTS_KEY, SAMPLE_HOSTS, type Host } from "@/lib/terminal";

export function useHosts() {
  const [hosts, setHosts] = useState<Host[]>(SAMPLE_HOSTS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOSTS_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(stored) && stored.every((h) => h && typeof h.id === "string" && typeof h.name === "string" && ["macOS", "Windows", "Linux"].includes(h.os) && ["online", "asleep", "offline", "permission", "revoked"].includes(h.status) && typeof h.lastSeen === "string")) setHosts(stored);
    } catch { /* Invalid or unavailable device storage falls back to labelled samples. */ }
  }, []);
  const save = (h: Host[]) => {
    setHosts(h);
    try { localStorage.setItem(HOSTS_KEY, JSON.stringify(h)); } catch { /* In-memory simulation remains usable. */ }
  };
  return { hosts, save };
}
