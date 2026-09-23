# Local-only mode plan (SQLite + FastAPI)

**Status:** Phases 0-3 complete on `codex/local-sqlite-mode`; Phase 4 is ready.

**Date:** 2026-09-23

This document describes how to convert the Hotel Management System from a hosted

product (Supabase + Render + Vercel) into a self-contained local project that runs

on one machine and can be handed to someone else as a zip archive.

## 1. Goals

- Remove every hosted dependency: no Supabase, no Render, no Vercel, no CI deployment.

- Replace PostgreSQL with a local SQLite database file. No database server, no host, no credentials.

- Keep the FastAPI backend as the owner of booking rules, pricing, availability, transitions, and reports.

- Keep the Next.js frontend and its current rendering model (server and client components).

- Preserve every functional feature: catalog, availability, bookings, cancellation, account, admin inventory, admin operations, dashboard, and reports.

- Require no `.env` file and no internet connection.

- Package the project so another person can unzip it, install dependencies, run two commands, and use it with their own local database.

## 2. Non-goals

- Browser `window.localStorage` as the data store. SQLite is the local store. See section 5.

- Multi-user or multi-device shared data over a network. Optional LAN access is noted in section 18 but is not part of the default plan.

- Email delivery, so email verification and emailed password resets are dropped.

- Online payments, which were already deferred in `BUILD_PLAN.md`.

- Row Level Security. It has no meaning without a shared multi-tenant database.

## 3. Current architecture (as-is)

```text

Browser -> Next.js -> FastAPI -> Supabase PostgreSQL

   |           |          |

   +---- Supabase Auth ---+

                |

        Supabase Storage

```

- Next.js App Router with TypeScript, Tailwind CSS, and shadcn/ui. Server components read data through `src/lib/api.ts`, which calls `http://localhost:8000/api/v1/...` with a Supabase bearer token.

- FastAPI owns business rules. Services execute raw SQL through SQLAlchemy async sessions (`text(...)` statements), verified with SQLAlchemy, and connect with `psycopg`/`asyncpg`.

- Supabase provides PostgreSQL, Auth (JWKS-verified JWT), Storage for room images, and 33 RLS policies.

- Route protection lives in `frontend/src/proxy.ts`, which refreshes the Supabase session and redirects unauthenticated users away from `/account`, `/admin`, and `/book`.

- Deployment assets exist for Render (`render.yaml`) and Vercel, plus two GitHub Actions workflows.

## 4. Target architecture (to-be)

```text

Browser -> Next.js -> FastAPI -> SQLite file (backend/data/hms.db)

   |           |

   +-- httpOnly session cookie issued by FastAPI

                |

        Local filesystem (backend/data/uploads)

```

- One Python process, one Next.js process, one SQLite file, one uploads folder.

- FastAPI issues and verifies its own session cookie, so route protection stays server-side in `proxy.ts`.

- No external service is contacted at runtime.

## 5. Key decisions and rationale

### 5.1 SQLite instead of browser localStorage

`localStorage` is a browser-only API, which forces every server-rendered page to

become a client component because Node cannot read it. SQLite avoids that rewrite

while still meeting the intent of "no database host":

| Concern | localStorage | SQLite file |

| --- | --- | --- |

| Needs a database server | No | No |

| Server components keep working | No | Yes |

| Exact decimal money arithmetic | Hard | Yes |

| Capacity | about 5 MB per origin | effectively unlimited |

| Survives clearing browser data | No | Yes |

| Two browser windows share data | No | Yes |

| Inspectable for a demo | No | Yes, any SQLite viewer |

### 5.2 Cookie sessions instead of bearer tokens

Moving from `Authorization: Bearer` headers to an httpOnly session cookie issued by

FastAPI removes the token plumbing from the frontend. `apiFetch` gains

`credentials: "include"` and loses its `accessToken` parameter, and five client

components lose their `createClient().auth.getSession()` blocks.

### 5.3 Keep the API contract stable

Route paths, Pydantic schemas, and response shapes stay as they are. This preserves

