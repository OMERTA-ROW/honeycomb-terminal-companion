import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  redirect: (options: unknown) => options,
}));
import { Route as sandbox } from "@/routes/terminal.sandbox";
import { Route as sampleHost } from "@/routes/terminal.$hostId";
import { Route as pairing } from "@/routes/pair";

describe("retired demo terminal entry points", () => {
  it.each([sandbox, sampleHost, pairing])(
    "redirects to the real Mac connection without rendering a simulated shell",
    (route) => {
      const options = (route as unknown as { options: { beforeLoad: () => never; component?: unknown } }).options;
      expect(options.component).toBeUndefined();
      let destination: unknown;
      try {
        options.beforeLoad();
      } catch (result) {
        destination = result;
      }
      expect(destination).toEqual({ to: "/terminal", replace: true });
    },
  );
});
