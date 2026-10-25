// PROTOTYPE ONLY: pairing, test connection and device-care data are simulated.
// Nothing here scans a real device, connects to a real computer, or contacts a network.

// ---------- Pairing ----------
export type PairingState = "requested" | "pending" | "confirmed" | "failed" | "expired";

export const PAIRING_STATE_INFO: Record<PairingState, { label: string; next: string }> = {
  requested: { label: "Requested", next: "A pairing request was created on this device. Show the code to the computer." },
  pending: { label: "Pending host confirmation", next: "Approve this device on the computer within the time limit." },
  confirmed: { label: "Confirmed", next: "The computer approved this device. In the real product, scoped authorization is now stored on the host." },
  failed: { label: "Failed", next: "The computer rejected the request or the code did not match. Start again." },
  expired: { label: "Expired", next: "The code timed out. Pairing codes are short-lived; request a new one." },
};

export const PAIRING_CODE_TTL_SECONDS = 120;

export function pairingCodeExpired(createdAtMs: number, nowMs: number): boolean {
  return nowMs - createdAtMs > PAIRING_CODE_TTL_SECONDS * 1000;
}

// A demonstration payload only. A real QR payload would carry a short-lived,
// single-use challenge bound to host identity — never a reusable secret.
export function pairingPayload(code: string): string {
  return `honeycomb-terminal://pair?code=${code}&v=0-simulated`;
}

// ---------- Test connection ----------
export type TestConnectionState = "idle" | "running" | "connected" | "unreachable" | "denied";

export const TEST_COMMAND = "echo 'Honeycomb connected'";
export const TEST_EXPECTED_OUTPUT = "Honeycomb connected";

export function testConnectionResult(hostStatus: "online" | "asleep" | "offline" | "permission" | "revoked"): { state: TestConnectionState; output: string } {
  if (hostStatus === "online") return { state: "connected", output: `[simulated] $ ${TEST_COMMAND}\n${TEST_EXPECTED_OUTPUT}` };
  if (hostStatus === "permission") return { state: "denied", output: "[simulated] The computer has not granted terminal access to this device." };
  if (hostStatus === "revoked") return { state: "denied", output: "[simulated] This device's authorization was revoked on the computer." };
  return { state: "unreachable", output: "[simulated] The computer is not reachable. Wake it and make sure the companion is running." };
}

// ---------- Storage (device care) ----------
export interface StorageCategory {
  id: string;
  label: string;
  bytes: number;
  note: string;
  recoverable: boolean;
}

export const GB = 1024 * 1024 * 1024;

export const SAMPLE_STORAGE: StorageCategory[] = [
  { id: "exact-duplicates", label: "Exact duplicate files", bytes: 1.2 * GB, note: "Byte-identical copies only. Similar photos are NOT included — they need your individual review.", recoverable: true },
  { id: "screenshots", label: "Screenshots", bytes: 0.4 * GB, note: "Screenshots older than 90 days, listed for your review before anything is removed.", recoverable: true },
  { id: "unused-apps", label: "Unused apps", bytes: 2.1 * GB, note: "Apps not opened in 6+ months. Offloading keeps documents; deleting removes the app. Your choice per app.", recoverable: true },
  { id: "system", label: "System and other", bytes: 18.4 * GB, note: "Managed by the operating system. Not removable by Honeycomb.", recoverable: false },
];

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function recoverableBytes(categories: StorageCategory[]): number {
  return categories.filter((c) => c.recoverable).reduce((sum, c) => sum + c.bytes, 0);
}

// ---------- Cellular & battery ----------
export interface TransferPolicy {
  wifiOnly: boolean;
  monthlyCellularLimitMb: number | null;
}

export const DEFAULT_TRANSFER_POLICY: TransferPolicy = { wifiOnly: true, monthlyCellularLimitMb: null };

export function transferAllowed(policy: TransferPolicy, onWifi: boolean, usedMb: number): { allowed: boolean; reason: string } {
  if (!onWifi && policy.wifiOnly) return { allowed: false, reason: "Wi-Fi only is on. Honeycomb transfers wait for Wi-Fi." };
  if (!onWifi && policy.monthlyCellularLimitMb !== null && usedMb >= policy.monthlyCellularLimitMb)
    return { allowed: false, reason: `Monthly cellular limit of ${policy.monthlyCellularLimitMb} MB reached.` };
  return { allowed: true, reason: onWifi ? "On Wi-Fi." : "On cellular, within your limit." };
}