`docs/api.md`, the generated `frontend/src/lib/api-schema.d.ts`, the interactive

`/docs` page, and almost all of `frontend/src/lib/api.ts`.

### 5.4 Keep Alembic, or not

Two viable options:

- Keep Alembic with SQLite for a migration history that looks like a professional

  project and is easy to demonstrate.

- Drop Alembic and create the schema with `Base.metadata.create_all()` plus an

  idempotent seed, which is fewer moving parts.

This is an open decision. See section 19.

## 6. Scope of change at a glance

| Area | Change | Relative effort |

| --- | --- | --- |

| Database engine and connection | Replace PostgreSQL driver with SQLite | Low |

| Raw SQL statements | Port about 35 statements to portable SQL or Python | High |

| Authentication | Replace Supabase Auth with local hashed passwords and signed cookies | Medium |

| Images | Replace Supabase Storage with local files served by FastAPI | Low |

| Frontend data access | Cookie credentials instead of bearer tokens | Low |

| Frontend rendering | Unchanged | None |

| Hosting and CI assets | Deleted | Low |

| Tests | Replace RLS and migration tests, keep rule tests | Medium |

| Documentation | Rewrite architecture, API, data model, testing | Medium |

## 7. Phase 0 - Safety net

**Status:** complete on 2026-09-23.

1. Created the isolated branch `codex/local-sqlite-mode` from cloud release commit

   `b617082`.

2. Created the annotated rollback tag `supabase-cloud-v1` at that release.

3. Confirmed the backend lint and 45 tests, frontend lint/type checks/eight tests/build,

   backend health endpoint, and frontend shell. The catalog remains dependent on

   external Supabase DNS in the cloud version and therefore does not work offline;

   removing that dependency is the purpose of Phase 1.

4. `supabase/`, deployment assets, and the cloud implementation remain unchanged.

   Do not delete them

   until the SQLite version passes its acceptance criteria (section 20).

## 8. Phase 1 - Database: PostgreSQL to SQLite

**Status:** complete on 2026-09-23.

### 8.1 Connection and configuration

- `backend/app/db/session.py`: replace the PostgreSQL URL with

  `sqlite+aiosqlite:///./data/hms.db`, resolved relative to the backend directory.

- Enable WAL mode and `foreign_keys=ON` on connect, so writes are durable and

  cascades behave like PostgreSQL.

- Create `backend/data/` and `backend/data/uploads/` on startup if missing.

- `backend/app/core/config.py`: remove `supabase_url`, `supabase_publishable_key`,

  `supabase_secret_key`, and `database_url`. Add `database_path`, `uploads_dir`,

  `secret_key_path`, and `session_cookie_name` with local defaults.

- `backend/scripts/dev_server.py`: the Windows `SelectorEventLoop` workaround exists

  only because `psycopg` and `asyncpg` need it. `aiosqlite` does not, so the script

  can be simplified to a plain `uvicorn.run(...)`.

### 8.2 Dependency changes

| Remove | Add | Keep |

| --- | --- | --- |

| `psycopg[binary,pool]` | `aiosqlite` | `fastapi[standard]` |

| `asyncpg` | `bcrypt` (or stdlib `hashlib.pbkdf2_hmac`) | `pydantic-settings` |

|  |  | `sqlalchemy[asyncio]` |

|  |  | `PyJWT[crypto]` (reused for local HS256 sessions) |

|  |  | `alembic` (if kept) |

|  |  | `httpx`, `pytest`, `pytest-asyncio`, `ruff` |

### 8.3 Schema porting rules

Apply these translations to the current schema.

| PostgreSQL | SQLite replacement |

| --- | --- |

| `create type ... as enum (...)` | `TEXT` column plus `CHECK (col IN (...))` |

| `uuid primary key default gen_random_uuid()` | `TEXT` primary key, `uuid4()` generated in Python |

| `timestamptz default now()` | `TEXT` ISO-8601 UTC, default `CURRENT_TIMESTAMP` |

| `date` columns | `TEXT` `YYYY-MM-DD`, which sorts and compares correctly |

