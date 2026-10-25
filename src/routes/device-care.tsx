import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { BeeLock } from "@/components/BeeLock";
import {
  BLUETOOTH_CAPABILITIES,
  BLUETOOTH_TESTS,
  DEFAULT_TRANSFER_POLICY,
  LOCK_SCOPE_NOTE,
  SAMPLE_STORAGE,
  SAMPLE_TRUSTED_DEVICES,
  SECURITY_FEATURES,
  formatBytes,
  recoverableBytes,
  transferAllowed,
  type LockState,
  type TransferPolicy,
} from "@/lib/device-care";

export const Route = createFileRoute("/device-care")({
  head: () => ({
    meta: [
      { title: "Device care — Honeycomb Terminal" },
      { name: "description", content: "Storage, battery, security, Bluetooth and app-lock helpers. Preview: data is simulated." },
      { property: "og:title", content: "Device care — Honeycomb Terminal" },
      { property: "og:description", content: "Storage, battery, security, Bluetooth and app-lock helpers. Preview: data is simulated." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeviceCare,
});

const TABS = ["Storage", "Cellular & battery", "Security", "Bluetooth", "App lock"] as const;
type Tab = (typeof TABS)[number];

function DeviceCare() {
  const [tab, setTab] = useState<Tab>("Storage");
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Device care</h1>
      <p className="text-sm text-warning mt-1">Preview: all figures are simulated samples. Native OS access cannot be supplied by a web preview — capabilities marked “planned” need the native app.</p>

      <div className="flex gap-1.5 overflow-x-auto mt-5 mb-6" role="tablist" aria-label="Device care sections">
        {TABS.map((t) => (
          <Button key={t} variant="outline" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`shrink-0 h-8 px-3 rounded-full border text-xs ${tab === t ? "border-primary text-primary" : ""}`}>
            {t}
          </Button>
        ))}
      </div>

      {tab === "Storage" && <StoragePanel />}
      {tab === "Cellular & battery" && <CellularPanel />}
      {tab === "Security" && <SecurityPanel />}
      {tab === "Bluetooth" && <BluetoothPanel />}
      {tab === "App lock" && <LockPanel />}
    </AppShell>
  );
}

function StoragePanel() {
  const [confirmed, setConfirmed] = useState(false);
  const [cleaned, setCleaned] = useState<number | null>(null);
  const total = recoverableBytes(SAMPLE_STORAGE);
  return (
    <section className="max-w-2xl">
      <h2 className="font-medium text-primary mb-1">Storage analysis · simulated sample</h2>
      <p className="text-sm text-muted-foreground mb-4">Authorized analysis only. Exact duplicates are byte-identical files — similar photos are a separate, manual review and are never auto-grouped here.</p>
      <ul className="grid gap-3">
        {SAMPLE_STORAGE.map((c) => (
          <li key={c.id} className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-baseline gap-3">
              <span className="font-medium text-sm">{c.label}</span>
              <span className="text-sm text-primary font-mono">{formatBytes(c.bytes)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border bg-card p-4 mt-4">
        <p className="text-sm">Recoverable with your consent: <span className="text-primary font-mono">{formatBytes(total)}</span> (simulated)</p>
        <p className="text-xs text-muted-foreground mt-1">Originals are preserved until you confirm each category. If a file only exists in cloud storage, deleting it there propagates to every synced device — the review list calls this out per item.</p>
        {cleaned === null ? (
          <div className="flex gap-2 mt-3 items-center flex-wrap">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              I reviewed the list and consent to this simulated cleanup
            </label>
            <Button variant="outline" disabled={!confirmed} onClick={() => setCleaned(total)} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm disabled:opacity-50">
              Preview cleanup
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-success mt-3">Simulated cleanup complete — {formatBytes(cleaned)} would be recovered. Nothing was deleted; a real cleanup reports actual recovered space after it runs.</p>
        )}
      </div>
    </section>
  );
}

function CellularPanel() {
  const [policy, setPolicy] = useState<TransferPolicy>(DEFAULT_TRANSFER_POLICY);
  const [onWifi, setOnWifi] = useState(true);
  const [usedMb, setUsedMb] = useState(0);
  const result = transferAllowed(policy, onWifi, usedMb);
  return (
    <section className="max-w-2xl">
      <h2 className="font-medium text-primary mb-1">Cellular & battery</h2>
      <p className="text-sm text-muted-foreground mb-4">Honeycomb transfers are Wi-Fi-only by default, with an optional monthly cellular limit. Scans are designed to be low-overhead and run on demand, but no battery-life guarantee is made — actual impact depends on your device and usage.</p>
      <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={policy.wifiOnly} onChange={(e) => setPolicy({ ...policy, wifiOnly: e.target.checked })} />
          Wi-Fi only for Honeycomb transfers
        </label>
        <label className="flex items-center gap-2 flex-wrap">
          Monthly cellular limit (MB, 0 = no limit):
          <input type="number" min={0} aria-label="Monthly cellular limit in MB" value={policy.monthlyCellularLimitMb ?? 0}
            onChange={(e) => { const v = Math.max(0, Number(e.target.value) || 0); setPolicy({ ...policy, monthlyCellularLimitMb: v === 0 ? null : v }); }}
            className="w-24 bg-input/40 rounded px-2 py-1 font-mono" />
        </label>
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Try it (simulated):</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onWifi} onChange={(e) => setOnWifi(e.target.checked)} /> On Wi-Fi now</label>
          <label className="flex items-center gap-2">Used this month (MB):
            <input type="number" min={0} aria-label="Cellular used this month in MB" value={usedMb} onChange={(e) => setUsedMb(Math.max(0, Number(e.target.value) || 0))} className="w-24 bg-input/40 rounded px-2 py-1 font-mono" />
          </label>
          <p role="status" className={result.allowed ? "text-success" : "text-warning"}>{result.allowed ? "Transfer allowed" : "Transfer paused"} — {result.reason}</p>
        </div>
      </div>
    </section>
  );
}

function SecurityPanel() {
  return (
    <section className="max-w-2xl">
      <h2 className="font-medium text-primary mb-1">Security · planned capabilities</h2>
      <p className="text-sm text-muted-foreground mb-4">No security feature is active in this preview, and no scan metrics are shown — there is nothing real to measure yet. Each item lists its honest coverage and limits.</p>
      <ul className="grid gap-3">
        {SECURITY_FEATURES.map((f) => (
          <li key={f.id} className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-baseline gap-3">
              <span className="font-medium text-sm">{f.label}</span>
              <span className="text-xs text-warning shrink-0">{f.status === "planned" ? "Planned — not active" : f.status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{f.coverage}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BluetoothPanel() {
  return (
    <section className="max-w-2xl">
      <h2 className="font-medium text-primary mb-1">Bluetooth · capability guide</h2>
      <p className="text-sm text-muted-foreground mb-4">What the platforms support, checked per device — Honeycomb does not override OS Bluetooth behavior.</p>
      <ul className="grid gap-3">
        {Object.entries(BLUETOOTH_CAPABILITIES).map(([id, c]) => (
          <li key={id} className="rounded-lg border bg-card p-4">
            <div className="flex justify-between items-baseline gap-3">
              <span className="font-medium text-sm">{c.label}</span>
              <span className={`text-xs shrink-0 ${c.supported === "widely-supported" ? "text-success" : "text-warning"}`}>
                {c.supported === "widely-supported" ? "Widely supported" : "Platform-dependent"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border bg-card p-4 mt-4">
        <h3 className="font-medium text-sm mb-2">Real-device tests to run (physical hardware required)</h3>
        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1.5">
          {BLUETOOTH_TESTS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </section>
  );
}

function LockPanel() {
  const [lockState, setLockState] = useState<LockState>("unlocked");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [devices, setDevices] = useState(SAMPLE_TRUSTED_DEVICES);
  const [revoked, setRevoked] = useState<string[]>([]);

  const revoke = (id: string) => {
    setRevoked((r) => [...r, id]);
    setDevices((d) => d.filter((x) => x.id !== id));
  };

  return (
    <section className="max-w-2xl">
      <h2 className="font-medium text-primary mb-1">App lock · simulated</h2>
      <p className="text-sm text-muted-foreground mb-4">{LOCK_SCOPE_NOTE}</p>

      <div className="rounded-lg border bg-card p-5 text-center">
        {lockState === "unlocked" && (
          <>
            <p className="text-sm mb-3">The app locks after inactivity or when backgrounded (planned native behavior; simulated here).</p>
            <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-3">
              <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
              Reduced motion (also follows your system setting in the native app)
            </label>
            <Button onClick={() => setLockState("locking")} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Simulate app lock</Button>
          </>
        )}
        {lockState === "locking" && (
          <>
            <p className="text-sm mb-2">Locking…</p>
            <BeeLock locking reducedMotion={reducedMotion} onDone={() => setLockState("locked")} />
          </>
        )}
        {lockState === "locked" && (
          <>
            <BeeLock locking={false} reducedMotion onDone={() => {}} />
            <p className="text-sm font-medium">Honeycomb is locked</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Unlock would require device biometrics or your passcode (simulated). Your phone itself is not locked.</p>
            <Button onClick={() => setLockState("unlocked")} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Simulate unlock</Button>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 mt-4">
        <h3 className="font-medium text-sm mb-1">Trusted devices · simulated</h3>
        <p className="text-xs text-muted-foreground mb-3">Revoking a device ends its authenticated sessions and denies reconnect. Theft response: revoke the device here and change your account password; remote wipe is not offered by default.</p>
        <ul className="space-y-2">
          {devices.map((d) => (
            <li key={d.id} className="flex justify-between items-center text-sm gap-2">
              <span>{d.name} <span className="text-xs text-muted-foreground">· last used {d.lastUsed}</span></span>
              {!d.current && <Button variant="outline" onClick={() => revoke(d.id)} className="text-destructive text-xs">Revoke</Button>}
              {d.current && <span className="text-xs text-muted-foreground">This device</span>}
            </li>
          ))}
          {revoked.map((id) => (
            <li key={id} className="text-xs text-warning">Revoked: {id} — sessions ended (simulated). Secure recovery: pair again from the computer with owner approval.</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
