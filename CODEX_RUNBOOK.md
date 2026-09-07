# Hotel Management System - Codex Execution Runbook

This file turns `BUILD_PLAN.md` into an ordered implementation process. The user can say **"do next"** and Codex will execute the current `READY` step, verify it, update this file, and report what comes next.

## Status definitions

- `PENDING`: earlier work must finish first.
- `READY`: prerequisites are satisfied and Codex may implement it.
- `IN PROGRESS`: implementation has started but is not verified.
- `WAITING`: blocked on a specific user or external action.
- `DONE`: implementation and required checks passed.

## Current state

- Current step: **Step 14 - Staging deployment**
- Status: **WAITING**
- Last completed step: **Step 13 - Full hardening and release candidate**
- Application state: The release candidate is published to the private `Rajat22UEE/hotel-management-system` GitHub repository. Render is signed in but currently has access only to a different GitHub account; Vercel is awaiting GitHub sign-in/account creation. Live services are not created yet.
- User action currently required: Authorize Codex to open Render's GitHub installation configuration and Vercel's GitHub sign-in/account flow. These actions grant third-party repository access and therefore require confirmation at action time. Secret values will remain in provider dashboards only.
- Next command: **do next**

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

**Status:** WAITING

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

## Deferred Step 15 - Online payments

**Status:** PENDING

**Objective:** Add online payments only after the non-payment MVP is stable and the user selects a provider.

**Prerequisites:**

- Step 14 is `DONE`.
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

## Completion log

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
