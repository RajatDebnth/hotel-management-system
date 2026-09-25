# Hotel Management System - Codex Execution Runbook

This file turns `BUILD_PLAN.md` into an ordered implementation process. The user can say **"do next"** and Codex will execute the current `READY` step, verify it, update this file, and report what comes next.

## Status definitions

- `PENDING`: earlier work must finish first.
- `READY`: prerequisites are satisfied and Codex may implement it.
- `IN PROGRESS`: implementation has started but is not verified.
- `WAITING`: blocked on a specific user or external action.
- `PAUSED`: intentionally deferred by the user; Codex must not start it until the user explicitly resumes it.
- `DONE`: implementation and required checks passed.

## Current state

- Current step: **Step 26 - Local administrator password recovery**
- Status: **DONE**
- Last completed step: **Step 26 - Local administrator password recovery**
- Application state: The local-only application now includes a non-destructive, stopped-backend administrator password-reset command that preserves hotel data and invalidates existing sessions. Both local services remain running; payment Steps 15 and 16 remain paused.
- User action currently required: None.
- Next command: There is no active `READY` implementation step. Explicitly resume Step 15 or Step 16 when payment work should begin.

## Standard execution contract

For every step, Codex will:

1. Check repository state and prerequisites.
2. Implement the smallest complete, usable increment.
3. Run relevant formatting, linting, type, test, migration, build, and UI checks.
4. Fix issues caused by the work.
5. Update this runbook with the result and next eligible step.
6. Report: Done, Verification, Current state, Next step, and Prerequisites.

Secrets must be placed only in ignored local environment files. The user should never paste secret keys into chat.

---

## Step 1 - Repository foundation

**Status:** DONE

**Objective:** Create a safe monorepo foundation for the frontend, backend, database assets, documentation, and local development.

**Prerequisites:**

- Node.js and npm/pnpm available.
- Python available.
- No Supabase account or credentials required.

**Work:**

- Initialize Git if necessary.
- Scaffold `frontend/` with Next.js App Router, TypeScript, Tailwind, ESLint, and `src/` layout.
- Add and configure shadcn/ui.
- Scaffold `backend/` with FastAPI, Pydantic settings, SQLAlchemy async, Alembic, Ruff, pytest, and HTTPX.
- Create `supabase/`, `docs/`, safe `.gitignore`, `.env.example` files, and root README.
- Add health endpoints and minimal frontend/backend smoke tests.
- Add convenient development and verification commands.

**Acceptance checks:**

- Frontend installs, lints, type-checks, tests, and production-builds.
- Backend imports, lints, and tests.
- Both development servers can start.
- No secret or environment file is trackable.

---

## Step 2 - Local Supabase tooling and initial schema

**Status:** DONE

**Objective:** Define the complete MVP PostgreSQL schema, migrations, seed data, constraints, and initial RLS policies in version control.

**Prerequisites:**

- Step 1 is `DONE`.
- Docker Desktop is needed only if using the full local Supabase stack. If unavailable, migrations can still be authored and statically checked before remote application.

**Work:**

- Configure Supabase CLI project files.
- Create enums and tables for profiles, categories, rooms, facilities, category facilities, room images, bookings, booking history, and enquiries.
- Add timestamps, indexes, foreign keys, validation constraints, profile trigger, and overlap-prevention constraint.
- Add deterministic seed data.
- Add RLS policies for public, customer, and admin access.
- Document the data model.

**Acceptance checks:**

- Migrations apply cleanly to an empty PostgreSQL/Supabase database when local services are available.
- Seed is repeatable.
- Schema/RLS tests or static policy checks pass.
- A rollback/rebuild path is documented.

---

## Step 3 - Supabase project connection

**Status:** DONE

**Objective:** Connect the codebase to a user-owned Supabase project without exposing credentials.

**Prerequisites:**

- Steps 1-2 are `DONE`.
- User creates a Supabase project.
- User stores values in ignored local environment files rather than chat.

**User-provided local configuration:**

`frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`backend/.env`:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
FRONTEND_URL=http://localhost:3000
```

**Work:**

- Validate environment configuration without printing secrets.
- Link/apply migrations to the intended development project after explicit confirmation of the target.
- Verify database and storage connectivity.

**Acceptance checks:**

- Frontend recognizes public Supabase configuration.
- Backend connects to PostgreSQL.
- Expected migrations are applied to the confirmed development project.
- Secrets remain ignored and absent from Git output.

---

## Step 4 - Authentication and authorization

**Status:** DONE

**Objective:** Implement complete Supabase Auth flows in Next.js and JWT/role enforcement in FastAPI.

**Prerequisites:**

- Step 3 is `DONE`.
- Supabase email authentication is enabled.
- Development redirect URLs are configured in Supabase.

**Work:**

- Add browser/server Supabase clients with cookie-based SSR sessions.
- Implement registration, verification callback, login, logout, forgot password, and reset password.
- Create protected customer and admin layouts.
- Verify Supabase access tokens in FastAPI.
- Add `require_user` and `require_admin` dependencies.
- Test `401` versus `403` behavior and prevent role self-promotion.

**Acceptance checks:**

- Customer authentication works end to end.
- Session refresh and protected navigation work.
- Invalid tokens are rejected.
- Customers cannot call admin APIs or change their role.

---

## Step 5 - Public design system and hotel pages

**Status:** DONE

**Objective:** Deliver the responsive public-facing hotel experience.

