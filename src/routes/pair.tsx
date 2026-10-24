import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useHosts } from "@/hooks/use-hosts";

export const Route = createFileRoute("/pair")({
  head: () => ({
    meta: [
      { title: "Pair a computer — Honeycomb Terminal" },
      { name: "description", content: "Simulated one-time pairing between this device and your computer." },
      { property: "og:title", content: "Pair a computer — Honeycomb Terminal" },
      { property: "og:description", content: "Approve pairing once, then tap to open your shell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pair,
});

function Pair() {
  const [step, setStep] = useState(0);
  const code = "482617"; // Fixed demonstration code, never a pairing credential.
  const { hosts, save } = useHosts();
  const steps = ["Install the companion", "Sign in on both", "Approve on the computer", "Paired"];

  const finish = () => {
    if (!hosts.find((h) => h.id === "new-host"))
      save([...hosts, { id: "new-host", name: "New Computer (simulated)", os: "macOS", status: "online", lastSeen: "now" }]);
    setStep(3);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Pair a computer</h1>
      <p className="text-sm text-warning mt-1">Simulated pairing — no real device keys are created or exchanged.</p>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-6 text-xs">
        {steps.map((s, i) => (
          <li key={s} className={`flex-1 rounded-md px-2 py-2 border ${i <= step ? "border-primary text-foreground" : "text-muted-foreground"}`}>{i + 1}. {s}</li>
        ))}
      </ol>
      <div className="rounded-lg border bg-card p-6 max-w-lg">
        {step === 0 && (<><p>Install Honeycomb Terminal companion on your Mac, Windows or Linux computer.</p><p className="text-xs text-muted-foreground mt-2">Companion app is planned; not available yet.</p><Button onClick={() => setStep(1)} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Next</Button></>)}
        {step === 1 && (<><p>Sign in with the same account on this device and the computer.</p><Button onClick={() => setStep(2)} className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">I'm signed in (simulated)</Button></>)}
        {step === 2 && (<><p>Confirm this code appears on your computer, then approve there:</p><div className="font-mono text-4xl  text-primary my-4">{code}</div><Button onClick={finish} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Simulate owner approval</Button></>)}
        {step === 3 && (<><p>Simulated pairing saved on this device. No computer has authorized access.</p><Link to="/" className="inline-block mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">See your computers</Link></>)}
      </div>
    </AppShell>
  );
}
