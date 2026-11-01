import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/terminal/$hostId")({
  beforeLoad: () => {
    throw redirect({ to: "/terminal", replace: true });
  },
});