**Prerequisites:**

- Step 4 is `DONE`.
- Hotel name, brand preferences, address/contact content, and imagery are helpful but not blocking; polished placeholders may be used.

**Work:**

- Establish color, type, spacing, accessibility, and responsive layout conventions.
- Build navigation, footer, home, about, gallery, contact, rooms, and room-detail pages.
- Use shadcn/ui primitives consistently.
- Add loading, empty, error, and responsive states.

**Acceptance checks:**

- Pages render at desktop and mobile sizes without overflow.
- Keyboard navigation, labels, focus states, and contrast are acceptable.
- Frontend lint, type, component, and production-build checks pass.

---

## Step 6 - Catalog API and enquiries

**Status:** DONE

**Objective:** Replace placeholder content with FastAPI-backed room, facility, category, and enquiry functionality.

**Prerequisites:**

- Steps 2-5 are `DONE`.

**Work:**

- Implement public catalog endpoints and Pydantic schemas.
- Add pagination/filtering where needed.
- Connect Next.js pages to FastAPI.
- Implement validated enquiry submission and rate-limit readiness.
- Generate or maintain shared frontend API types from OpenAPI.

**Acceptance checks:**

- Seeded catalog data renders through the API.
- Invalid enquiry input returns consistent safe errors.
- Enquiries persist successfully.
- API integration and UI-state tests pass.

---

## Step 7 - Availability engine

**Status:** DONE

**Objective:** Implement reliable room availability search for dates, capacity, category, status, and price filters.

**Prerequisites:**

- Step 6 is `DONE`.

**Work:**

- Validate date ranges and guest capacity.
- Query only active, non-overlapping rooms.
- Add search filters and URL state to the rooms page.
- Define canonical night-count and price-calculation behavior.

**Acceptance checks:**

- Boundary dates and invalid ranges behave correctly.
- Cancelled/rejected bookings do not block inventory.
- Active overlapping bookings block inventory.
- Availability and frontend filter tests pass.

---

## Step 8 - Transactional customer booking

**Status:** DONE

**Objective:** Allow authenticated customers to create bookings without double-booking risk.

**Prerequisites:**

- Step 7 is `DONE`.
- Cancellation rules and tax configuration may use documented MVP defaults if the user has not supplied them.

**Work:**

- Build the booking form and price summary.
- Recheck availability inside the booking transaction.
- Create immutable price snapshots and booking references.
- Record initial status history.
- Handle database overlap conflicts as clean domain errors.

**Acceptance checks:**

- A valid booking succeeds and returns a reference.
- Simultaneous overlapping requests cannot both succeed.
- Price and night calculations are covered by tests.
- Customers cannot create bookings for invalid dates or excessive capacity.

---

## Step 9 - Customer account

**Status:** DONE

**Objective:** Let customers manage their profile and their own reservations.

**Prerequisites:**

- Step 8 is `DONE`.

**Work:**

- Add account dashboard, profile editing, booking list, and booking details.
- Implement cancellation through FastAPI with explicit status rules.
- Add avatar storage if retained in MVP scope.

**Acceptance checks:**

- Customers see only their own information and bookings.
- Cross-user access is denied by API authorization and RLS.
- Allowed cancellations update status history.
- Customer E2E path passes.

---

## Step 10 - Admin inventory and Storage

**Status:** DONE

**Objective:** Let admins manage categories, rooms, facilities, and images.

**Prerequisites:**

- Step 9 is `DONE`.
- Supabase `room-images` bucket exists or may be created during this step.

**Work:**

- Build protected admin layout and navigation.
- Implement category, room, and facility CRUD.
- Implement image upload, ordering, cover selection, replacement, and deletion.
- Enforce MIME type, file size, unique paths, and admin-only writes.

**Acceptance checks:**

- Admin CRUD changes appear in the public catalog.
- Customer/anonymous mutations are denied.
- Storage policies and upload validations pass.
- Admin UI works at supported viewport sizes.

---

## Step 11 - Admin booking and enquiry operations

**Status:** DONE

**Objective:** Give admins complete operational queues for reservations and customer enquiries.

**Prerequisites:**

- Step 10 is `DONE`.

**Work:**

- Add searchable, paginated booking and enquiry tables.
- Implement allowed booking status transitions.
- Add enquiry assignment, notes, and resolution status.
- Record actor and reason for important changes.

**Acceptance checks:**

- Invalid state transitions are rejected.
- Changes appear in status history.
- Only admins access operational queues.
- Admin booking-management E2E path passes.

---

## Step 12 - Dashboard and reports

**Status:** DONE

**Objective:** Add useful, accurately defined operational reporting.

**Prerequisites:**

- Step 11 is `DONE`.
- Metric definitions use documented MVP defaults unless the user provides specific hotel accounting rules.

**Work:**

- Add dashboard totals, arrivals, departures, occupancy, recent bookings, and open enquiries.
- Add date-filtered occupancy and booked-revenue reports.
- Document formulas and status inclusion rules.

**Acceptance checks:**

- Report values agree with controlled fixture data.
- Empty and partial periods render correctly.
- Report queries are indexed and authorization-protected.

---

## Step 13 - Full hardening and release candidate

**Status:** DONE

**Objective:** Produce a secure and testable release candidate.

**Prerequisites:**

- Steps 1-12 are `DONE`.

**Work:**

