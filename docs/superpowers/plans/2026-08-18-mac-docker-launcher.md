# Mac Docker Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package this Next.js ERP so a Mac user can double-click **Start ERP** to bring up Docker Compose (persistent Postgres + the app) and open the browser, and double-click **Stop ERP** to stop containers without deleting data.

**Architecture:** A multi-stage Docker image runs production Next (`output: "standalone"`). Compose runs `db` (Postgres 16 + named volume `pgdata`) and `app` (port 3000). An entrypoint always applies Prisma migrations and seeds only when the `User` table is empty. Two `osacompile` AppleScript apps call `packaging/macos/start.sh` and `stop.sh`, which bake no extra UI beyond macOS dialogs.

**Tech Stack:** Next.js 15.5 standalone, Prisma 7 (`prisma migrate deploy`), pnpm 9, Docker Compose, Postgres 16, macOS `osacompile` / `osascript`.

## Global Constraints

- Mac only; Docker Desktop is a prerequisite (do not auto-install).
- Compose project name: `erp-boilerplate`.
- `db` image: `postgres:16`; volume: `pgdata`; host port `5432:5432`.
- `app` host port `3000:3000`; healthcheck HTTP GET `/login` until 200.
- Packaged env in Compose (not `.env`): `POSTGRES_USER=erp`, `POSTGRES_PASSWORD=erp`, `POSTGRES_DB=components_playground`, `DATABASE_URL=postgresql://erp:erp@db:5432/components_playground`, `JWT_SECRET=erp-boilerplate-docker-demo-jwt-secret-not-for-production`.
- Seed only when `User` count is `0`; restarts must not reset data.
- Stop = `docker compose stop` (keep volume). Reset = documented `docker compose down -v` only.
- Start/Stop apps via `osacompile`; bake absolute repo root; no `.pkg` / Electron / Windows.
- Start wait timeout: 180 seconds; poll every 2 seconds.
- Keep existing `pnpm dev` / `db:*` scripts; do not rewrite `.env.example` with Docker hostnames.
- Demo logins stay `admin@example.com` / `user@example.com` / `password123`.
- Do not invent parallel form/modal/error stacks; this work is packaging + README only.

## File map

| File | Responsibility |
|------|----------------|
| `scripts/should-seed.ts` | Pure `shouldSeed(userCount)` |
| `scripts/should-seed.test.ts` | `node:test` cases for that helper |
| `scripts/maybe-seed.ts` | Count users; print `seed` or `skip` |
| `scripts/docker-entrypoint.sh` | migrate → maybe seed → `node server.js` |
| `next.config.ts` | `output: "standalone"` |
| `docker.npmrc` | `node-linker=hoisted` for image installs |
| `.dockerignore` | Keep image context small |
| `Dockerfile` | Multi-stage deps / build / runner |
| `docker-compose.yml` | `db` + `app`, healthchecks, named volume |
| `packaging/macos/start.sh` | Docker checks, compose up, wait, open browser |
| `packaging/macos/stop.sh` | compose stop |
| `packaging/macos/build-apps.sh` | `osacompile` Start/Stop `.app`s with baked `ROOT` |
| `package.json` | `test`, `packaging:macos`, `docker:up/down/reset` |
| `.gitignore` | `packaging/macos/dist/`; un-ignore `docs/superpowers/**` |
| `README.md` | Docker/Mac path, full demo catalog, docs index |

---

### Task 1: Seed-once helper

**Files:**
- Create: `scripts/should-seed.ts`
- Create: `scripts/should-seed.test.ts`
- Modify: `package.json` (add `test` script only)

**Interfaces:**
- Consumes: nothing
- Produces: `export function shouldSeed(userCount: number): boolean` — `true` iff `userCount === 0`

- [ ] **Step 1: Add the test script to `package.json`**

Add this script alongside the existing ones (do not remove any current scripts):

```json
"test": "tsx --test scripts/should-seed.test.ts"
```

- [ ] **Step 2: Write the failing test**

Create `scripts/should-seed.test.ts`:

```ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { shouldSeed } from "./should-seed.ts"

test("seeds when there are no users", () => {
  assert.equal(shouldSeed(0), true)
})

test("skips when any user exists", () => {
  assert.equal(shouldSeed(1), false)
  assert.equal(shouldSeed(42), false)
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `pnpm test`

Expected: FAIL — `Cannot find module './should-seed.ts'` (or `shouldSeed` is not exported).

- [ ] **Step 4: Implement the helper**

Create `scripts/should-seed.ts`:

```ts
export function shouldSeed(userCount: number): boolean {
  return userCount === 0
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `pnpm test`

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/should-seed.ts scripts/should-seed.test.ts
git commit -m "$(cat <<'EOF'
Add shouldSeed helper so Docker first-run seeding is testable.

EOF
)"
```

---

### Task 2: Docker image, Compose stack, and entrypoint

**Files:**
- Modify: `next.config.ts`
- Create: `docker.npmrc`
- Create: `.dockerignore`
- Create: `scripts/maybe-seed.ts`
- Create: `scripts/docker-entrypoint.sh`
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: `shouldSeed` from `scripts/should-seed.ts`
- Produces: Compose project `erp-boilerplate`; `app` listens on `0.0.0.0:3000`; entrypoint prints `Seed skipped` or runs `tsx prisma/seed.ts`; `node server.js` is PID 1 after setup

- [ ] **Step 1: Enable Next standalone output**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Add `docker.npmrc`**

Create `docker.npmrc` (used only inside the image so pnpm’s symlink farm does not break `COPY`):

```
node-linker=hoisted
```

- [ ] **Step 3: Add `.dockerignore`**

Create `.dockerignore`:

```
node_modules
.next
.git
.cursor
.docs
.superpowers
.vscode
coverage
packaging/macos/dist
.env
.env.*
!.env.example
*.md
!README.md
docs
.DS_Store
tsconfig.tsbuildinfo
```

- [ ] **Step 4: Add `scripts/maybe-seed.ts`**

This is the only process that talks to Prisma for the seed decision. Stdout is exactly `seed` or `skip` (entrypoint branches on that). Errors go to stderr and exit 1.

```ts
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../src/generated/prisma/client"
import { shouldSeed } from "./should-seed.ts"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

try {
  const count = await prisma.user.count()
  if (shouldSeed(count)) {
    process.stdout.write("seed\n")
  } else {
    process.stdout.write("skip\n")
  }
} finally {
  await prisma.$disconnect()
}
```

- [ ] **Step 5: Add `scripts/docker-entrypoint.sh`**

Create `scripts/docker-entrypoint.sh` (LF line endings, executable `chmod +x`):

```bash
#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
pnpm exec prisma migrate deploy

DECISION="$(pnpm exec tsx scripts/maybe-seed.ts)"
if [ "$DECISION" = "seed" ]; then
  echo "Empty User table — running seed..."
  pnpm exec tsx prisma/seed.ts
else
  echo "Seed skipped: users already exist"
fi

echo "Starting Next.js..."
exec node server.js
```

- [ ] **Step 6: Add `Dockerfile`**

Create `Dockerfile` at the repo root. Runtime keeps the **full hoisted `node_modules` from the deps stage** so `prisma migrate deploy`, `tsx prisma/seed.ts`, and `@faker-js/faker` work. Standalone `server.js` + `.next` + `public` come from the build stage. `HOSTNAME=0.0.0.0` is required so the container accepts connections on port 3000.

```dockerfile
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY docker.npmrc .npmrc
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY docker.npmrc .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm db:generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY docker.npmrc .npmrc
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/.next/standalone/server.js ./server.js
COPY --from=build /app/.next/standalone/.next ./.next
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /app/scripts/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

If `pnpm build` does not emit `.next/standalone/server.js`, stop and fix `next.config.ts` (`output: "standalone"`) before continuing. If standalone also emits a nested `node_modules`, do **not** copy it over the hoisted deps `node_modules`.

- [ ] **Step 7: Add `docker-compose.yml`**

Create `docker-compose.yml` at the repo root:

```yaml
name: erp-boilerplate

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: erp
      POSTGRES_PASSWORD: erp
      POSTGRES_DB: components_playground
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U erp -d components_playground"]
      interval: 2s
      timeout: 5s
      retries: 30

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://erp:erp@db:5432/components_playground
      JWT_SECRET: erp-boilerplate-docker-demo-jwt-secret-not-for-production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/login').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
        ]
      interval: 5s
      timeout: 5s
      retries: 36
      start_period: 40s

volumes:
  pgdata:
```

