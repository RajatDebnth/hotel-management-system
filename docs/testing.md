# Testing and release checks

## Backend

```powershell
cd backend
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest
```

The pytest suite uses isolated temporary SQLite databases and upload directories. It covers schema upgrades and reseeding, foreign keys, integer money boundaries, concurrent/overlapping bookings, authentication and cookie flags, CSRF, customer/admin isolation, inventory, local media cleanup, operations, and reports.

Maintenance tests additionally use disposable databases to prove JSON round trips, strict backup validation, transactional rejection, overwrite protection, confined reset/reseed, demo-media restoration, and booking CSV output. They never reset or import the live `backend/data/hms.db`.

The realistic acceptance-data regression verifies a stopped-backend replacement that
preserves the built-in administrator identity and creates exactly 20 named customers,
20 bookings spanning every lifecycle status, complete booking histories, 12 realistic
administrative enquiries, and restored demo media. Runtime credentials are generated
locally and are never stored in source control.

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

Playwright checks desktop and mobile public navigation, anonymous guards, local registration/login/logout, role-aware landing pages, profile and password changes, booking and cancellation, customer/admin cross-role denial, logout browser-Back protection, administrator role management, and the admin overview/inventory/operations/security workspaces. Set `E2E_ADMIN_PASSWORD` to the current local administrator password to include the administrator journey.

For a destructive full-system API acceptance pass against the realistic dataset, stop
the backend, create a protected backup, run `scripts/load_realistic_demo.py --yes`,
restart both services, and then run `scripts/verify_realistic_demo.py` with
`REALISTIC_ADMIN_PASSWORD` and `REALISTIC_CUSTOMER_PASSWORD` supplied only as process
environment variables. The verifier covers public catalog and availability, customer
profile/bookings/cancellation/enquiries, authorization boundaries, administrator users,
roles, inventory, media, operations, dashboard, reports, and logout.

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