- Complete integration, RLS, concurrency, and Playwright coverage.
- Add CORS allowlist, security headers, structured logging, safe errors, upload limits, and rate limiting where appropriate.
- Run dependency, secret, migration, accessibility, responsive, performance, and production-build checks.
- Finish setup, architecture, API, testing, backup, and recovery documentation.

**Acceptance checks:**

- All automated release checks pass.
- Principal customer and admin journeys pass.
- No known critical authorization, RLS, secret-handling, or double-booking defect remains.
- Fresh-environment setup is documented and reproducible.

---

## Step 14 - Staging deployment

**Status:** DONE

**Objective:** Deploy and verify a staging environment.

**Prerequisites:**

- Step 13 is `DONE`.
- User selects/owns deployment accounts for Next.js and FastAPI.
- User authorizes external deployment and configures secrets through provider dashboards or approved tooling.

**Work:**

- Deploy Next.js frontend.
- Deploy FastAPI backend.
- Configure production-like Supabase redirects, CORS, environment variables, and storage policies.
- Apply migrations to the confirmed staging project.
- Run staging smoke and E2E tests.

**Acceptance checks:**

- Staging URLs are reachable over HTTPS.
- Auth callbacks, API calls, uploads, and booking flows work cross-origin.
- Staging secrets are not present in source or logs.

---

## Deferred Step 15 - Manual QR and cash payment verification

**Status:** PAUSED

**Objective:** Add an interim, administrator-verified payment workflow without integrating a payment gateway.

**Prerequisites:**

- Step 14 is `DONE`.
- User explicitly resumes this step and confirms the payment rules.
- QR amount policy, proof deadline, accepted receipt formats, and cash collection policy are agreed.

**Required scope:**

- Admin-managed QR code, payee details, and payment instructions
- Customer selection of QR or cash payment while booking
- Private receipt/screenshot upload and auditable resubmission
- Admin payment-review queue with approve/reject reasons
- Atomic QR approval that marks payment paid and booking confirmed
- Cash approval that confirms the booking as cash due, followed by cash-received recording
- Expiration of abandoned pending holds, authorization/RLS, tests, and staging verification

---

## Deferred Step 16 - Online payment gateway integration

**Status:** PAUSED

**Objective:** Add online payments only after the non-payment MVP is stable and the user selects a provider.

**Prerequisites:**

- Step 15 may remain paused or be completed; the gateway design must coexist with manual/cash records if Step 15 is implemented.
- User explicitly resumes this step.
- User selects a payment provider and owns a configured merchant/test account.
- Payment, refund, cancellation, currency, tax, and settlement rules are agreed.

**Required scope:**

- Payment/order intent creation
- Signed webhook verification
- Idempotency and reconciliation
- Payment/refund records
- Failure and retry handling
- No raw card data stored by the application

---

## Step 17 - Admin dashboard shell redesign

**Status:** DONE

**Objective:** Present every existing administrator control inside one responsive, minimalist dashboard shell.

**Work:**

- Add a persistent desktop sidebar and compact mobile navigation rail.
- Give the current admin route and inventory tabs visible active states.
- Apply a light-only 60/30/10 palette using white, neutral greys, and black.
- Replace rounded decorative admin surfaces with sharp bordered panels, controls, queues, metrics, and charts.
- Preserve the existing admin authorization and operational behavior.

**Acceptance checks:**

- Overview, Inventory, and Operations use the shared shell.
- Current and nested admin routes expose `aria-current` and a visible active treatment.
- Admin controls contain no legacy warm accent colors or rounded-card styling.
- Frontend lint, type checking, unit tests, and production build pass.

---

## Step 18 - Local-only migration safety net

**Status:** DONE

**Objective:** Review the local-only migration plan and preserve a verified rollback point before changing cloud-backed implementation code.

**Work:**

- Review `docs/local-mode-plan.md` against the current architecture.
- Create an isolated migration branch and an annotated cloud-release tag.
- Run the existing backend and frontend automated baselines.
- Smoke-test both development servers without deleting cloud assets.
- Resolve the plan's implementation decisions and register the remaining phases.

**Acceptance checks:**

- `main` and `supabase-cloud-v1` preserve the cloud release.
- Backend lint/tests and frontend verification pass.
- Backend health and the frontend shell respond locally.
- Phase 1 has an explicit scope and no unresolved prerequisite.

---

## Step 19 - SQLite data layer

**Status:** DONE

**Objective:** Replace the PostgreSQL connection, schema assumptions, and seed path with a local async SQLite database while preserving the existing service boundaries.

**Prerequisites:**

- Step 18 is `DONE`.
- No user credentials or cloud access are required.

**Work:**

- Add `aiosqlite` and remove PostgreSQL-only runtime drivers/configuration.
- Add local data/upload paths, SQLite pragmas, schema initialization, and idempotent catalog seed data.
- Port PostgreSQL-specific SQL and booking overlap enforcement needed by the current data layer.
- Add focused tests for initialization, reseeding, foreign keys, monetary values, overlap rejection, and back-to-back stays.

**Acceptance checks:**

- A missing local database is created and seeded automatically.
- The data layer runs without Supabase/PostgreSQL credentials or network access.
- Overlapping active bookings are rejected and back-to-back bookings are allowed.
- Backend lint and all relevant tests pass.

---

## Step 20 - Local authentication

**Status:** DONE

**Objective:** Replace Supabase Auth and roles with local users, password hashing, signed HttpOnly sessions, CSRF protection, and local admin authorization.

