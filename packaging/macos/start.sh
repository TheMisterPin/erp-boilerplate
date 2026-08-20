#!/bin/sh
set -eu

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${PATH:-}"

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

dialog() {
  osascript -e 'on run argv' -e 'display dialog (item 1 of argv) buttons {"OK"} default button "OK" with title "Start ERP"' -e 'end run' -- "$1"
}

if ! command -v docker >/dev/null 2>&1; then
  dialog "Docker Desktop is required. Install it from https://www.docker.com/products/docker-desktop/ then try Start again."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  dialog "Docker Desktop is not running. Open Docker Desktop, wait until it is idle, then try Start again."
  exit 1
fi

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

our_app_running() {
  docker compose -p erp-boilerplate ps --status running --services 2>/dev/null | grep -qx app
}

if port_in_use 3000; then
  if our_app_running; then
    open "http://localhost:3000"
    exit 0
  fi
  dialog "Port 3000 is already in use by another program. Quit that program or change its port, then try Start again."
  exit 1
fi

if port_in_use 5432; then
  if ! docker compose -p erp-boilerplate ps --status running --services 2>/dev/null | grep -qx db; then
    dialog "Port 5432 is already in use by another program (often a local Postgres). Quit that program, then try Start again."
    exit 1
  fi
fi

set +e
UP_OUT="$(docker compose -p erp-boilerplate up -d --build 2>&1)"
UP_STATUS=$?
set -e
if [ "$UP_STATUS" -ne 0 ]; then
  dialog "$(printf 'Docker Compose failed to start. Last output:\n\n%s' "$(printf '%s' "$UP_OUT" | tail -n 20)")"
  exit 1
fi

i=0
while [ "$i" -lt 90 ]; do
  if curl -sf "http://localhost:3000/login" >/dev/null 2>&1; then
    open "http://localhost:3000"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done

dialog "The app did not become ready within 3 minutes. First start can be slow. Check Docker Desktop and run: docker compose -p erp-boilerplate logs"
exit 1
