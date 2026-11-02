/** Browser-safe, pure download-manager rules shared by the Downloads page, the proxy route and tests. Nothing here executes files. */

export const ALLOWED_HOSTS = [
  "github.com",
  "api.github.com",
  "codeload.github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "raw.githubusercontent.com",
  "registry.npmjs.org",
  "nodejs.org",
  "files.pythonhosted.org",
] as const;

export const MAX_DOWNLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB per file
export const MAX_VERIFY_BYTES = 512 * 1024 * 1024; // in-browser SHA-256 limit

export function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && (ALLOWED_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

export interface ApprovedSource {
  id: string;
  name: string;
  repo: string; // owner/name on GitHub
  note: string;
}

/** Approved CLI projects: release assets come from their official GitHub releases. */
export const APPROVED_SOURCES: ApprovedSource[] = [
  { id: "gh", name: "GitHub CLI", repo: "cli/cli", note: "Publishes SHA-256 checksums with every release." },
  { id: "rg", name: "ripgrep", repo: "BurntSushi/ripgrep", note: "Per-asset .sha256 files." },
  { id: "fzf", name: "fzf", repo: "junegunn/fzf", note: "Publishes a checksums file." },
  { id: "tailscale", name: "Tailscale (source)", repo: "tailscale/tailscale", note: "Source archives; install Tailscale from the App Store on iPhone/iPad." },
];

export type ParsedSource =
  | { kind: "repo"; owner: string; repo: string; ref: string; url: string; filename: string }
  | { kind: "url"; url: string; filename: string };

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/** Accepts "owner/repo", "owner/repo@ref", a github.com repo URL, or any allowlisted https URL. */
export function parseSource(input: string): ParsedSource | null {
  const s = input.trim();
  const short = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:@([A-Za-z0-9_./-]+))?$/);
  const gh = s.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?(?:tree\/([A-Za-z0-9_./-]+))?$/);
  const m = short ?? gh;
  if (m && NAME.test(m[1]!) && NAME.test(m[2]!)) {
    const ref = m[3] ?? "HEAD";
    if (ref.includes("..")) return null;
    return {
      kind: "repo",
      owner: m[1]!,
      repo: m[2]!,
      ref,
      url: `https://codeload.github.com/${m[1]}/${m[2]}/zip/${ref}`,
      filename: safeFilename(`${m[2]}-${ref.replace(/\//g, "-")}.zip`),
    };
  }
  if (!isAllowedUrl(s)) return null;
  const last = decodeURIComponent(new URL(s).pathname.split("/").filter(Boolean).pop() ?? "download");
  return { kind: "url", url: s, filename: safeFilename(last) };
}

/** Strips paths, control characters and leading dots so a name can never escape managed storage or be hidden. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_").replace(/^\.+/, "").trim().slice(0, 120);
  return clean || "download.bin";
}

export type Platform = "ios" | "android" | "mac" | "windows" | "linux" | "unknown";

export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  if (/Linux|X11/.test(ua)) return "linux";
  return "unknown";
}

const EXEC_EXT = /\.(exe|msi|dmg|pkg|app|deb|rpm|appimage|apk|ipa|sh|bat|cmd|ps1|command|bin|run|jar)$/i;
const TARGETS: [RegExp, Platform][] = [
  [/(darwin|macos|apple|\.dmg$|\.pkg$|osx)/i, "mac"],
  [/(windows|win64|win32|\.exe$|\.msi$)/i, "windows"],
  [/(linux|\.deb$|\.rpm$|\.appimage$)/i, "linux"],
  [/(android|\.apk$)/i, "android"],
  [/(\.ipa$|ios)/i, "ios"],
];

export function targetPlatform(filename: string): Platform | "any" {
  for (const [re, p] of TARGETS) if (re.test(filename)) return p;
  return "any";
}

export interface Compatibility {
  level: "ok" | "store-only" | "blocked";
  executable: boolean;
  message: string;
}

/** Decides what this device may do with a file. Executables are never opened or run by Honeycomb. */
export function compatibility(filename: string, device: Platform): Compatibility {
  const executable = EXEC_EXT.test(filename);
  const target = targetPlatform(filename);
  if (/\.ipa$/i.test(filename))
    return { level: "blocked", executable: true, message: "iPhone/iPad apps can only be installed from the App Store or TestFlight. Honeycomb will not download .ipa files." };
  if (device === "ios" && (executable || (target !== "any" && target !== "ios")))
    return { level: "store-only", executable, message: `Built for ${target === "any" ? "another computer" : target}. iPhone/iPad cannot install or run it — it will only be stored here, e.g. to move to a paired computer later.` };
  if (target !== "any" && device !== "unknown" && target !== device)
    return { level: "store-only", executable, message: `Built for ${target}, not this ${device} device. It will only be stored.` };
  if (executable)
    return { level: "ok", executable, message: "Program or installer: stored only. Honeycomb never opens or runs it; verify the checksum before installing it yourself." };
  return { level: "ok", executable: false, message: "Stored as a file. Nothing is opened or run automatically." };
}

/** Finds the expected SHA-256 for `filename` in a SHA256SUMS-style file or a bare .sha256 file. */
export function checksumFor(text: string, filename: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/) ?? line.match(/^SHA256 \((.+)\) = ([a-fA-F0-9]{64})$/);
    if (!m) continue;
    const [hash, name] = m[1]!.length === 64 && /^[a-fA-F0-9]+$/.test(m[1]!) ? [m[1]!, m[2]!] : [m[2]!, m[1]!];
    if (name.split("/").pop() === filename) return hash.toLowerCase();
  }
  if (lines.length === 1 && /^[a-fA-F0-9]{64}$/.test(lines[0]!)) return lines[0]!.toLowerCase();
  return null;
}

export function normalizeSha256(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/^sha256:/, "");
  return /^[a-f0-9]{64}$/.test(s) ? s : null;
}

export type VerifyState = "verified" | "mismatch" | "unverified";
export function verifyResult(actual: string, expected: string | null): VerifyState {
  if (!expected) return "unverified";
  return actual.toLowerCase() === expected.toLowerCase() ? "verified" : "mismatch";
}

/** Next Range header when resuming; null means start over. */
export function resumeRange(received: number, total: number | null): string | null {
  if (received <= 0) return null;
  if (total !== null && received >= total) return null;
  return `bytes=${received}-`;
}

/** Parses "bytes 100-199/1000" → {start, total}. */
export function parseContentRange(h: string | null): { start: number; total: number | null } | null {
  const m = h?.match(/^bytes (\d+)-\d+\/(\d+|\*)$/);
  if (!m) return null;
  return { start: Number(m[1]), total: m[2] === "*" ? null : Number(m[2]) };
}

export interface ReleaseAsset { name: string; url: string; size: number }
/** Picks a checksum asset that covers `assetName` (per-asset .sha256 first, then a shared sums file). */
export function findChecksumAsset(assets: ReleaseAsset[], assetName: string): ReleaseAsset | null {
  return (
    assets.find((a) => a.name === `${assetName}.sha256` || a.name === `${assetName}.sha256sum`) ??
    assets.find((a) => /(sha256sums|checksums).*\.txt$|^sha256sums$|checksums$/i.test(a.name)) ??
    null
  );
}