**Prerequisites:**

- Step 19 is `DONE`.
- No user credentials or cloud access are required.

**Work:**

- Extend local profiles with unique email and versioned PBKDF2 password hashes.
- Add local register, login, logout, current-user, admin-check, and change-password endpoints.
- Generate and persist an ignored local signing key; issue short-lived HttpOnly, SameSite=Lax session cookies.
- Preserve `require_user` and `require_admin` authorization boundaries and protect unsafe cookie-authenticated requests against cross-site submission.
- Idempotently seed `admin@example.com` with a generated first-run password that is shown once locally and never committed or logged again.
- Add administrator user/role management without permitting self-promotion.

**Acceptance checks:**

- Register/login/logout/change-password and session restoration work without Supabase.
- Invalid, expired, and cross-site requests are rejected safely.
- Customers cannot access admin APIs or promote themselves.
- The seeded administrator can sign in using the first-run credential.
- Passwords and signing secrets are never stored or emitted in plaintext after first-run setup.
- Backend lint and all relevant tests pass.

---

## Step 21 - Local image storage

**Status:** DONE

**Objective:** Replace Supabase Storage with validated local uploads served safely by FastAPI.

**Prerequisites:**

- Step 20 is `DONE`.
- No user credentials or cloud access are required.

**Work:**

- Store validated JPEG, PNG, and WebP uploads under the ignored local uploads directory.
- Preserve file-size, signature, parent, cover-image, ordering, and metadata validation.
- Serve uploaded media through a constrained FastAPI `/media` mount.
- Return local media URLs from public catalog and administrator inventory responses.
- Add a small tracked demo-image set or deterministic first-run image seed.
- Remove the remaining backend Supabase URL/secret configuration and Storage HTTP client.

**Acceptance checks:**

- Upload, public read, metadata update, cover selection, and deletion work offline.
- Invalid, oversized, disguised, and traversal-style files are rejected safely.
- Database/file failures do not leave orphaned metadata or files.
- No backend Supabase dependency or credential is required.
- Backend lint and all relevant tests pass.

---

## Step 22 - Frontend local-session migration

**Status:** DONE

**Objective:** Replace Supabase frontend clients and bearer tokens with same-origin cookie credentials and local authentication flows.

**Prerequisites:**

- Step 21 is `DONE`.
- No user credentials or cloud access are required.

**Work:**

- Remove Supabase browser/server/proxy clients, dependencies, and public environment variables.
- Migrate registration, login, logout, session restoration, guards, booking, account, and administrator API calls to cookie credentials.
- Replace email callback/reset flows with the local authenticated change-password experience.
- Add administrator user/role controls to the existing dashboard shell.
- Regenerate API types and update unit and end-to-end coverage.

**Acceptance checks:**

- Customer register/login/logout, protected navigation, profile, bookings, and cancellation work locally.
- Administrator login, guards, inventory, operations, reports, and user-role management work locally.
- No frontend Supabase dependency, environment variable, bearer token, or callback route remains.
- CSRF-protected mutations include credentials and work only from the configured local origin.
- Frontend lint, type checking, tests, and production build pass.

---

## Step 23 - Remove cloud runtime and deployment assets

**Status:** DONE

**Objective:** Remove Supabase, Render, Vercel, and cloud CI runtime dependencies after the local replacement paths pass.

---

## Step 24 - Local data tooling and startup workflow

**Status:** DONE

**Objective:** Add reset/seed/backup scripts and simple cross-platform local startup commands.

---

## Step 25 - Local release verification and packaging

**Status:** DONE

**Objective:** Complete offline E2E/security tests, rewrite documentation, and verify a clean zip-and-run handoff.

---

## Step 26 - Local administrator password recovery

**Status:** DONE

**Objective:** Provide a safe local-owner recovery path when the generated built-in administrator password is unavailable.

**Work:**

- Add an explicit-confirmation CLI that resets only `admin@example.com`.
- Refuse the operation while FastAPI is running and when the built-in account is missing, inactive, or not an administrator.
- Generate the credential locally, preserve all application data, and rotate the session signing key.
- Document the stopped-backend recovery workflow without storing or exposing the generated password.

**Acceptance checks:**

- Existing users, bookings, inventory, enquiries, and uploads remain unchanged.
- The previous administrator password is rejected and the generated password verifies.
- Every existing signed session is invalidated.
- Backend Ruff and all tests pass, and a disposable CLI smoke test succeeds without retaining its credential or data.

---

## Decision log

