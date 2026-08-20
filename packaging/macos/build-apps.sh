#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
DIST="$ROOT/packaging/macos/dist"
START_SH="$ROOT/packaging/macos/start.sh"
STOP_SH="$ROOT/packaging/macos/stop.sh"

mkdir -p "$DIST"
rm -rf "$DIST/Start ERP.app" "$DIST/Stop ERP.app"

write_applescript() {
  dest="$1"
  script_path="$2"
  python3 - "$dest" "$script_path" <<'PY'
import pathlib, sys
dest, script_path = sys.argv[1], sys.argv[2]
# AppleScript string literal: escape backslash and double quote
escaped = script_path.replace("\\", "\\\\").replace('"', '\\"')
pathlib.Path(dest).write_text(
    f'do shell script quoted form of "{escaped}"\n',
    encoding="utf-8",
)
PY
}

TMPDIR="$(mktemp -d)"
write_applescript "$TMPDIR/start.applescript" "$START_SH"
write_applescript "$TMPDIR/stop.applescript" "$STOP_SH"
osacompile -o "$DIST/Start ERP.app" "$TMPDIR/start.applescript"
osacompile -o "$DIST/Stop ERP.app" "$TMPDIR/stop.applescript"
rm -rf "$TMPDIR"

echo "Created:"
echo "  $DIST/Start ERP.app"
echo "  $DIST/Stop ERP.app"