- [ ] **Step 8: Build and boot the stack**

Run:

```bash
docker compose up -d --build
```

Expected:

- Images build without error.
- `docker compose ps` shows `db` and `app` running (or `app` starting).
- Within ~3 minutes: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` prints `200`.
- `docker compose logs app` contains `Applying Prisma migrations...` and either `Empty User table — running seed...` or (on a later boot) `Seed skipped`.

If port 5432 or 3000 is already taken, stop the conflicting process (or the existing stack) and retry. Do not change the published ports.

- [ ] **Step 9: Verify seed-once and demo login**

1. Open `http://localhost:3000/login`, sign in as `admin@example.com` / `password123`. Expected: app shell, not an error toast.
2. Run `docker compose stop` then `docker compose up -d`. Expected: logs say `Seed skipped: users already exist`; the same login still works (password not reset).
3. Run `docker compose down -v` then `docker compose up -d --build`. Expected: seed runs again; demo login works.

- [ ] **Step 10: Stop the stack (leave the repo clean for later tasks)**

```bash
docker compose stop
```

- [ ] **Step 11: Commit**

```bash
git add next.config.ts docker.npmrc .dockerignore Dockerfile docker-compose.yml \
  scripts/maybe-seed.ts scripts/docker-entrypoint.sh
git commit -m "$(cat <<'EOF'
Add Docker Compose stack with persistent Postgres and first-run seed.

EOF
)"
```

---

### Task 3: macOS Start / Stop apps

