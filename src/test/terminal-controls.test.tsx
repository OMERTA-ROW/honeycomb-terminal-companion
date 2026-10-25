import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_HOSTS } from "@/lib/terminal";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ useParams: () => ({ hostId: "studio-mac" }) }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/hooks/use-hosts", () => ({ useHosts: () => ({ hosts: SAMPLE_HOSTS }) }));
import { Terminal } from "@/routes/terminal.$hostId";

// jsdom lacks scrolling; stub only that browser API, not command behavior.
Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });

afterEach(() => { cleanup(); localStorage.clear(); });

describe("preview terminal controls", () => {
  it("a saved Comb previews without running and runs only after confirmation",()=>{
    render(<Terminal/>);
    const output=screen.getByTestId("output");
    const before=output.textContent;
    fireEvent.click(screen.getByRole("button",{name:"Git status"}));
    expect(output.textContent).toBe(before);
    fireEvent.click(screen.getByRole("button",{name:"Run"}));
    expect(output.textContent).toContain("$ git status");
  });
  it("canceling a destructive shortcut never sends the command", () => {
    render(<Terminal />);
    const output = screen.getByTestId("output");
    const before = output.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Clean build" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(output.textContent).toBe(before);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offline simulation blocks command entry until reconnect", () => {
    render(<Terminal />);
    fireEvent.click(screen.getByRole("button", { name: "Simulate drop" }));
    expect(screen.getByRole("textbox", { name: "Command input" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(screen.getByRole("textbox", { name: "Command input" })).toBeEnabled();
  });
  it("left/right touch keys collapse a selection to its boundaries", () => {
    render(<Terminal />);
    const input = screen.getByRole("textbox", { name: "Command input" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abcdef" } });
    input.setSelectionRange(1, 5);
    fireEvent.click(screen.getByRole("button", { name: "Arrow left" }));
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 1]);
    input.setSelectionRange(1, 5);
    fireEvent.click(screen.getByRole("button", { name: "Arrow right" }));
    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);
  });
});