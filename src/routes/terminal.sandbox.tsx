import { createFileRoute } from "@tanstack/react-router";
import { SandboxWorkspace } from "@/components/SandboxTerminal";

export const Route = createFileRoute("/terminal/sandbox")({
  head: () => ({
    meta: [
      { title: "Sandbox Terminal — Honeycomb Terminal" },
      { name: "description", content: "Full-screen browser sandbox terminal with real commands, sessions and history." },
      { property: "og:title", content: "Sandbox Terminal — Honeycomb Terminal" },
      { property: "og:description", content: "Full-screen browser sandbox terminal with real commands, sessions and history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SandboxWorkspace,
});