- 2026-09-06: Next.js handles the UI and Supabase SSR session lifecycle.
- 2026-09-06: FastAPI is the application API and owns booking business rules.
- 2026-09-06: Supabase provides PostgreSQL, Auth, Storage, and RLS.
- 2026-09-06: MVP supports reservation status management without online card payments.
- 2026-09-06: Work proceeds through this runbook when the user says "do next".
- 2026-09-06: FastAPI uses asyncpg for SQLAlchemy's asynchronous application sessions so the server works with Windows' Proactor event loop; Psycopg remains available for Alembic and maintenance scripts.
- 2026-09-07: MVP booking tax is 0% until the hotel supplies a tax policy; price-per-night, subtotal, tax, and total are still persisted as immutable booking snapshots.
- 2026-09-07: Booking creation assigns the first available active physical room under a row lock with `SKIP LOCKED`; the PostgreSQL exclusion constraint remains the final overlap guard.
- 2026-09-07: Customers may cancel only future bookings in pending or confirmed status; same-day, checked-in, checked-out, cancelled, and rejected bookings require no customer cancellation path.
- 2026-09-07: Customer avatar upload is not retained in the Step 9 MVP; Storage work remains centralized in Step 10 rather than expanding the account scope.
- 2026-09-07: Catalog images use the public `room-images` bucket, unique `inventory/<parent>/<random>` object paths, JPEG/PNG/WebP signature checks, and a 5 MB limit; FastAPI owns metadata/storage coordination.
- 2026-09-07: Admin booking transitions are pending→confirmed/rejected/cancelled, confirmed→checked-in/cancelled, and checked-in→checked-out; terminal booking states cannot transition.
- 2026-09-07: Enquiries may progress from new to in-progress/resolved/closed, in-progress to resolved/closed, and resolved back to in-progress or closed; closed enquiries are terminal.
- 2026-09-07: Report periods use `[start_date, end_date)` and are limited to 366 nights. Occupancy and booked revenue include confirmed, checked-in, and checked-out reservations; booked revenue uses immutable nightly price snapshots and is not cash accounting.
- 2026-09-07: Public enquiry throttling is five attempts per client per minute per FastAPI process by default; multi-worker production deployments must add a shared edge/WAF limiter. API errors are correlated with sanitized request IDs, and both applications emit explicit browser security headers.
- 2026-09-08: Staging uses Vercel for `frontend/`, a Render Blueprint for `backend/`, and hosted Supabase. A GitHub Actions health request runs every 10 minutes for free-tier staging convenience; it is not an uptime guarantee and a paid Render instance remains the production recommendation.
- 2026-09-08: At the user's request, recorded two separate paused payment milestones: Step 15 for manual administrator-verified QR/cash payments and Step 16 for later automated payment-gateway integration. Neither step may begin until the user explicitly resumes it.
- 2026-09-23: Began the local-only migration on `codex/local-sqlite-mode` while preserving cloud commit `b617082` on `main` and the annotated `supabase-cloud-v1` tag. Selected a versioned SQLite initializer, idempotent first-run seed, standard-library PBKDF2 password hashing, generated first-run `admin@example.com` password, authenticated password changes, retained local `/docs`, no committed database, no default LAN mode, and a deliberate port of the existing async raw-SQL data layer rather than an ORM rewrite.

## Completion log

- 2026-09-25: Step 26 completed. Added `reset_admin_password.py`, which requires `--yes`, refuses to run while the local API is live, targets only the active built-in `admin@example.com` administrator, generates a new password locally, preserves the complete SQLite dataset and uploads, and rotates the session-signing key to invalidate all existing cookies. Added recovery documentation and a focused regression proving the old password fails, the new hash verifies, application rows remain intact, unsafe administrator state is rejected, and the signing key changes. Backend Ruff and all 57 tests passed. A disposable end-to-end CLI smoke test verified the generated credential, seeded catalog, and session key, then removed its database, media, key, and password from memory; the live-database refusal check also passed.

- 2026-09-25: Step 25 completed. Added a clean-tree `git archive` release builder with required-file and forbidden-runtime validation, a complete local operator guide, ZIP/share instructions, and stronger Playwright navigation/mutation synchronization. Backend Ruff and all 56 tests passed; frontend lint, type checking, all eight unit tests, production build, and all ten desktop/mobile Playwright journeys passed. Production npm dependencies reported zero vulnerabilities; the two remaining moderate advisories are confined to the Vitest 3 development-only mocker, while its patched major currently breaks the documented Node 20/npm 10 reproducible lock workflow. Built a 165-file source archive, confirmed it contains no environment files, dependencies, caches, database, uploads, session key, or logs, extracted it to a separate clean path, installed both dependency sets from the documented manifests, and started it without configuration. The extracted copy generated a new one-time administrator credential, created and seeded SQLite, returned backend health plus three catalog entries, and served the frontend with `200`.

- 2026-09-24: Step 24 completed. Added an idempotent seed command, reset confined to `backend/data` with staged rollback and explicit `--yes`, versioned/atomic all-table JSON export, exact-format/schema/table/column validation with transactional import, and a booking/report CSV export. Sensitive exports default to ignored storage and refuse overwrite; reset/import refuse to run while FastAPI is live. Added startup database-path/administrator logging and a cross-platform root `start_local.py` launcher with prerequisite checks and managed child-process shutdown. Added five disposable maintenance tests covering round trips, tamper rejection without data loss, overwrite refusal, reset confinement/reseed/media restoration, and CSV content. Exercised all five CLI workflows against a disposable installation and removed its generated database, media, password, JSON, and CSV afterward. Backend Ruff and all 56 tests passed; frontend lint, type checking, all eight tests, and production build passed. The combined launcher started both services, and backend/frontend returned `200`.

- 2026-09-24: Step 23 completed. Removed the Render Blueprint, Vercel/Render release and keep-warm workflows, eight hosted smoke scripts, the obsolete Alembic stub, hosted schema test, complete Supabase migrations/config/seed/local state, and cloud deployment/production documents. Removed retired cloud settings from the ignored backend environment without displaying their values. Rewrote the active build plan, project instructions, root/frontend READMEs, architecture, API, data-model, backup/recovery, and testing documents for the local SQLite/cookie/filesystem architecture; the hosted release remains recoverable through `supabase-cloud-v1`. Backend Ruff and all 51 active local tests passed; frontend lint, type checking, all eight tests, and production build passed. Restarted both local services from the cleaned tree; backend health, three-item catalog, and frontend returned `200`.

