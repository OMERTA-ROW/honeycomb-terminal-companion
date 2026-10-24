import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/instructions")({
  head: () => ({
    meta: [
      { title: "Instructions — Honeycomb Terminal" },
      { name: "description", content: "How to pair, open, and use your remote terminal." },
      { property: "og:title", content: "Instructions — Honeycomb Terminal" },
      { property: "og:description", content: "How to pair, open, and use your remote terminal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Instructions,
});

const sections: [string, string[]][] = [
  ["Getting started", ["Install the companion app on your computer (planned for macOS, Windows, Linux).", "Sign in on the computer and on this device.", "Approve pairing once on the computer.", "Tap the computer in the list to open or resume its shell."]],
  ["Keyboard", ["Use the bar above the keyboard for Esc, Ctrl, Tab and arrow keys.", "Ctrl is sticky: tap Ctrl, then a letter (e.g. Ctrl then C).", "External keyboards work directly, including arrows and Ctrl shortcuts."]],
  ["Shortcuts", ["Tap ★ to manage shortcuts.", "Every shortcut shows the command before it runs.", "Risky commands (like deleting files) always ask you to confirm."]],
  ["Copy & paste", ["Press and hold or drag over terminal text to select, then use Copy.", "Use Paste to insert clipboard text at the prompt."]],
  ["When something's wrong", ["Asleep: wake the computer.", "Offline: make sure it's on, online, and the companion is running.", "Needs permission: allow terminal access in the companion app.", "Revoked: pair again from the computer."]],
  ["Good to know", ["Your computer must be awake and reachable.", "Commands run on your computer, not on this device or in the cloud.", "In this preview everything is simulated."]],
];

function Instructions() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">Instructions</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(([t, items]) => (
          <section key={t} className="rounded-xl border bg-card p-5">
            <h2 className="font-medium text-primary mb-2">{t}</h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">{items.map((i) => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
