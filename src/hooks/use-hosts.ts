import { useEffect, useState } from "react";
import { HOSTS_KEY, SAMPLE_HOSTS, type Host } from "@/lib/terminal";

export function useHosts() {
  const [hosts, setHosts] = useState<Host[]>(SAMPLE_HOSTS);
  useEffect(() => {
    const raw = localStorage.getItem(HOSTS_KEY);
    if (raw) setHosts(JSON.parse(raw));
  }, []);
  const save = (h: Host[]) => {
    setHosts(h);
    localStorage.setItem(HOSTS_KEY, JSON.stringify(h));
  };
  return { hosts, save };
}
