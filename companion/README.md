# Honeycomb Terminal companion — macOS source skeleton (NOT BUILT, NOT TESTED)

Status: planning skeleton only, 2026-10-25. This directory contains a proposed
source layout and build/packaging instructions for the macOS host companion.
**No binary exists. No installer exists. Nothing here has been compiled, signed,
or run on any Mac.** Do not link to or advertise a download.

## Proposed layout (not yet implemented)

```text
companion/
  macos/
    Sources/
      HoneycombCompanion/
        App.swift              # menu-bar app entry; owner-visible stop/revoke controls
        PtySession.swift       # PTY spawn with the signed-in user's login shell (never root)
        SessionBroker.swift    # detached supervisor so UI restarts don't kill the PTY
        Pairing.swift          # short-lived single-use challenge, host-side approval UI
        KeyStore.swift         # device public keys in Keychain; private keys never leave devices
        Transport.swift        # E2E encrypted channel (reviewed Noise implementation TBD)
    Package.swift              # SwiftPM manifest (draft)
    Tests/                     # PTY, pairing-expiry, revoke, reconnect acceptance tests
  docs/
    SIGNING.md                 # signing/notarization prerequisites and blockers
```

## Build & packaging instructions (for when implementation is authorized)

1. Requires a Mac with Xcode 16+ and an Apple Developer Program membership
   (paid — not procured; see blockers).
2. `cd companion/macos && swift build` once sources exist.
3. Sign with a Developer ID Application certificate; notarize with
   `xcrun notarytool`; staple with `xcrun stapler`.
4. Distribute as a signed `.dmg` or `.pkg`. No download link exists today.

## Explicit blockers

- **Hardware:** no physical Mac is available in this environment; no build or
  test has run.
- **Signing:** Apple Developer Program membership and Developer ID certificate
  are not procured (paid service — requires owner authorization).
- **Notarization:** requires the above plus notarytool credentials, stored
  securely (never in source or chat).
- **Distribution:** no hosting or download page exists; any link shown anywhere
  in the preview is disabled placeholder text.
- **iOS/iPadOS/Android apps:** separate native projects; not started. Mobile
  install instructions in the preview are truthful placeholders ("not yet
  available"), not store links.

## Smallest real-device acceptance test (when a Mac + iPhone exist)

1. Build and launch the companion on the owner's Mac (unsigned local build is
   fine for the spike).
2. Companion spawns a PTY with the owner's login shell; verify `whoami`, `pwd`,
   and `which git` match the Mac's own Terminal.app.
3. Pair over the local network with a short-lived code; confirm expiry and
   wrong-code rejection.
4. From the phone, run `echo 'Honeycomb connected'`; verify the exact output
   returns and appears in the Mac's session log.
5. Enable airplane mode on the phone for 30 seconds, disable it, and verify
   the same shell session resumes (PID, cwd, scrollback).
6. Revoke the phone on the Mac; verify reconnect is denied.
