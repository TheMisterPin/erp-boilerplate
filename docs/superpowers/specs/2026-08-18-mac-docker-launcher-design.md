# Mac Docker launcher — design

**Date:** 2026-08-18  
**Status:** Approved (Compose + Start/Stop `.app`, option C)

## Goal

Ship a **Mac-only** clickable experience: double-click **Start ERP** → Docker Compose brings up Postgres (persistent volume) and the Next.js app → the default browser opens to the app. Double-click **Stop ERP** → containers stop. Data survives. No menu-bar app, no Electron/Tauri, no Windows in v1.

## Decisions

| Topic | Choice |
|-------|--------|
| Audience | This Mac (and other Macs with Docker Desktop) |
| Runtime | Docker Compose: `db` + `app` |
| Database | Postgres image + **named volume** `pgdata` |
| App | Production Next.js image (`next build` / `next start`) |
| Lifecycle | Start.app / Stop.app only (option **C**) |
| Stop semantics | `docker compose stop` — volume kept |
| First-run seed | Migrate always; seed **only when the users table is empty** |
| Installer | Generate two `.app` bundles (not a `.pkg`) |
| Docker Desktop | Prerequisite; not auto-installed |
| Host Node | Not required to *run* the packaged stack |
| README | Document Docker/Mac flow, list **all** demo routes, link component guides **and** design specs |

## Scope

### In

- `Dockerfile` (multi-stage, standalone Next output)
- `docker-compose.yml` at repo root (`db` + `app`, healthchecks, named volume)
- Packaged-stack env in Compose (not the developer `.env`)
- `scripts/docker-entrypoint.sh` — `migrate deploy` → conditional seed → `next start`
- `packaging/macos/` — scripts that emit **Start ERP.app** and **Stop ERP.app**
- pnpm scripts: `packaging:macos`, plus compose helpers (`docker:up` / `docker:down` optional)
- README: Mac/Docker usage, full “what’s implemented” catalog, docs index
- `.dockerignore` so image builds stay small

### Out (v1)

- Windows / Linux launchers
- Electron, Tauri, or an in-app native window
- `.pkg` / `.dmg` installer
- Auto-install or auto-start of Docker Desktop
- Bundling Node/Postgres *without* Docker
- Production-grade secrets, TLS, or remote hosting
- `docker compose down -v` as a Dock icon (reset stays a documented CLI)

## Design

### 1. Compose architecture

```
Start ERP.app  →  docker compose up -d [--build]
                      ├─ db  (Postgres + volume pgdata)
                      └─ app (Next.js, port 3000)
                 wait until http://localhost:3000 is up
                 open http://localhost:3000
                 exit (containers keep running)

Stop ERP.app   →  docker compose stop
                 optional “Stopped” dialog
                 exit (pgdata untouched)
```

**Services**

| Service | Image / build | Ports | Persist |
|---------|---------------|-------|---------|
| `db` | `postgres:16` | `5432:5432` (so `pnpm dev` can share the same DB) | named volume `pgdata` |
| `app` | build from repo `Dockerfile` | `3000:3000` | none (stateless; DB holds data) |

- `app` `depends_on: db` with **condition: service_healthy** (`pg_isready`).
- `app` healthcheck: HTTP GET `/login` until status 200 (public route; `/` may redirect to login).
- Compose project name: `erp-boilerplate` (stable, so Start/Stop always talk to the same stack).
- Packaged env lives **in the compose file** (avoids gitignoring `.env*`):

  - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` = `erp` / `erp` / `components_playground`
  - `DATABASE_URL=postgresql://erp:erp@db:5432/components_playground` (hostname **`db`**, not localhost)
  - `JWT_SECRET` = a long fixed **demo** string, documented as not for production

Developer `pnpm dev` keeps using local `.env` + host Postgres (or a separately started `db` service). Do not overwrite `.env.example` with Docker-only hostnames.

**Port 5432 on the host:** always published (`5432:5432`) so `pnpm dev` can point `DATABASE_URL` at the same volume. If 5432 is already taken, Start surfaces the Compose error (see §5).

### 2. Docker image

Enable Next.js `output: "standalone"` in `next.config.ts` so the runtime image copies `.next/standalone` + `.next/static` + `public` instead of `node_modules`.

Multi-stage:

1. **deps** — `pnpm install --frozen-lockfile`
2. **build** — `prisma generate`, `next build`
3. **runtime** — Node slim, copy standalone output, Prisma schema + migrations + `seed.ts`, and enough tooling to run `prisma migrate deploy` and `tsx prisma/seed.ts` (Prisma CLI + `tsx`). Entrypoint is the only extra process.

`.dockerignore`: `node_modules`, `.next`, `.git`, `packaging/macos/dist`, coverage, `.env`.

Do not bake developer secrets into the image. Runtime env comes from Compose.

### 3. Entrypoint (first run vs restart)

`scripts/docker-entrypoint.sh` (executable):

1. Wait for Postgres (Compose healthcheck already gates start; still retry `DATABASE_URL` briefly).
2. `prisma migrate deploy` — always.
3. Seed **once**: if `User` count is `0`, run `tsx prisma/seed.ts`. If any user exists, skip. Restarts must not reset passwords or wipe demo edits.
4. `exec node server.js` (Next standalone output).

Demo credentials stay the README set (`admin@example.com` / `user@example.com` / `password123`).

Resetting data is explicit: `docker compose down -v` then Start again (re-seed). Document this; do not add a third Dock icon in v1.

