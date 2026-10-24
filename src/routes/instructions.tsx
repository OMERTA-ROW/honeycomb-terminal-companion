import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { simulate } from "@/lib/terminal";

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
  ["Keyboard", ["Esc cancels a terminal action; this preview displays an Escape marker.", "Ctrl is sticky: tap Ctrl, then C to cancel the line, L to clear the screen, or U to erase the line.", "Tab completes a partial command in this simulation.", "↑ and ↓ recall commands; returning below the newest restores your draft. ← and → move the cursor or collapse a selection.", "Supported external keyboard keys use the same simulated actions; physical keyboard checks are still pending."]],
  ["Shortcuts", ["Tap ★ to manage shortcuts.", "Every shortcut shows the command before it runs.", "Risky commands (like deleting files) always ask you to confirm."]],
  ["Copy & paste", ["Press and hold or drag over terminal text to select, then use Copy. With no selection, Copy uses the displayed output.", "Paste inserts at the cursor or replaces selected command text. Your browser may ask for clipboard permission."]],
  ["When something's wrong", ["Asleep: wake the computer.", "Offline: make sure it's on, online, and the companion is running.", "Needs permission: allow terminal access in the companion app.", "Revoked: pair again from the computer."]],
  ["Good to know", ["A real connection will require your computer to be awake and reachable, and its owner to approve this device.", "In the planned product, commands run in the computer’s own shell, not on this device or hosted compute.", "In this preview everything is simulated; companion, sign-in and real connections are not implemented."]],
];

function Instructions() {
  const [example, setExample] = useState<string | null>(null);
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">Instructions</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(([t, items]) => (
          <section key={t} className="border-t py-5">
            <h2 className="font-medium text-primary mb-2">{t}</h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">{items.map((i) => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}
      </div>
      <section className="border-t mt-4 py-5">
        <h2 className="font-medium text-primary mb-3">Safe command examples · simulated</h2>
        <ul className="space-y-3">
          {([["pwd", "Show the current folder"], ["ls -la", "List files"], ["whoami", "Show the shell user"], ["git status", "Check project changes"]] as const).map(([command, label]) => (
            <li key={command} className="flex flex-wrap gap-3 items-center justify-between text-sm">
              <span><code className="font-mono">{command}</code> — {label}</span>
              <Button variant="outline" onClick={() => setExample(command)}>Try {command}</Button>
            </li>
          ))}
        </ul>
        {example && <pre role="status" className="mt-4 p-3 bg-terminal text-terminal-foreground whitespace-pre-wrap font-mono text-sm">{`[simulated demonstration — nothing executed]\n$ ${example}\n${simulate(example)}`}</pre>}
      </section>
    </AppShell>
  );
}
