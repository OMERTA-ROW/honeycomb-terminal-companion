import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/device-care")({
  beforeLoad: () => {
    throw redirect({ to: "/account", replace: true });
  },
});