// ---------- Security ----------
export interface SecurityFeature {
  id: string;
  label: string;
  status: "planned" | "simulated" | "unavailable";
  coverage: string;
}

export const SECURITY_FEATURES: SecurityFeature[] = [
  { id: "malware", label: "Malware scanning", status: "planned", coverage: "Planned via a vetted third-party scan engine with an explicit coverage statement. No scan has run; no metrics are shown because none exist." },
  { id: "wifi-alerts", label: "Unsafe Wi-Fi / hotspot alerts", status: "planned", coverage: "Planned: warn on open or known-hostile networks. Requires native network entitlement; not active in this preview." },
  { id: "link-protection", label: "Malicious-link browsing protection", status: "planned", coverage: "Planned: check links against a reputation feed before opening. Coverage depends on the chosen feed; not active." },
  { id: "vpn", label: "Optional VPN / IP privacy", status: "planned", coverage: "Planned optional add-on. A VPN hides your IP from sites you visit but the VPN provider can see your traffic — it is not anonymity. Not provisioned; would be separately costed." },
  { id: "spam-calls", label: "Spam call identification & blocking", status: "planned", coverage: "Planned via the platform's call-directory extension (iOS CallKit / Android CallScreeningService). Only numbers in the provider's list are flagged; it cannot read call content." },
  { id: "sms-filter", label: "SMS filtering & suspicious message analysis", status: "planned", coverage: "Planned: filter SMS from unknown senders, and let you paste a suspicious message for analysis. End-to-end encrypted chats stay private — Honeycomb cannot and will not access them. No automatic replies are ever sent to suspicious senders." },
];

// ---------- Bluetooth ----------
export type BluetoothCapability = "remembered" | "active-multi" | "output-switch" | "simultaneous-audio";

export const BLUETOOTH_CAPABILITIES: Record<BluetoothCapability, { label: string; supported: "platform-dependent" | "widely-supported"; note: string }> = {
  remembered: { label: "Remembered pairings", supported: "widely-supported", note: "Devices you paired before are remembered by the OS and reconnect automatically." },
  "active-multi": { label: "Multiple active connections", supported: "platform-dependent", note: "Most phones keep several Bluetooth devices connected at once (e.g. watch + headphones + car). Exact limits are set by the OS and chipset." },
  "output-switch": { label: "Audio output switching", supported: "widely-supported", note: "Switching playback between connected outputs (car ↔ headphones) is supported on iOS and Android." },
  "simultaneous-audio": { label: "Simultaneous audio to two accessories", supported: "platform-dependent", note: "Sharing audio to two headphones at once needs specific OS support (e.g. iOS Audio Sharing with compatible AirPods, Samsung Dual Audio). Not universal — capability must be checked per device." },
};

export const BLUETOOTH_TESTS: string[] = [
  "Car + headphones: connect both, start audio in the car, then switch output to headphones — audio must move without dropping the car connection.",
  "Two accessories: connect two audio devices, verify both stay connected, and check whether simultaneous playback is offered (platform-dependent).",
  "Honeycomb never interrupts an active call to switch audio; call audio routing stays under OS control.",
];

// ---------- Lock ----------
export type LockState = "unlocked" | "locking" | "locked";

export const LOCK_SCOPE_NOTE =
  "This locks the Honeycomb app only. Locking the whole phone, or animating the system lock screen, requires separate OS integrations and is not implied here. Remote wipe is not offered by default.";

export interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: string;
  current: boolean;
}

export const SAMPLE_TRUSTED_DEVICES: TrustedDevice[] = [
  { id: "this-iphone", name: "This iPhone (sample)", lastUsed: "now", current: true },
  { id: "ipad-pro", name: "iPad Pro (sample)", lastUsed: "2 days ago", current: false },
  { id: "old-android", name: "Old Android phone (sample)", lastUsed: "4 months ago", current: false },
];

// ---------- Lock-screen bees ----------
// Pure fill computation so the animation is testable without rendering.
export const BEE_COUNT = 12;

export function beesForProgress(progress: number, reducedMotion: boolean): number {
  const clamped = Math.min(1, Math.max(0, progress));
  if (reducedMotion) return clamped >= 1 ? BEE_COUNT : 0;
  return Math.round(clamped * BEE_COUNT);
}