**Files:**
- Create: `packaging/macos/start.sh`
- Create: `packaging/macos/stop.sh`
- Create: `packaging/macos/build-apps.sh`
- Modify: `package.json` (add `packaging:macos`, `docker:up`, `docker:down`, `docker:reset`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: repo-root `docker-compose.yml`; project name `erp-boilerplate`
- Produces: `packaging/macos/dist/Start ERP.app` and `packaging/macos/dist/Stop ERP.app` whose AppleScripts execute the repo’s `start.sh` / `stop.sh` (absolute paths baked at build time)

- [ ] **Step 1: Ignore generated apps**

Append to `.gitignore`:

```
# Generated macOS launcher apps
packaging/macos/dist/
```

Also replace the existing `docs/*` ignore with these four lines so specs and plans stay committable without `-f`:

```
docs/*
!docs/superpowers/
!docs/superpowers/**
```

Leave `.superpowers/*` as it is.

- [ ] **Step 2: Add `packaging/macos/start.sh`**

Create `packaging/macos/start.sh` (LF, `chmod +x`). GUI apps have a thin `PATH`; prepend Docker Desktop locations. Dialogs use `osascript`. Do not open the browser on failure.

```bash
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
```

- [ ] **Step 3: Add `packaging/macos/stop.sh`**

Create `packaging/macos/stop.sh` (LF, `chmod +x`):

```bash
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
```

`docker compose stop` when already stopped must still exit 0 (Compose does this). Do not show an error dialog in that case.

- [ ] **Step 4: Add `packaging/macos/build-apps.sh`**

Create `packaging/macos/build-apps.sh` (LF, `chmod +x`). It bakes **absolute** paths to `start.sh` / `stop.sh` in the repo. Re-run after moving the repo.

```bash
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
```

- [ ] **Step 5: Add pnpm scripts**

In `package.json` `scripts`, add (keep existing scripts):

```json
"packaging:macos": "packaging/macos/build-apps.sh",
"docker:up": "docker compose up -d --build",
"docker:down": "docker compose stop",
"docker:reset": "docker compose down -v"
```

- [ ] **Step 6: Build the apps**

Run: `pnpm packaging:macos`

Expected stdout contains paths to `Start ERP.app` and `Stop ERP.app` under `packaging/macos/dist/`. Both directories exist (`*.app` is a directory).

- [ ] **Step 7: Manual launcher checks**

1. Double-click **Start ERP** (or `open "packaging/macos/dist/Start ERP.app"`). Expected: browser opens `http://localhost:3000` (login page).
2. Quit the browser. Expected: `curl http://localhost:3000/login` still returns 200.
3. Double-click **Stop ERP**. Expected: notification “ERP stopped”; `curl` to `:3000` fails.
4. Double-click **Stop ERP** again. Expected: no error dialog; notification still OK.
5. Quit Docker Desktop, then Start. Expected: dialog “Docker Desktop is not running…” and the browser does **not** open.

- [ ] **Step 8: Commit**

Do not add `packaging/macos/dist/`.

```bash
git add packaging/macos/start.sh packaging/macos/stop.sh packaging/macos/build-apps.sh \
  package.json .gitignore
git commit -m "$(cat <<'EOF'
Add Mac Start/Stop apps that wrap Docker Compose.

EOF
)"
```

---

### Task 4: README — run paths, demos, and docs index

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: routes from `AGENTS.md` demos table; files in `.docs/components/`; files in `docs/superpowers/specs/`
- Produces: README that documents both run paths and does not orphan any spec

- [ ] **Step 1: Replace `README.md` with the following content**

Use this full file (do not leave the old Getting started / Documentation sections in place):

```md
# Components Playground

Next.js (App Router) ERP boilerplate / component playground. Shared UI systems live under `src/components/shared`; feature verticals under `src/features`. Auth uses jose cookie sessions + Prisma; middleware requires login for all app routes.

## Stack

- **Next.js 15** App Router + TypeScript
- **shadcn/ui** + Tailwind
- **react-hook-form** + **zod**
- **Prisma** + PostgreSQL
- **sonner** toasts
- Package manager: **pnpm**
- **Docker Compose** for the packaged Mac app (Postgres + Next.js)

## Getting started

### Option A — Mac apps (Docker)

Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running. Host Node is not required to *run* this path (you need pnpm only to generate the `.app` icons).

```bash
pnpm packaging:macos
```

That writes two apps:

- `packaging/macos/dist/Start ERP.app`
- `packaging/macos/dist/Stop ERP.app`

Drag them to the Desktop, `/Applications`, or the Dock. Double-click **Start ERP**: Compose builds/starts Postgres (volume `pgdata`) and the app, then opens [http://localhost:3000](http://localhost:3000). First start downloads images and can take a few minutes; later starts are faster. Closing the browser leaves the stack running. Double-click **Stop ERP** to stop containers. Data survives.

If you move this repo, run `pnpm packaging:macos` again so the apps pick up the new path.

Compose env is demo-only (`JWT_SECRET` is not for production). Published ports: **3000** (app), **5432** (Postgres).

```bash
pnpm docker:up      # same stack as Start, without the browser
pnpm docker:down    # same as Stop (keeps the database volume)
pnpm docker:reset   # docker compose down -v — deletes all packaged DB data
```

After `docker:reset`, the next Start re-runs migrations and seed.

### Option B — local development

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
# DATABASE_URL can point at localhost:5432 if the Docker db service is running

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

Seeded on first empty database (`pnpm db:seed` or Docker first run):

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password123` | ADMIN (read + write) |
| `user@example.com` | `password123` | USER (read-only) |

### Scripts

| Script | Command |
|--------|---------|
| Dev | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Test | `pnpm test` |
| Start | `pnpm start` |
| Generate Prisma client | `pnpm db:generate` |
| Migrate DB | `pnpm db:migrate` |
| Seed demo data | `pnpm db:seed` |
| Mac Start/Stop apps | `pnpm packaging:macos` |
| Docker up | `pnpm docker:up` |
| Docker stop | `pnpm docker:down` |
| Docker reset (deletes volume) | `pnpm docker:reset` |

## What’s implemented

| System | Where to see it | Docs | Cursor rule |
|--------|-----------------|------|-------------|
| **Dynamic forms** — FieldDef registry, layouts, conditional fields | Feature forms (e.g. member create/edit modal) | [`.docs/components/forms.md`](.docs/components/forms.md) | [`.cursor/rules/dynamic-forms.mdc`](.cursor/rules/dynamic-forms.mdc) |
| **Universal modals** — stack of notify / confirm / form | List-page create/edit/delete | [`.docs/components/modals.md`](.docs/components/modals.md) | [`.cursor/rules/universal-modals.mdc`](.cursor/rules/universal-modals.mdc) |
| **Error handling** — `ActionResult`, `withErrorBoundary`, `useError().run()` | Server actions + list CRUD | [`.docs/components/error-handling.md`](.docs/components/error-handling.md) | [`.cursor/rules/error-handling.mdc`](.cursor/rules/error-handling.mdc) |
| **Auth / RBAC** — jose session, middleware, `Actions` / `authorize` / `can` | `/login`, list write gates | [`.docs/components/auth.md`](.docs/components/auth.md) | [`.cursor/rules/auth-rbac.mdc`](.cursor/rules/auth-rbac.mdc) |
| **DynamicTable** — columns, toolbar/row actions | Members / org lists | [`.docs/components/tables.md`](.docs/components/tables.md) | [`.cursor/rules/dynamic-table.mdc`](.cursor/rules/dynamic-table.mdc) |
| **List-page CRUD** — hook + stateless view + RBAC | `/team/members`, org pages | [`.docs/components/list-pages.md`](.docs/components/list-pages.md) | [`.cursor/rules/list-page-crud.mdc`](.cursor/rules/list-page-crud.mdc) |
| **Feature architecture** — folder layout, hook → view | `src/features/users/` | [`.docs/components/architecture.md`](.docs/components/architecture.md) | [`.cursor/rules/feature-architecture.mdc`](.cursor/rules/feature-architecture.mdc) |
| **Logging / audit** — `logActivity` + ADMIN activity list | `/team/activity`, login/logout | [`.docs/components/logging.md`](.docs/components/logging.md) | [`.cursor/rules/logging.mdc`](.cursor/rules/logging.mdc) |

### Demos

| Route | What it proves |
|-------|----------------|
| `/` | Home landing — links to list CRUD + activity demos |
| `/login` | Auth gate + `SESSION_EXPIRED` acknowledge target |
| `/clock` | Kiosk time clock — on-page login, check-in/out, attendance ↔ `UserActivity` |
| `/team/members` | List-page CRUD (forms + modals + `run()`) |
| `/team/activity` | Audit trail (`logActivity` + ADMIN `logging:read`) |
| `/team/shift-templates` | Shift templates CRUD + generate instances |
| `/team/my-shifts` | Schedule calendar — own shifts / managed locations |
| `/profile` | Self-service hub — profile, upcoming shifts, time off / sick |
| `/team/time-off` | Leave inbox — approve/reject; cancels overlapping shifts |
| `/organization/departments` | Org vertical + list CRUD |
| `/organization/locations` | Org vertical + manager select + list CRUD |

### Layout

`AppShell` (`src/components/shared/layout/app-shell.tsx`) provides sidebar + header for authenticated routes. Root `AppProviders` mounts `ModalProvider`, `AuthProvider`, `ErrorProvider`, `ModalRoot`, and Sonner. Login lives under `(auth)` without the sidebar.

### Users vertical (reference)

- Forms: `src/features/users/components/forms/`
- Shared schema: `src/lib/schemas/user.ts`
- Server actions: `src/features/users/actions/user-actions.ts`
- Session / RBAC: `src/features/auth/permissions.ts` (`Actions`, `can`) + `session.ts` (`authorize`)

Canonical client submit:

```ts
const data = await run(updateUser(values), { form })
if (data) toast.success("Saved")
```

## Project layout

```
src/
  app/                      Routes (login, home, team, organization, profile, clock)
  components/
    shared/forms/           DynamicForm system
    shared/modals/          Modal stack
    shared/layout/          AppShell, sidebar, header
    shared/table/           DynamicTable
    ui/                     shadcn primitives
  features/
    auth/                   Sessions, RBAC, login actions
    errors/                 Error DTO, boundary, useError (client barrel)
    users/                  Reference vertical (members)
    departments/            Org vertical
    locations/              Org vertical
    logging/                Audit trail (logActivity + activity list)
    shifts/                 Templates, instances, calendar, clock
    profile/                Self-service hub
    time-off/               Leave requests + inbox
  lib/
    schemas/                Shared zod (FieldDefs + server)
    navigation.ts           Sidebar nav
    db.ts / env.ts          Prisma + env helpers

prisma/                     Schema, migrations, seed
Dockerfile                  Production Next + Prisma image
docker-compose.yml          app + Postgres (volume pgdata)
packaging/macos/            Start/Stop app build scripts
scripts/                    Docker entrypoint + seed-once helper
.docs/components/           Human guides
docs/superpowers/specs/     Design specs
.cursor/rules/              Agent rules (glob-scoped)
AGENTS.md                   Agent entrypoint (Next.js + this repo)
```

## Documentation

### Human guides

| Guide | Path |
|-------|------|
| Architecture | [`.docs/components/architecture.md`](.docs/components/architecture.md) |
| Auth / RBAC | [`.docs/components/auth.md`](.docs/components/auth.md) |
| Error handling | [`.docs/components/error-handling.md`](.docs/components/error-handling.md) |
| Forms | [`.docs/components/forms.md`](.docs/components/forms.md) |
| List pages | [`.docs/components/list-pages.md`](.docs/components/list-pages.md) |
| Logging | [`.docs/components/logging.md`](.docs/components/logging.md) |
| Modals | [`.docs/components/modals.md`](.docs/components/modals.md) |
| Tables | [`.docs/components/tables.md`](.docs/components/tables.md) |

Agent instructions: [`AGENTS.md`](AGENTS.md) (also referenced by `CLAUDE.md`). Cursor rules in [`.cursor/rules/`](.cursor/rules/) mirror the guides.

### Design specs

| Spec | Path |
|------|------|
| Table toolbar / members tabs | [`docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md`](docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md) |
| Loading skeletons | [`docs/superpowers/specs/2026-08-05-loading-skeletons-design.md`](docs/superpowers/specs/2026-08-05-loading-skeletons-design.md) |
| Profile hub & time off | [`docs/superpowers/specs/2026-08-06-profile-time-off-design.md`](docs/superpowers/specs/2026-08-06-profile-time-off-design.md) |
| Mac Docker launcher | [`docs/superpowers/specs/2026-08-18-mac-docker-launcher-design.md`](docs/superpowers/specs/2026-08-18-mac-docker-launcher-design.md) |

## Notes

- Prefer **pnpm**.
- This Next.js version may differ from training data — see `AGENTS.md` and `node_modules/next/dist/docs/` before inventing APIs.
- Auth uses jose cookie sessions + Prisma; `authorize(Actions.*)` / `can(role, Actions.*)` use the permission matrix and throw/gate with stable `AppError` kinds/codes.
- Generated Prisma client lives under `src/generated/prisma` (gitignored) — run `pnpm db:generate` after install.
- The Docker JWT secret is a fixed demo value in `docker-compose.yml`, not a production secret.
```

- [ ] **Step 2: Check README links resolve**

From the repo root:

```bash
test -f .docs/components/architecture.md
test -f .docs/components/auth.md
test -f .docs/components/error-handling.md
test -f .docs/components/forms.md
test -f .docs/components/list-pages.md
test -f .docs/components/logging.md
test -f .docs/components/modals.md
test -f .docs/components/tables.md
test -f docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md
test -f docs/superpowers/specs/2026-08-05-loading-skeletons-design.md
test -f docs/superpowers/specs/2026-08-06-profile-time-off-design.md
test -f docs/superpowers/specs/2026-08-18-mac-docker-launcher-design.md
```

Expected: all `test` commands exit 0. If the 2026-07-28 spec is gitignored, `git add -f` it in this commit so the README link is a tracked file.

- [ ] **Step 3: Commit**

```bash
git add README.md
git add -f docs/superpowers/specs/2026-07-28-table-toolbar-members-tabs-design.md
git commit -m "$(cat <<'EOF'
Document Docker Mac apps, demos, and design specs in the README.

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec section | Task |
|--------------|------|
| Compose `db` + `app`, volume `pgdata`, ports 3000/5432, project name | Task 2 |
| Standalone Next image, hoisted pnpm, entrypoint migrate + seed-once + `node server.js` | Tasks 1–2 |
| Start/Stop `.app`, bake ROOT, dialogs, 180s wait, stop keeps volume | Task 3 |
| pnpm `packaging:macos` / `docker:up` / `docker:down` / `docker:reset` | Task 3 |
| README two run paths, full demo table, all guides + all specs | Task 4 |
| gitignore `packaging/macos/dist/`; no committed `.env` | Task 3 |
| Out of scope (Windows, Electron, `.pkg`, auto Docker install) | not scheduled |