- 2026-09-24: Step 22 completed. Replaced Supabase browser/server/proxy session clients and bearer-token plumbing with a shared local session-cookie contract, credentialed browser requests, server-side cookie forwarding, local registration/login/logout, authenticated password changes, and cookie-based account/admin/book guards. Removed callback/reset-email flows, frontend Supabase dependencies and environment variables, and added localhost API defaults. Added a local admin users screen with protected role changes, regenerated OpenAPI TypeScript contracts, and expanded Playwright coverage for anonymous guards, customer registration/profile/password/booking/cancellation, administrator role management, and all admin workspaces. Frontend lint, type checking, all eight unit tests, production build, and all ten desktop/mobile Playwright tests passed. Both local servers are running.

- 2026-09-23: Step 21 completed. Replaced Supabase Storage HTTP calls and credentials with confined local paths, exclusive file creation, compensating upload cleanup, quarantine-based deletion rollback, startup orphan cleanup, and a FastAPI `/media` mount. Catalog and admin responses now return URL-encoded local media URLs. Added three tracked, generated 1536×1024 room photographs for Deluxe King, Family Suite, and Garden Twin; first-run setup copies them into ignored runtime storage and idempotently seeds their metadata. Added localhost media allowances to Next.js image configuration and CSP. Backend Ruff and all 58 tests passed, covering demo copying, path traversal, signatures, size/type validation, upload/read/update/delete, database-failure cleanup, delete restoration, metadata seeding, and public URLs. A direct media request returned `200 image/png`; frontend verification remained green.

- 2026-09-23: Step 20 completed. Added schema-v2 email/password migration, case-insensitive unique local accounts, 600,000-iteration salted PBKDF2-HMAC-SHA256 password hashes, generated first-run `admin@example.com` credentials, a persisted ignored signing key, eight-hour HS256 HttpOnly SameSite=Lax sessions, local register/login/logout/current-user/admin-check/password-change endpoints, origin-based CSRF protection for cookie-authenticated writes, optional local identity on enquiries, and admin-only user listing/role changes with self-change and last-admin safeguards. Removed backend Supabase JWKS and bearer-token verification while retaining only temporary Storage configuration. Backend Ruff and all 54 tests passed, including v1-to-v2 migration, hashing, signing-key stability, cookie flags, session restoration, duplicate/generic login handling, password rotation, logout, missing/invalid/expired sessions, CSRF rejection, customer/admin isolation, self-role denial, and administrator promotion. OpenAPI generation exposed all expected local auth and admin-user routes without requiring network access.

- 2026-09-23: Step 19 completed. Replaced the PostgreSQL/asyncpg/psycopg runtime with async SQLite, first-run schema versioning, idempotent catalog seeds, WAL/foreign-key/busy-timeout pragmas, serialized `IMMEDIATE` transactions, and database triggers for active-booking overlap rejection. Ported catalog, booking, profiles, enquiries, inventory, operations, dashboard, occupancy, and revenue SQL; stored all money as integer paise with exact `Decimal` boundaries; simplified the Windows server launcher; and ignored local runtime data. Backend Ruff and all 50 tests passed, including real SQLite service, reseed, FK, money, concurrent booking, overlap, and back-to-back coverage. A no-environment startup returned `200` with three catalog categories, live health/catalog smoke checks returned `200`, and frontend lint, types, eight tests, and production build passed.

- 2026-09-23: Step 18 completed. Reviewed and activated `docs/local-mode-plan.md`, created the isolated `codex/local-sqlite-mode` branch and annotated `supabase-cloud-v1` rollback tag, preserved all cloud assets, and resolved implementation defaults for the remaining phases. Backend Ruff and all 45 tests passed; frontend lint, type checking, all eight tests, and production build passed. Runtime smoke checks returned `200` for backend health and the frontend shell. The current catalog's expected offline failure was recorded: it still requires external Supabase DNS until Step 19 replaces the data layer.

- 2026-09-08: Step 17 completed. Replaced the admin header navigation with a responsive sidebar dashboard shell, added route-aware active states for root and nested admin routes, added active inventory tabs, and restyled Overview, Inventory, Operations, forms, queues, metrics, status labels, charting, and actions with a light-only 60/30/10 white-neutral-black system and sharp borders. Added focused navigation tests; frontend lint, type checking, eight unit tests, and the production build passed.

- 2026-09-08: Step 14 completed. With explicit confirmation, disabled Vercel Authentication to make staging public. Diagnosed the resulting platform `404` as a Vercel project imported with the `Other` framework preset, changed it to `Next.js`, and redeployed successfully; the managed production, branch, and unique deployment URLs now return `200`. Verified Render health/catalog and exact-origin CORS plus preflight, passed all six Playwright desktop/mobile staging checks, passed disposable live authentication/concurrent-booking and admin inventory/Storage smoke tests with cleanup, added the `RENDER_HEALTH_URL` GitHub Actions repository secret, and confirmed keep-warm workflow run #5 succeeded.

- 2026-09-08: Configured Supabase Auth Site URL to the canonical Vercel `git-main` staging origin and added production plus localhost callback/reset allowlist entries. Staging Playwright reached Vercel's login page instead of the application in all six desktop/mobile checks. Inspection confirmed Vercel Authentication is enabled with Standard Protection (`Require Log In`), so disabling project deployment protection is the next required, permission-changing action.