| `numeric(12,2)` money | `INTEGER` paise via a SQLAlchemy `TypeDecorator`, converted to `Decimal` in services |

| `btree_gist` exclusion constraint | atomic availability check inside an `IMMEDIATE` transaction |

| `references auth.users(id)` | `profiles.id` is a standalone `TEXT` primary key |

| `handle_new_user()` trigger on `auth.users` | profile row created inside the register endpoint |

| Supabase Storage path | relative path under `data/uploads/` |

### 8.4 Money correctness

SQLAlchemy `Numeric` on SQLite falls back to floating point and emits a warning,

which would corrupt the revenue report through rounding drift. Store money as

`INTEGER` paise and convert with `Decimal` at the service boundary so API responses

keep the same JSON numbers as today.

### 8.5 Raw SQL statements to port

Every service uses raw SQL. The following constructs must be rewritten:

| File | PostgreSQL-specific construct |

| --- | --- |

| `app/services/catalog.py` | `::text` and `::int` casts, `count(*) over ()`, date overlap in availability filtering, `limit`/`offset` with computed pages |

| `app/services/bookings.py` | `daterange(...) &&` overlap, `for update of r skip locked`, `cast(:x as date)`, `status::text`, `IntegrityError` mapped from the exclusion constraint, `now()` |

| `app/services/admin_inventory.py` | `::text` casts, `coalesce`, `count(distinct ...)`, image record ordering |

| `app/services/admin_operations.py` | queue search with `ilike`, `::text` status casts, `exists(...)`, pagination counts, transition history inserts |

| `app/services/reports.py` | `generate_series(...)` for every day in a range, `::int`/`::numeric` casts, `count(distinct b.room_id)` |

| `app/api/v1/routes/profiles.py` | `role::text` |

Guidance:

- Overlap: `NOT (b.check_out <= :check_in OR b.check_in >= :check_out)` reproduces

  the half-open `[check_in, check_out)` semantics exactly, including allowing a new

  guest to arrive on the previous guest's checkout date.

- `for update skip locked`: delete it. SQLite has a single writer, and the check and

  insert run in one transaction.

- `generate_series` in `reports.py`: replace with a Python loop over

  `start_date + timedelta(days=n)`, keeping the existing response shape.

- `ilike`: SQLite `LIKE` is case-insensitive for ASCII, which is adequate. Use

  `lower(col) LIKE lower(:term)` for explicit behavior.

- Casting: casting disappears, because values are already `TEXT`, `INTEGER`, or

  `Decimal`.

### 8.6 Concurrency guarantee

PostgreSQL currently guarantees no double booking with an exclusion constraint.

SQLite replaces this with both an `IMMEDIATE` transaction that serializes room

assignment and insert/update triggers that reject overlapping active bookings at

the database level. Concurrent, overlapping, and back-to-back cases are covered by

integration tests.

## 9. Phase 2 - Local authentication

**Status:** complete on 2026-09-23.

### 9.1 New endpoints

- `POST /api/v1/auth/register` creates a profile with a hashed password and role

  `customer`, then signs the user in.

- `POST /api/v1/auth/login` verifies the password and sets the session cookie.

- `POST /api/v1/auth/logout` clears the cookie.

- `POST /api/v1/auth/password` changes the current user's password.

- `GET /api/v1/auth/me` and `GET /api/v1/auth/admin-check` keep their existing paths

  and behavior.

### 9.2 Credential and session handling

- Passwords are stored using standard-library `hashlib.pbkdf2_hmac` with 600,000

  SHA-256 iterations and a per-user random salt. Plaintext passwords are never

  stored or logged.

- Sessions use an HS256 JWT signed with a secret generated on first run and written

  to `backend/data/.session-key`, which is git-ignored. `PyJWT` is already a project

  dependency, so no new library is needed.

- The token is delivered as an httpOnly, `SameSite=Lax` cookie and verified on every

  protected request.

- `backend/app/core/auth.py`: replace JWKS verification with local token decoding.

  Keep the `require_user` and `require_admin` dependency signatures unchanged so the

  nine route modules and six services need almost no edits.

