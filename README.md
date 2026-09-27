# Hotel Management System

A local-first hotel room booking application built with Next.js and FastAPI. It runs without cloud accounts: SQLite stores application data, signed HttpOnly cookies provide authentication, and room images live on the local filesystem.

## Repository structure

- `frontend/` — Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Vitest, and Playwright
- `backend/` — FastAPI, Pydantic, async SQLAlchemy, SQLite, local media storage, Ruff, and pytest
- `docs/` — architecture, API, data, testing, backup, and reporting documentation
- `BUILD_PLAN.md` — current product scope and local architecture
- `CODEX_RUNBOOK.md` — ordered implementation tracker

## Prerequisites

- Node.js 20.9 or newer and npm 10 or newer
- Python 3.12 or newer

No Docker, PostgreSQL, Supabase, Render, Vercel, or other hosted service is required.

## Run the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe scripts\dev_server.py
```

The API runs at <http://localhost:8000>; health is available at <http://localhost:8000/api/v1/health>. On the first startup, the server creates the database, seeds demo inventory, creates `admin@example.com`, and prints its one-time password. Change that password from **Admin → Security** after signing in.

## Run the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The checked-in defaults already point the frontend at the local API; `.env.local` is optional for the standard ports.

After installing both applications, you can start them together from the repository root:

```powershell
python start_local.py
```

Press `Ctrl+C` to stop both. `python start_local.py --check` validates the virtual environment and npm command without starting anything.

## Local data

- Database: `backend/data/hms.db`
- Uploaded room images: `backend/data/uploads/`
- Session signing key: `backend/data/.session-key`

The entire `backend/data/` directory is ignored by Git. Back up the database and uploads together while both services are stopped. See [backup and recovery](docs/backup-recovery.md).

## Data maintenance

Run these from `backend/`. Stop the backend before reset or import.

```powershell
.\.venv\Scripts\python.exe scripts\seed_db.py
.\.venv\Scripts\python.exe scripts\reset_admin_password.py --yes
.\.venv\Scripts\python.exe scripts\load_realistic_demo.py --yes
.\.venv\Scripts\python.exe scripts\export_db.py
.\.venv\Scripts\python.exe scripts\export_bookings.py
.\.venv\Scripts\python.exe scripts\import_db.py <backup.json> --yes
.\.venv\Scripts\python.exe scripts\reset_db.py --yes
```

Reset deletes the local database and uploaded media. Import replaces all table data but does not contain image bytes. Both destructive commands require `--yes`; create a backup first.

The administrator-password reset preserves users, bookings, inventory, enquiries,
and uploads. It generates a new password for `admin@example.com` and invalidates all
existing login sessions. Stop the backend before running it, then use the password
printed only in that terminal and change it from **Admin → Security** after signing in.

The realistic-demo loader is a destructive acceptance-data reset. It preserves the
built-in administrator identity, replaces every other application record, restores
demo media, and creates 20 named customers with representative bookings and hotel
enquiries. It generates fresh administrator and featured-customer passwords locally;
protect that terminal output and never commit it.

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm run verify
npm run test:e2e
```

## Create a shareable ZIP

Commit the intended release and make sure the Git working tree is clean, then run:

```powershell
python package_local.py
```

The validated archive is written to `dist/hotel-management-system-local.zip`. It
contains source, configuration, documentation, and tracked demo images, but never
contains `.env` files, installed dependencies, build caches, the local database,
uploads, logs, or the session signing key. After extracting it, a recipient follows
the installation and startup commands above. See the [local mode guide](docs/local-mode.md)
for the complete operator workflow.

## Documentation

- [Local mode guide](docs/local-mode.md)
- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Data model](docs/data-model.md)
- [Report definitions](docs/reports.md)
- [Testing](docs/testing.md)
- [Backup and recovery](docs/backup-recovery.md)

The previous hosted release is preserved in Git under the annotated `supabase-cloud-v1` tag.
