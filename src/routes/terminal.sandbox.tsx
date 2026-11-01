import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/terminal/sandbox")({
  validateSearch: (s: Record<string, unknown>): { cmd?: string } =>
    typeof s["cmd"] === "string" ? { cmd: s["cmd"] } : {},
  beforeLoad: () => {
    throw redirect({ to: "/terminal", replace: true });
  },
});