- Add a local CSRF safeguard for cookie-authenticated writes, for example a

  same-origin check on unsafe methods. The current bearer-token design did not

  need this, and dropping it silently would be a regression.

### 9.3 Roles

- The seed creates `admin@example.com` with a generated password displayed once in

  the local backend terminal.

- Add an admin API that lists users and toggles the `admin` role. The corresponding

  dashboard screen is delivered with the frontend session migration in Phase 4. This

  replaces the old workflow of promoting a user with SQL in the Supabase dashboard.

- A user must never be able to promote themselves through the profile update

  endpoint. The existing protected column behavior (`full_name`, `phone`,

  `avatar_path` only) must be preserved.

### 9.4 Removed flows

Email verification and emailed password reset cannot work without a mail service.

- Registration auto-confirms the account instead of sending a verification email.

- `frontend/src/app/auth/callback/route.ts` is deleted in Phase 4.

- `forgot-password` becomes a local "change password" flow for a signed-in user in

  Phase 4.

- `reset-password` is removed or repurposed in Phase 4.

## 10. Phase 3 - Images

**Status:** complete on 2026-09-23.

- `POST /api/v1/admin/inventory/images` keeps its current validation (JPEG, PNG, and

  WebP, size limit, alt text, sort order, cover flag) but writes the file to

  `backend/data/uploads/<uuid>.<ext>` and stores the relative path in

  `room_images.storage_path`.

- FastAPI serves `data/uploads` as a static mount, for example `/media`.

- Catalog responses return absolute local URLs such as

  `http://localhost:8000/media/<file>`.

- Frontend adjustments:

  - `next.config.ts`: add `http://localhost:8000` to `images.remotePatterns` if

    `next/image` is used for these files.

  - `next.config.ts` Content Security Policy: the current `img-src` is

    `'self' data: blob: https:`, which blocks a `:8000` image. Add

    `http://localhost:8000`.

- Ship a small set of demo images in `data/uploads/` so the rooms and gallery look

  populated on first run.

## 11. Phase 4 - Frontend changes

**Status:** ready.

Rendering stays as it is. Only the data-access and identity plumbing changes.

| File | Change |

| --- | --- |

| `src/lib/supabase/client.ts` | Delete |

| `src/lib/supabase/server.ts` | Delete |

| `src/lib/supabase/proxy.ts` | Delete, replaced by `src/lib/auth/proxy.ts` |

| `src/lib/auth/session.ts` | New. Cookie read and write helpers used by server actions and guards |

| `src/app/auth/actions.ts` | Server actions call FastAPI `auth` endpoints and set the session cookie. Redirects and messages stay the same |

| `src/proxy.ts` | Keep the server-side guard for `/account`, `/admin`, and `/book`, driven by the local session cookie. Split the cookie helpers into a separate module, because Next.js middleware cannot import code that touches `next/headers` |

| `src/app/admin/layout.tsx` | Replace the direct Supabase `profiles` query with the existing `getProfile()` call plus a `role === "admin"` check |

| `src/app/account/layout.tsx` | Read the session cookie instead of calling `supabase.auth.getClaims()` |

| `src/app/account/page.tsx` | Read the session cookie; `getProfile` and `getBookings` no longer need a token argument |

| `src/lib/api.ts` | `apiFetch` adds `credentials: "include"`; remove `accessToken` parameters and `Authorization` headers; add register, login, logout, and password functions |

| `src/components/booking/booking-form.tsx` | Remove the `createClient().auth.getSession()` block |

| `src/components/admin/inventory-manager.tsx` | Remove the session block |

| `src/components/admin/operations-manager.tsx` | Remove the session block |

| `src/components/account/profile-form.tsx` | Remove the session block |

| `src/components/account/cancel-booking.tsx` | Remove the session block |

| `src/app/auth/callback/route.ts` | Delete |

| `src/lib/env.ts` | Drop Supabase variables; default the API URL to `http://localhost:8000` |

| `package.json` | Remove `@supabase/ssr` and `@supabase/supabase-js` |

| `src/lib/env.test.ts` | Rewrite without Supabase variables |

