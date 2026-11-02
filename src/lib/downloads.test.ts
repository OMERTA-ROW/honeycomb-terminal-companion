import { describe, expect, it } from "vitest";
import { checksumFor, compatibility, detectPlatform, findChecksumAsset, isAllowedUrl, normalizeSha256, parseContentRange, parseSource, resumeRange, safeFilename, verifyResult } from "./downloads";

const H = "a".repeat(64);

describe("download manager rules", () => {
  it("only allows approved https hosts", () => {
    expect(isAllowedUrl("https://github.com/cli/cli/releases/download/v1/gh.zip")).toBe(true);
    expect(isAllowedUrl("http://github.com/x")).toBe(false);
    expect(isAllowedUrl("https://evil.com/x")).toBe(false);
    expect(isAllowedUrl("https://github.com.evil.com/x")).toBe(false);
    expect(isAllowedUrl("https://user:pw@github.com/x")).toBe(false);
  });
  it("turns owner/repo into a GitHub zip", () => {
    expect(parseSource("cli/cli")).toMatchObject({ kind: "repo", url: "https://codeload.github.com/cli/cli/zip/HEAD" });
    expect(parseSource("https://github.com/a/b.git")).toMatchObject({ kind: "repo", repo: "b" });
    expect(parseSource("a/b@../x")).toBeNull();
    expect(parseSource("https://example.com/f.zip")).toBeNull();
  });
  it("keeps filenames inside storage", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename(".hidden")).toBe("hidden");
    expect(safeFilename("")).toBe("download.bin");
  });
  it("detects iPad desktop-mode as iOS", () => {
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0)).toBe("mac");
  });
  it("iOS stores but never treats Mac/Windows installers as installable", () => {
    expect(compatibility("gh_2.0_macOS_arm64.pkg", "ios").level).toBe("store-only");
    expect(compatibility("tool.exe", "ios").executable).toBe(true);
    expect(compatibility("app.ipa", "ios").level).toBe("blocked");
    expect(compatibility("notes.txt", "ios").level).toBe("ok");
  });
  it("reads checksum files", () => {
    expect(checksumFor(`${H}  gh_macOS.zip\n${"b".repeat(64)}  other.zip`, "gh_macOS.zip")).toBe(H);
    expect(checksumFor(`${H} *dist/rg.tar.gz`, "rg.tar.gz")).toBe(H);
    expect(checksumFor(H, "anything")).toBe(H);
    expect(checksumFor(`${H}  other`, "mine")).toBeNull();
    expect(normalizeSha256(`sha256:${H.toUpperCase()}`)).toBe(H);
    expect(normalizeSha256("abc")).toBeNull();
  });
  it("verification needs an expected value and an exact match", () => {
    expect(verifyResult(H, null)).toBe("unverified");
    expect(verifyResult(H, H.toUpperCase())).toBe("verified");
    expect(verifyResult(H, "b".repeat(64))).toBe("mismatch");
  });
  it("resumes from received bytes", () => {
    expect(resumeRange(0, 100)).toBeNull();
    expect(resumeRange(40, 100)).toBe("bytes=40-");
    expect(resumeRange(100, 100)).toBeNull();
    expect(parseContentRange("bytes 40-99/100")).toEqual({ start: 40, total: 100 });
    expect(parseContentRange(null)).toBeNull();
  });
  it("finds release checksum assets", () => {
    const a = [{ name: "x.zip", url: "u1", size: 1 }, { name: "gh_2.0_checksums.txt", url: "u2", size: 1 }];
    expect(findChecksumAsset(a, "x.zip")?.url).toBe("u2");
    expect(findChecksumAsset([{ name: "x.zip.sha256", url: "u3", size: 1 }, ...a], "x.zip")?.url).toBe("u3");
  });
});