- 2026-09-08: With explicit confirmation, removed and recreated the broken Vercel-managed primary alias; it remained a platform-level `404`, and a newly created managed alias behaved the same. Verified that Vercel's automatic `git-main` branch alias consistently returns `200`, designated it as the canonical staging frontend, updated Vercel `NEXT_PUBLIC_SITE_URL`, redeployed Vercel, updated Render `FRONTEND_URL`, and redeployed Render. The canonical frontend, Render health, and database-backed catalog return `200`, and CORS now returns the exact canonical Vercel origin. Supabase Auth URL configuration is waiting because the Supabase browser session expired.

- 2026-09-08: Signed into the Supabase owner account, confirmed project `taliyhczkllqydvpsqdt` in `ap-south-1`, selected its shared transaction pooler, replaced Render's direct IPv6 database URI with the IPv4-compatible pooler endpoint on port 6543, and triggered a redeploy. Render health and `/api/v1/catalog/rooms` now return `200`, and production-origin CORS is correct. Refreshed and resaved Vercel's valid Production domain assignment, but the managed primary alias still returns `404 NOT_FOUND`; its unique deployment URL remains healthy. Repair now requires confirmed removal and recreation of the primary alias.

- 2026-09-08: Rechecked the live staging deployments. Vercel's latest build is Ready, its unique deployment URL responds successfully over HTTPS, all four `NEXT_PUBLIC_*` variables are Config values, and the production domain is marked valid, but the primary alias still returns a platform-level `404 NOT_FOUND`. Render health and OpenAPI return `200` and CORS allows the production Vercel origin, but `/api/v1/catalog/rooms` returns `500`; Render logs identify an unreachable asyncpg database connection. The configured database URI was safely inspected as the direct Supabase host on port 5432, which is not reachable from Render's network. Supabase pooler retrieval is blocked because the currently authenticated Supabase account does not have access to project `taliyhczkllqydvpsqdt`.

