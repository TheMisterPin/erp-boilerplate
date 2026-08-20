#!/bin/sh
set -eu

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${PATH:-}"

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

dialog() {
  osascript -e 'on run argv' -e 'display dialog (item 1 of argv) buttons {"OK"} default button "OK" with title "Stop ERP"' -e 'end run' -- "$1"
}

if ! command -v docker >/dev/null 2>&1; then
  dialog "Docker Desktop is required to stop the app. Install or open Docker Desktop, then try Stop again."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  dialog "Docker Desktop is not running. Open Docker Desktop, then try Stop again."
  exit 1
fi

docker compose -p erp-boilerplate stop
osascript -e 'display notification "ERP stopped" with title "Stop ERP"'
exit 0