Remaining frontend work is limited to adjusting tests in

`src/lib/api.test.ts`, and updating the Playwright spec in `e2e/`.

## 12. Phase 5 - Remove hosting and cloud assets

Delete:

- `render.yaml`

- `.github/workflows/release.yml`

- `.github/workflows/keep-render-awake.yml`

- `backend/scripts/*_smoke_test.py` (all eight Supabase-dependent scripts)

- `backend/alembic.ini` and `backend/alembic/` (only if Alembic is dropped)

- Supabase environment variables from both example files

Retire or rewrite documentation:

| Document | Action |

| --- | --- |

| `docs/staging-deployment.md` | Delete |

| `docs/production.md` | Delete or reduce to a short local-operations note |

| `docs/backup-recovery.md` | Rewrite. Backup becomes "copy `backend/data/hms.db`" |

| `docs/architecture.md` | Rewrite for the local architecture |

| `docs/data-model.md` | Update for SQLite types and the loss of the GiST constraint |

| `docs/testing.md` | Update. Remove hosted smoke scripts and the CI release gate |

| `docs/api.md` | Update auth section, keep route documentation |

| `README.md` | Rewrite with the two-command local setup |

Also keep `SUPABASE_*` entirely absent rather than left blank, so no one is tempted

to reintroduce a hosted dependency.

## 13. Phase 6 - Data tooling and seeding

Because the database now lives on disk rather than in a hosted service, provide

simple maintenance scripts.

| Script | Purpose |

| --- | --- |

| `backend/scripts/seed_db.py` | Idempotent seed: three room categories, four rooms, four facilities, category-facility links, demo images, and one administrator |

| `backend/scripts/reset_db.py` | Drop the schema, recreate it, and reseed. Useful for demonstrations |

| `backend/scripts/export_db.py` | Export every table to JSON for backup or inspection |

| `backend/scripts/import_db.py` | Restore from an exported JSON file |

| `backend/scripts/export_bookings.py` | Export bookings to CSV for the reporting section of the synopsis |

Startup behavior:

1. Create `data/` and `data/uploads/` if missing.

2. Create the schema if it does not exist.

3. If the `profiles` table is empty, run the seed.

4. Log the database path and the seeded administrator email at startup.

The seed must be safe to run repeatedly without creating duplicates.

## 14. Phase 7 - Tests and documentation

### 14.1 Backend tests

| Test file | Action |

| --- | --- |

| `tests/test_supabase_migrations.py` | Delete |

| `tests/test_db_session.py` | Rewrite to use a temporary SQLite file |

| `tests/test_auth.py` | Rewrite for local registration, login, hashing, and role enforcement |

| `tests/test_hardening.py` | Update. Keep header and error-shape checks; remove RLS assertions |

| `tests/test_bookings.py` | Update to SQLite. Add an explicit overlap test proving an overlapping booking is rejected and a back-to-back stay is allowed |

| `tests/test_availability.py` | Keep. Pure date rules, unaffected |

| `tests/test_reports.py` | Update for the Python date loop implementation |

| `tests/test_catalog_api.py`, `test_admin_inventory.py`, `test_admin_operations.py`, `test_profiles.py`, `test_config.py`, `test_health.py` | Update for SQLite and cookie auth |

Add new tests for:

- Password hashing never stores or returns plaintext.

- The session cookie is httpOnly and rejected when tampered with.

- A customer cannot reach `/api/v1/admin/*` or promote themselves.

- Two clients cannot book the same room for overlapping dates, and identical

  back-to-back stays are allowed.

### 14.2 Frontend tests

- Rewrite `src/lib/env.test.ts` without Supabase variables.

- Update `src/lib/api.test.ts` for cookie credentials and the new auth functions.

- Keep `booking.test.ts`, `page.test.tsx`, and `admin-sidebar-nav.test.tsx`, which

  do not depend on Supabase.

- Rewrite `e2e/public-and-guards.spec.ts` for local login and role guards.

### 14.3 Release checks

Replace the CI gate with a documented local gate:

```powershell

cd backend

.\.venv\Scripts\python.exe -m ruff check .

.\.venv\Scripts\python.exe -m pytest

cd ..\frontend

npm run verify

```

### 14.4 Documentation

- Add `docs/local-mode.md`: how to run, where the database lives, how to back up,

  how to reset, and the seeded administrator credentials.

- Rewrite `README.md` with the two-command setup and the zip-and-share notes.

- Update `BUILD_PLAN.md` to add a phase for local-only operation, and update

  `CODEX_RUNBOOK.md` with a new ordered set of steps for the migration.

## 15. Zip-and-share packaging

Ships in the archive:

- `backend/` excluding `.venv/`, `__pycache__/`, and `data/` runtime contents

- `frontend/src/`, `frontend/public/`, and all configuration files, excluding

  `node_modules/`, `.next/`, and `tsconfig.tsbuildinfo`

- `data/` with the seed definition and demo images

- `docs/`, `README.md`, and an optional `start-local.ps1`

- `.gitignore` and `.gitattributes`

Never ships:

- Any `.env` file. After this migration none are required.

- `.venv/`, `node_modules/`, `.next/`, `.ruff_cache/`, `.pytest_cache/`,

  `test-results/`, `playwright-report/`, `*.log`, `__pycache__/`, `tmp/`

- `backend/data/hms.db` and `backend/data/secret.key`, which are generated per

  machine. Ignore them in `.gitignore`.

Recipient steps:

```powershell

# Terminal 1 - backend

cd backend

python -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install -e ".[dev]"

python scripts/dev_server.py

# Terminal 2 - frontend

cd frontend

npm install

npm run dev

```

Then open `http://localhost:3000`, sign in with the seeded administrator, and use

the application. The database is created and seeded automatically on first start.

Prerequisites to document for the recipient: Python 3.11 or newer, Node.js 20.9 or

newer, and no internet connection after dependencies are installed.

Notes:

- On Windows, `Activate.ps1` can be blocked by execution policy. Document the

  alternative of calling `.\.venv\Scripts\python.exe` directly, or running

  `Set-ExecutionPolicy -Scope Process Bypass` for the current session.

- Optionally, `npm run build` followed by `npm start` gives a production-style local

  run that also validates the Content Security Policy changes.

## 16. Feature impact matrix

| Feature | After migration | Notes |

| --- | --- | --- |

| Public pages, rooms, facilities, gallery, about, contact | Works | Gallery uses CSS gradients, not stored images |

| Room search, filters, pagination, URL state | Works | SQL ported to SQLite |

| Availability by date, 30-night cap, past-date rule | Works | Rules are unchanged |

| Register, login, logout, change password | Works | Local hashing and cookie session |

| Email verification | Removed | No mail service locally |

| Emailed password reset | Replaced | Local change-password screen |

| Create booking with price summary | Works | Money stored as integer paise |

| Double-booking prevention | Works, weaker guarantee | Application-level transaction instead of a GiST exclusion constraint |

| My bookings, booking detail, cancellation rules | Works | Rules unchanged |

| Admin inventory CRUD | Works | |

| Admin image upload and display | Works | Files in `data/uploads`, served by FastAPI |

| Admin booking and enquiry queues, transitions, history | Works | |

| Dashboard, occupancy report, revenue report | Works | Date series generated in Python |

| Enquiries with bot trap and rate limit | Works | |

| Row Level Security | Removed | No shared tenant boundary exists |

| Multi-user shared data | Changed | Shared across browsers on one machine; not across machines |

| Data durability | Improved | No longer lost when browser data is cleared |

## 17. Risks and mitigations

| Risk | Severity | Mitigation |

| --- | --- | --- |

| About 35 raw SQL statements are ported by hand | High | Port one service at a time and run tests after each. Port overlap and report logic first |

| Money precision drifts if stored as floating point | High | Store integer paise with a `TypeDecorator` and assert exact totals in tests |

| Overlap protection weakens from a database constraint to application logic | Medium | Single `IMMEDIATE` transaction, plus explicit overlap and back-to-back tests |