### 4. macOS Start / Stop apps

**Layout**

```
packaging/macos/
  build-apps.sh          # invoked by pnpm packaging:macos
  start.sh               # compose up, wait, open browser
  stop.sh                # compose stop
  dist/                  # generated .app bundles (gitignored)
```

`build-apps.sh` uses `osacompile` (AppleScript wrappers) or `platypus` only if already available — **prefer `osacompile`** (ships with macOS). Each `.app` runs the matching shell script.

**Project path:** bake the **absolute repo root** into the generated apps at build time. Dragging Start/Stop to Desktop or `/Applications` still works after the repo moves only if the user re-runs `pnpm packaging:macos`. Document that.

**Start.sh**

1. Resolve baked `ROOT`.
2. If `docker` is missing or the daemon is down → `osascript` dialog: install/start Docker Desktop; **exit non-zero**. Do not open the browser.
3. `cd "$ROOT" && docker compose up -d --build`.
4. Poll `http://localhost:3000` every 2s, timeout **180s** (first image build). On timeout → dialog pointing at `docker compose logs`; **do not** open the browser.
5. If port **3000** is already in use *and* it is not this stack → dialog naming the conflict; exit.
6. `open http://localhost:3000`.
7. Exit 0; containers keep running.

**Stop.sh**

1. `cd "$ROOT" && docker compose stop`.
2. If already stopped, treat as success (no error dialog).
3. Optional short “ERP stopped” dialog or notification.
4. Exit 0.

**Icons:** v1 may use a generic macOS applet icon. Custom `.icns` is nice-to-have, not required to ship.

Generated `dist/*.app` is gitignored. The build script is committed.

### 5. Error UX

| Condition | User-visible result |
|-----------|---------------------|
| Docker CLI missing | Dialog: install Docker Desktop; link/name it; exit |
| Docker daemon not running | Dialog: open Docker Desktop and retry Start; exit |
| Port 3000 taken by something else | Dialog: something else is using 3000; exit |
| Port 5432 taken (if exposed) | Compose error surfaced in a dialog with the last compose lines; exit |
| Health wait timeout | Dialog: first build can take a few minutes; retry Start or run `docker compose logs`; exit |
| Stop when already stopped | Silent success (or “Already stopped”) — not an error |

No silent failures. Launchers are fire-and-forget; they do not stay open as a status UI.

### 6. pnpm scripts

| Script | Command |
|--------|---------|
| `packaging:macos` | `packaging/macos/build-apps.sh` |
| `docker:up` | `docker compose up -d --build` |
| `docker:down` | `docker compose stop` |
| `docker:reset` | `docker compose down -v` (documented destructive reset) |

Keep existing `dev` / `build` / `db:*` scripts unchanged.

### 7. README

Rewrite/extend README so a newcomer can run **either** local pnpm **or** the Mac Docker apps, and can find every demo and every written doc.

**Getting started — two paths**

1. **Development (existing):** `.env` → `pnpm install` → migrate/seed → `pnpm dev`.
2. **Mac app (new):** Install Docker Desktop → from repo `pnpm packaging:macos` → drag `packaging/macos/dist/Start ERP.app` and `Stop ERP.app` to Desktop or Dock → double-click Start. First click builds images (slow); later clicks are fast. Browser opens `http://localhost:3000`. Stop leaves data in `pgdata`.

List Docker scripts and the reset command.

**What’s implemented — full catalog**

Keep the shared-systems table (forms, modals, errors, auth, tables, list CRUD, architecture, logging).

Add a **Demos / product surfaces** table matching `AGENTS.md` (and home links), each with route + one-line “what it proves”:

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

**Documentation index**

- Human guides: every file in `.docs/components/` (forms, modals, error-handling, auth, tables, list-pages, architecture, logging).
- Agent entry: `AGENTS.md`.
- Design specs: every file in `docs/superpowers/specs/`, including:

  - [Table toolbar / members tabs](./2026-07-28-table-toolbar-members-tabs-design.md) (link from README as `docs/superpowers/specs/…`)
  - [Loading skeletons](./2026-08-05-loading-skeletons-design.md)
  - [Profile hub & time off](./2026-08-06-profile-time-off-design.md)
  - **This spec** (Mac Docker launcher)

README links use repo-relative paths. Do not leave specs orphaned from the README.

**Project layout** — add `Dockerfile`, `docker-compose.yml`, `packaging/macos/`, `docs/superpowers/specs/`.

### 8. Gitignore

- Ignore `packaging/macos/dist/`
- Do **not** ignore `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`, or the packaging *source* scripts
- Specs under `docs/superpowers/specs/` stay committed (`git add -f` if `docs/*` still ignores new files)
- No committed `.env`; Compose holds demo env

## Test plan (manual)

- [ ] `docker compose up --build` from a clean machine with Docker: app serves `/login` on :3000; seed users can sign in
- [ ] Stop containers; Start again: data still there (edited user / extra row survives); seed did not reset
- [ ] `docker compose down -v` then Start: DB empty → seed runs again; demo logins work
- [ ] `pnpm packaging:macos` produces two `.app`s; Start opens the browser to localhost:3000
- [ ] Start while Docker is quit: dialog, no browser tab
- [ ] Stop while already stopped: no error dialog
- [ ] Closing the browser leaves the stack running; Stop then :3000 is down
- [ ] `pnpm dev` path in README still works with existing `.env`
- [ ] README lists every demo route above and links every `.docs/components/*` guide and every `docs/superpowers/specs/*` file
