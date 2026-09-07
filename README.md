# Hotel Management System

A greenfield hotel room booking application built with Next.js, FastAPI, and Supabase.

## Repository structure

- `frontend/` - Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui
- `backend/` - FastAPI, Pydantic, SQLAlchemy, Alembic, and pytest
- `supabase/` - versioned database migrations and seed data (added in Step 2)
- `docs/` - architecture and operating documentation
- `BUILD_PLAN.md` - product and architecture plan
- `CODEX_RUNBOOK.md` - ordered implementation tracker

## Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer
- Python 3.12 or newer

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. Run all frontend checks with `npm run verify`.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python scripts/dev_server.py
```

Open <http://localhost:8000/api/v1/health>. Verify with `ruff check .` and `pytest`.

## Environment configuration

Copy the relevant `.env.example` file to its local `.env` variant. Environment files are ignored by Git. Never commit credentials, tokens, database passwords, or Supabase secret keys.

For local authentication, configure Supabase Auth with a Site URL of `http://localhost:3000` and allow these redirects:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`

The frontend owns Supabase's cookie-based browser session. FastAPI independently verifies each bearer token against the project's JWKS endpoint and loads the user's current role from `public.profiles`; clients cannot grant themselves admin access.

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Data model](docs/data-model.md)
- [Report definitions](docs/reports.md)
- [Testing and release checks](docs/testing.md)
- [Production readiness](docs/production.md)
- [Backup and recovery](docs/backup-recovery.md)
- [Vercel + Render staging deployment](docs/staging-deployment.md)
