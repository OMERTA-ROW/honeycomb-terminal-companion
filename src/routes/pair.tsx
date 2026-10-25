import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useHosts } from "@/hooks/use-hosts";
import {
  PAIRING_CODE_TTL_SECONDS,
  PAIRING_STATE_INFO,
  pairingCodeExpired,
  pairingPayload,
  testConnectionResult,
  type PairingState,
  type TestConnectionState,
} from "@/lib/device-care";

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

// Deterministic demo code — never a real pairing credential.
const CODE = "482617";

// Decorative QR-style grid derived from the payload. Clearly labelled as a
// stand-in: it is not scannable and carries no real pairing data.
function FakeQr({ payload }: { payload: string }) {
  const cells = useMemo(() => {
    let h = 7;
    return Array.from({ length: 121 }, (_, i) => {
      h = (h * 31 + payload.charCodeAt(i % payload.length)) % 997;
      return h % 3 !== 0;
    });
  }, [payload]);
  return (
    <div role="img" aria-label="Decorative QR placeholder — not scannable" className="grid grid-cols-11 gap-0.5 w-36 h-36 p-2 bg-card border rounded-md mx-auto">
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-primary" : "bg-transparent"} />
      ))}
    </div>
  );
}

function Pair() {
  const [state, setState] = useState<PairingState>("requested");
  const [createdAt, setCreatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [test, setTest] = useState<{ state: TestConnectionState; output: string } | null>(null);
  const { hosts, save } = useHosts();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expired = pairingCodeExpired(createdAt, now);
  const effective: PairingState = expired && (state === "requested" || state === "pending") ? "expired" : state;
  const info = PAIRING_STATE_INFO[effective];
  const secondsLeft = Math.max(0, PAIRING_CODE_TTL_SECONDS - Math.floor((now - createdAt) / 1000));

  const restart = () => {
    setState("requested");
    setCreatedAt(Date.now());
    setTest(null);
  };

  const confirm = () => {
    setState("confirmed");
    if (!hosts.find((h) => h.id === "new-host"))
      save([...hosts, { id: "new-host", name: "New Computer (simulated)", os: "macOS", status: "online", lastSeen: "now" }]);
  };

  const runTest = () => {
    setTest({ state: "running", output: "[simulated] Sending a harmless command to the computer…" });
    setTimeout(() => setTest(testConnectionResult("online")), 900);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Pair a computer</h1>
      <p className="text-sm text-warning mt-1">Simulated pairing — no real device keys are created or exchanged. The QR image is a decorative placeholder, not scannable.</p>

      <div className="rounded-lg border bg-card p-6 max-w-lg mt-6">
        <p role="status" className="text-sm">
          <span className="text-primary font-medium">{info.label}</span>
          {(effective === "requested" || effective === "pending") && <span className="text-muted-foreground"> · {secondsLeft}s left</span>}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{info.next}</p>

        {(effective === "requested" || effective === "pending") && (
          <div className="mt-5 space-y-4">
            <FakeQr payload={pairingPayload(CODE)} />
            <p className="text-center text-xs text-muted-foreground">Or confirm this code on the computer:</p>
            <div className="font-mono text-4xl text-primary text-center">{CODE}</div>
            {effective === "requested" && (
              <Button onClick={() => setState("pending")} className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
                I've shown the code to the computer (simulated)
              </Button>
            )}
            {effective === "pending" && (
              <div className="flex gap-2">
                <Button onClick={confirm} className="flex-1 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Simulate owner approval</Button>
                <Button variant="outline" onClick={() => setState("failed")} className="rounded-md border px-4 py-2 text-sm text-destructive">Simulate rejection</Button>
              </div>
            )}
          </div>
        )}

        {effective === "confirmed" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm">Simulated pairing saved on this device. No computer has authorized access.</p>
            <Button onClick={runTest} disabled={test?.state === "running"} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">
              {test?.state === "running" ? "Testing…" : "Test Connection (simulated)"}
            </Button>
            {test && (
              <pre role="status" className="p-3 bg-terminal text-terminal-foreground whitespace-pre-wrap font-mono text-sm rounded">{test.output}</pre>
            )}
            <div>
              <Link to="/" className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">See your computers</Link>
            </div>
          </div>
        )}

        {(effective === "failed" || effective === "expired") && (
          <Button onClick={restart} className="mt-5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Request a new code</Button>
        )}
      </div>

      <section className="mt-8 max-w-lg text-sm text-muted-foreground space-y-2">
        <h2 className="font-medium text-foreground">Install prerequisites (honest status)</h2>
        <ul className="list-disc pl-4 space-y-1.5">
          <li><span className="text-foreground">Mac companion:</span> planned; source skeleton in <code className="font-mono text-xs">companion/</code>. No installer exists — any download button would be disabled placeholder. Signing and notarization are not procured.</li>
          <li><span className="text-foreground">iPhone/iPad and Android apps:</span> not yet available. No store links exist; nothing here fabricates one.</li>
          <li><span className="text-foreground">Pairing security:</span> real pairing will use short-lived single-use challenges with host-side approval; the fixed code above is a demo only.</li>
        </ul>
      </section>
    </AppShell>
  );
}
