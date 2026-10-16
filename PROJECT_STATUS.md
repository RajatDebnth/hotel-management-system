# Hotel Management System - Project Status

## Current state

The application runs locally with a Next.js frontend, FastAPI backend, SQLite database,
signed HttpOnly cookie authentication, and confined local media storage.

Implemented areas include:

- Public hotel landing, contact, room catalog, availability, registration, and login
- Customer profile, security, booking history, booking creation, and cancellation
- Administrator daily dashboard, reports, bookings, enquiries, visitors, and access controls
- Table-based facility, room-category, physical-room, and room-image management
- Transactional availability enforcement and database-level overlap protection
- Real UTC timestamp collection with browser-local display
- Local database backup, restore, reset, demonstration data, and administrator recovery tools

## Deferred work

### Manual QR and cash payment verification

This remains intentionally deferred. Before implementation, define the QR amount policy,
proof deadline, accepted receipt formats, cash collection policy, and approval rules.

### Online payment gateway

This remains intentionally deferred. Implementation requires a selected provider,
merchant or test account, refund rules, settlement rules, and webhook credentials.

### Password reset workflow

A secure design has been prepared but not implemented. It includes administrator-generated
temporary passwords, forced password change, session invalidation, and read-only audit data.

## Verification policy

- Backend changes: Ruff and focused pytest checks during development; full pytest before release
- Frontend changes: focused ESLint, TypeScript, and Vitest checks during development
- Release checks: full frontend verification, backend test suite, production build, and relevant
  desktop/mobile Playwright journeys
- Security changes: authentication, authorization, CSRF, secret handling, input validation,
  session invalidation, and error-response review

## Operational notes

- `START_HERE.md` provides the supported Windows ZIP handoff, installation, startup,
  administrator recovery, backup, and troubleshooting procedure for non-technical operators.
- Runtime data, passwords, session keys, customer exports, and environment files must not be committed.
- Stop the backend before database reset, import, or administrator-password recovery.
- Back up the SQLite database and uploaded media together.
- Existing category demonstration images remain available to the public catalog; new administrator
  uploads are attached to physical rooms.
