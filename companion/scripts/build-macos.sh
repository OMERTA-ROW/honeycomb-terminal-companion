#!/bin/sh
# Builds an UNSIGNED, architecture-independent companion (runs on Apple silicon arm64
# and Intel) using macOS's built-in /usr/bin/python3. No dependencies, no installer.
set -eu
cd "$(dirname "$0")/.."
OUT="${1:-dist}"; mkdir -p "$OUT/stage"
rm -rf "$OUT/stage/honeycomb"; cp -R honeycomb "$OUT/stage/honeycomb"
find "$OUT/stage" -name '__pycache__' -prune -exec rm -rf {} +
python3 -m zipapp "$OUT/stage" -m "honeycomb.__main__:main" -p "/usr/bin/env python3" -o "$OUT/honeycomb-companion.pyz"
rm -rf "$OUT/stage"
chmod 755 "$OUT/honeycomb-companion.pyz"
(cd "$OUT" && shasum -a 256 honeycomb-companion.pyz 2>/dev/null || sha256sum honeycomb-companion.pyz) > "$OUT/honeycomb-companion.pyz.sha256"
cat "$OUT/honeycomb-companion.pyz.sha256"
echo "UNSIGNED build. Not notarized. Verify the SHA-256 before running."
