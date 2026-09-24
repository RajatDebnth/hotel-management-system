# Testing and release checks

## Backend

```powershell
cd backend
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest
```

The pytest suite uses isolated temporary SQLite databases and upload directories. It covers schema upgrades and reseeding, foreign keys, integer money boundaries, concurrent/overlapping bookings, authentication and cookie flags, CSRF, customer/admin isolation, inventory, local media cleanup, operations, and reports.

Maintenance tests additionally use disposable databases to prove JSON round trips, strict backup validation, transactional rejection, overwrite protection, confined reset/reseed, demo-media restoration, and booking CSV output. They never reset or import the live `backend/data/hms.db`.

## Frontend

```powershell
cd frontend
npm run verify
```

`verify` runs ESLint, Next.js/TypeScript checks, Vitest, and a production build.

With FastAPI on port 8000 and Next.js on port 3000:

```powershell
npm run test:e2e
```

Playwright checks desktop and mobile public navigation, anonymous guards, local registration/login/logout, profile and password changes, booking and cancellation, administrator role management, and the admin overview/inventory/operations workspaces. Set `E2E_ADMIN_PASSWORD` to the current local administrator password to include the administrator journey.

## Manual security review

- Verify customer and administrator authorization at API boundaries, not only route guards.
- Verify cookie-authenticated mutations reject a missing or wrong `Origin`.
- Verify a customer cannot alter role, price, assigned room, or booking lifecycle state.
- Verify overlapping active bookings are rejected under concurrency.
- Verify uploads reject invalid type, signature, size, and traversal-style names and do not leave orphaned files.
- Confirm `.env`, `backend/data/`, browser traces, passwords, and session keys are not tracked.
- Inspect error responses and logs for credentials, session tokens, guest form bodies, and stack traces.

## UI review

Inspect public, authentication, account, booking, and admin screens at desktop and mobile widths. Check keyboard navigation, labels, focus indicators, validation/error states, active navigation, horizontal overflow, and browser console/network errors.
