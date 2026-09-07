# Testing and release checks

## Local release gate

Run these commands from a clean checkout after configuring the ignored local environment files:

```powershell
cd backend
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm ci
npm run verify
```

With both services running, execute the hosted smoke scripts in `backend/scripts/`. They create unique disposable users and records, assert authentication, RLS, catalog, availability, concurrency, customer, inventory, operations, and reporting boundaries, then delete their fixtures.

The GitHub Actions release workflow repeats backend lint/tests, frontend lint/type/tests/build, checks that local environment files are not tracked, and rejects high-severity production dependency advisories.

## Manual release checklist

- Verify registration, confirmation, login, logout, and password reset.
- Complete a customer browse → availability → booking → account → cancellation journey.
- Verify one of two concurrent overlapping booking requests is rejected.
- Verify a customer cannot open `/admin`, call an admin API, alter their role, or read another booking.
- Complete admin inventory/image, booking-status, enquiry, dashboard, and report journeys.
- Inspect public, auth, account, booking, and admin screens at 390×844 and 1440×900.
- Navigate all forms by keyboard and verify labels, focus indicators, validation messages, and heading order.
- Confirm API and web responses include the documented security headers and API failures contain no stack traces or secrets.
- Run a production build and review browser console/network errors.

## Performance baseline

Run Lighthouse against a production frontend (`npm run build`, then `npm start`). Investigate any accessibility score below 90, horizontal overflow, unexpectedly unoptimized media, or severe layout shift. Performance scores vary by machine and are evidence, not a substitute for inspecting the measured causes.