- 2026-09-08: Step 14 deployment preparation completed but live deployment is waiting. Added `render.yaml` with the backend root/build/start commands, exact secret placeholders, production mode, and HTTP health check; added a manually runnable and 10-minute scheduled Render keep-warm workflow using the `RENDER_HEALTH_URL` repository secret; and documented Vercel monorepo configuration, Render/Supabase environment setup, Auth redirects, CORS, limitations, and staging verification. GitHub sign-in is open; the local repository has no remote, so provider imports cannot proceed until the user signs in and authorizes the repository connections.
- 2026-09-08: Created the private `Rajat22UEE/hotel-management-system` GitHub repository, completed a secret/ignore audit, committed the release candidate, and pushed `main`. Render repository import is blocked on granting its GitHub app access to this repository; Vercel deployment is blocked on its GitHub sign-in/account and repository authorization flow.
- 2026-09-07: Step 13 completed. Added backend request-ID handling, structured JSON error logging, safe unhandled-error responses, exact CORS methods/headers, API no-store and browser security headers, per-process enquiry throttling with documented shared-edge requirements, frontend CSP/security headers, GitHub Actions release gates, desktop/mobile Playwright journeys, and testing/production/backup/recovery documentation. Fixed the concurrency smoke test to use the canonical configurable API URL. Backend Ruff and 45 tests passed; frontend lint/type/6 tests/build passed; 6 Playwright desktop/mobile checks passed; npm reported zero vulnerabilities; secret/environment scans were clean; and the full disposable hosted suite passed Auth, role/RLS isolation, catalog, enquiries, availability boundaries, exactly-one concurrency, customer cancellation/history, admin inventory/Storage/operations, and reports with cleanup. Both local services are healthy.
- 2026-09-07: Step 12 completed. Added admin-only dashboard, occupancy, and booked-revenue endpoints; active-room, occupied-room, arrival, departure, pending-booking, open-enquiry, and recent-booking metrics; checkout-exclusive date-filtered daily reports; empty-inventory-safe percentages; a responsive KPI/report dashboard with date controls and occupancy visualization; moved inventory to `/admin/inventory`; documented formulas in `docs/reports.md`; and regenerated OpenAPI contracts. Backend Ruff and 42 tests passed, frontend lint/type/6 tests/build passed, and a controlled hosted fixture proved 12 available room-nights, 2 occupied room-nights, 16.67% occupancy, ₹200 immutable-snapshot revenue, correct day boundaries/arrival counts, and cleanup. Browser QA confirmed dashboard route protection, and both local servers are running.
- 2026-09-07: Step 11 completed. Added admin-only searchable/paginated booking and enquiry APIs and responsive queues; explicit booking and enquiry transition maps; booking actor/reason history; enquiry active-admin assignment and internal notes; filter, empty, terminal, success, and error states; admin navigation; and regenerated OpenAPI contracts. Backend Ruff and 40 tests passed, frontend lint/type/6 tests/build passed, and a disposable hosted admin/customer workflow proved authorization denial, queue search/filtering, invalid-transition rejection, valid booking history, enquiry assignment/resolution, and cleanup. Browser QA confirmed operations-route protection, and both local servers are running.
- 2026-09-07: Step 10 completed. Added admin-only category, physical-room, facility, and room-image APIs; create/edit/delete inventory workflows; conflict-safe deletion; cover/order metadata; unique Storage paths; MIME signature and 5 MB validation; compensating cleanup for failed metadata writes; a responsive tabbed inventory studio; and generated OpenAPI types. Applied the `20260907020000_room_images_storage.sql` migration to the confirmed development project, creating/updating the public bucket and admin-only write policies. Backend Ruff and 38 tests passed, frontend lint/type/6 tests/build passed, and a disposable hosted admin/customer test proved customer denial, admin CRUD, public catalog propagation, Storage upload/read/delete, and cleanup. Browser QA confirmed admin route protection; both local servers are running.
- 2026-09-07: Step 9 completed. Added authenticated profile read/update endpoints that cannot mutate email or role; customer-owned booking list and detail endpoints; future pending/confirmed cancellation with row locking, actor/reason history, and safe 404 ownership isolation; responsive profile, reservation list/empty state, detail, and cancellation UI; and regenerated OpenAPI contracts. Backend Ruff and 34 tests passed, frontend lint/type/6 tests/build passed, a two-user hosted smoke test verified own-booking visibility, cross-user denial, role-promotion resistance, cancellation history, and cleanup, and browser QA confirmed account route protection. Both local servers remain running.
- 2026-09-07: Step 8 completed. Added authenticated transactional booking creation, locked physical-room assignment, immutable Decimal price snapshots, human-readable references, initial pending-status history, capacity/date validation, and clean 409 conflict handling backed by the PostgreSQL exclusion constraint. Added a protected responsive booking page with session-token API submission, checkout-exclusive price summary, success/error/capacity states, generated OpenAPI types, and room-detail entry point. Backend Ruff and 31 tests passed; frontend lint/type/6 tests/build passed; a hosted disposable-user concurrency test returned exactly one 201 and one 409 and verified price/history before cleanup; route-protection browser QA passed; both local servers are running.
- 2026-09-07: Step 7 completed. Added paired date, guest-capacity, category, keyword, and price filters; a dedicated availability endpoint with canonical checkout-exclusive night counts; active-room filtering that blocks pending/confirmed/checked-in overlaps while allowing cancelled/rejected/checked-out and back-to-back stays; 30-night and past-date validation; URL-persistent responsive search UI with clear and empty states; generated OpenAPI types; Windows selector-loop development launcher; documentation and live overlap smoke tests. Backend Ruff and 26 tests passed, frontend lint/type/4 tests/build passed, disposable Supabase overlap checks passed with cleanup, and desktop/mobile browser checks passed without overflow or console errors.
- 2026-09-06: Step 6 completed. Added paginated/searchable public room-category, room-detail, and facility APIs; validated anonymous/authenticated enquiry creation with a bot-trap field; database-backed pricing, capacities, physical-room counts, and facilities; frontend loading, empty, error, search, pagination, detail, and enquiry states; asyncpg Windows runtime support; generated TypeScript contracts from FastAPI OpenAPI; integration documentation and smoke tests. Backend Ruff and 20 tests passed, frontend lint/type/3 tests/build passed, hosted catalog/facility/enquiry persistence passed with cleanup, and live browser checks displayed seeded data without overflow or console errors.
- 2026-09-06: Step 5 completed. Created the Aurelia House placeholder brand and responsive design system; global desktop/mobile navigation and footer; home, rooms, three statically generated room details, facilities, gallery, about, and contact pages; reusable hotel data and public components; route metadata, accessible landmarks, form labels, focus states, and explicit staged states. Frontend lint/type/test/build passed. Browser QA passed at 1440×900 and 390×844 across every public route with no horizontal overflow or console errors.
- 2026-09-06: Step 4 completed. Added Supabase browser/server clients and Next.js session-refresh proxy; registration, verification callback, login, logout, forgot-password, reset-password, customer account, and admin guards; FastAPI JWKS token validation and database-backed customer/admin dependencies; authorization and database-driver tests; and a hosted disposable-user smoke test. Frontend verification passed, backend Ruff and 16 tests passed, and hosted signup/sign-in/profile/JWT/customer/admin checks passed with cleanup.
- 2026-09-06: Step 3 completed. Validated matching frontend/backend project URL and publishable key formats without displaying secrets; confirmed local environment files are ignored; previewed and deployed the initial migration; loaded the development seed; verified 9 application tables, 33 RLS policies, the booking-overlap constraint, seed counts (3 categories, 4 rooms, 4 facilities), Auth email configuration, and Storage API connectivity. Added typed frontend and backend environment configuration with tests.
- 2026-09-06: Step 2 completed. Generated Supabase CLI configuration; added nine-table MVP schema, 14 indexes, explicit grants, 33 RLS policies, profile/auth triggers, transactional date-overlap protection, repeatable catalog seeds, pgTAP contract tests, static migration security tests, and data-model documentation. Supabase CLI 2.116.0 loaded successfully. Static tests passed; database lint/reset could not run because Docker/PostgreSQL is not installed locally.
- 2026-09-06: Step 1 completed. Initialized the root Git repository; scaffolded Next.js 16, Tailwind CSS 4, shadcn/ui, FastAPI, SQLAlchemy, Alembic, Vitest, and pytest; added environment safety and documentation; verified frontend lint/type/test/build, backend lint/test, both development servers, and ignored secret paths.
- 2026-09-06: Original synopsis reviewed and technically analyzed.
- 2026-09-06: Greenfield architecture and build plan created.
- 2026-09-06: Persistent Codex instructions and execution runbook created.