| Cookie sessions introduce CSRF exposure that bearer tokens did not have | Medium | Same-origin checks on unsafe methods, `SameSite=Lax`, and a test for cross-origin rejection |

| Frontend middleware cannot import modules that use `next/headers` | Medium | Keep cookie helpers in a separate module that middleware can import safely |

| Content Security Policy blocks images served from `:8000` | Low | Extend `img-src` and add `images.remotePatterns` |

| Alembic plus SQLite has limited `ALTER TABLE` support | Low | Prefer `create_all()` for local mode, or use Alembic batch mode |

| Documentation drift while removing hosting | Low | Rewrite the docs as part of Phase 7, not afterwards |

| Recipient lacks Python or Node | Low | Document prerequisites and versions clearly in the README |

## 18. Implementation order and optional LAN mode

Suggested order within Phase 1, highest risk first: booking overlap, then reports,

then catalog filtering, then admin inventory and operations.

Optional LAN mode, not part of the default plan: binding the backend to `0.0.0.0`

and allowing the LAN origin in CORS would let phones and tablets on the same Wi-Fi

use the app for a live demonstration. This still requires no hosting and no cloud,

but it does expose the local database to the local network, so it should be opt-in

and documented as such.

## 19. Reviewed implementation decisions

These defaults were selected during the Phase 0 review. They keep the migration

small, offline-capable, and compatible with the existing service layer.

1. Schema tooling: use an explicit, versioned SQLite initializer plus idempotent seed

   functions. The repository does not currently contain an Alembic migration

   environment, so adding one solely for local mode would increase scope without

   protecting an existing installed database.

2. Password hashing: use versioned standard-library PBKDF2-HMAC-SHA256 records with a

   unique random salt and a deliberately high iteration count. This adds no native

   dependency and works offline on Windows.

3. Seed administrator: create `admin@example.com` during the idempotent seed. The

   initial password will be generated on first run, printed once to the local terminal,

   and documented as changeable rather than committed as a shared credential.

4. Password reset: replace emailed forgot/reset-password flows with an authenticated

   change-password screen in local mode.

5. API documentation: retain FastAPI's interactive `/docs` page for local development.

6. Demo data: create and seed `hms.db` on first run; do not commit a mutable database.

7. Optional LAN mode: exclude it from the default implementation and packaging.

8. Data access: preserve the existing SQLAlchemy async/Core and raw-SQL service shape,

   porting PostgreSQL-specific SQL deliberately instead of introducing a full ORM

   rewrite during the storage migration.

## 20. Acceptance criteria

The migration is complete when all of the following are true.

- No reference to Supabase, Render, or Vercel remains in code, dependencies,

  configuration, or documentation. A repository-wide search returns nothing except

  the archived plan documents that intentionally describe the old behavior.

- No `.env` file is required. A fresh clone with no environment files starts

  successfully.

- No internet connection is required at runtime.

- The database is a single local SQLite file, created and seeded automatically on

  first start.

- `ruff check .` and `pytest` pass in `backend`.

- `npm run verify` passes in `frontend`, including lint, type check, unit tests, and

  a production build.

- These journeys work end to end: register, login, browse rooms, search by dates,

  create a booking, view it in the account area, cancel it, and sign out.

- Administrator journeys work: sign in, edit categories, rooms, and facilities,

  upload an image, transition a booking through its statuses, resolve an enquiry, and

  view dashboard and report data.

- An overlapping booking is rejected while a back-to-back stay is accepted.

- A customer receives a forbidden response from every `/api/v1/admin/*` route and

  cannot change their own role.

- No secret, token, or password is written to logs.

- The project has been zipped, unpacked into a clean directory on a different path,

  and successfully installed and run following only the README.

## 21. Rollback

If the migration is abandoned partway:

- Return to the cloud version with `git checkout main` or the `supabase-cloud-v1`

  tag, which are untouched until the migration is merged.

- Keep `supabase/`, `render.yaml`, and the deployment workflows until Phase 7 has

  passed the acceptance criteria in section 20. Delaying their deletion keeps a

  clean rollback available for almost the whole migration.
