# Hotel Management System - Build Plan

## 1. Product goal

Build a local-first, responsive hotel booking system for one property.

- Customers browse rooms, check availability, register, sign in, manage a profile, create/view/cancel bookings, and submit enquiries.
- Administrators manage room categories, rooms, facilities, images, bookings, enquiries, users, roles, dashboards, and reports.
- Online payment capture, dynamic pricing, staff scheduling, and multi-hotel tenancy are deferred. Manual QR/cash confirmation and later gateway integration remain paused as Steps 15 and 16 in `CODEX_RUNBOOK.md`.

## 2. Active technology stack

### Frontend

- Next.js App Router and TypeScript
- Tailwind CSS and shadcn/ui
- Server Components for initial reads; client components for interactive mutations
- Vitest/Testing Library and Playwright

### Backend

- FastAPI and Pydantic v2
- SQLAlchemy 2 asynchronous sessions with `aiosqlite`
- SQLite with foreign keys, WAL mode, busy timeout, serialized writes, indexes, checks, and overlap triggers
- PBKDF2-HMAC-SHA256 password hashes and signed HttpOnly session cookies
- Local filesystem media storage under `backend/data/uploads/`
- Ruff, pytest, pytest-asyncio, and HTTPX

### Runtime

- Next.js at `http://localhost:3000`
- FastAPI at `http://localhost:8000`
- SQLite at `backend/data/hms.db`
- No hosted runtime, cloud account, Docker, or external database is required

The previous hosted implementation is retained only in Git under `supabase-cloud-v1`.

## 3. Architecture and trust boundaries

```text
Browser
  |  Next.js pages and forms
  v
Next.js :3000
  |  credentialed HTTP requests
  v
FastAPI :8000
  |-- identity and authorization
  |-- booking/pricing/availability rules
  |-- inventory, operations, and reports
  |-- validated local media coordination
  v
SQLite + local upload directory
```

Rules:

1. FastAPI owns every trusted business mutation.
2. Identity comes only from the signed `hms_session` cookie; database roles are reloaded server-side.
3. The frontend proxy improves navigation but never replaces API authorization.
4. Unsafe cookie-authenticated requests require the configured frontend `Origin`.
5. Booking creation uses a serialized transaction and a database overlap trigger.
6. Money is stored as integer paise and exposed through exact decimal API values.
7. Upload paths are server-generated/confined; bytes and database metadata are coordinated with cleanup/rollback behavior.
8. Runtime data, passwords, signing keys, traces, and environment files are never committed.

## 4. Repository layout

```text
frontend/
  src/app/                 routes, layouts, server actions
  src/components/          public, account, booking, admin, UI
  src/lib/                 API contract/client, auth, utilities
  e2e/                     desktop/mobile browser journeys

backend/
  app/api/v1/routes/       public, customer, auth, and admin endpoints
  app/core/                settings, auth, password, middleware, storage
  app/db/                  engine/session and versioned SQLite schema
  app/services/            business workflows and SQL
  data/demo/               tracked first-run room images
  data/                    ignored runtime database, uploads, signing key
  scripts/dev_server.py    local development launcher
  tests/                   isolated backend test suite

docs/                      active local architecture and operations
CODEX_RUNBOOK.md           ordered execution state
```

## 5. Data model

Core tables are `profiles`, `room_categories`, `rooms`, `facilities`, `room_category_facilities`, `room_images`, `bookings`, `booking_status_history`, and `enquiries`.

- A profile has local credentials and a trusted `customer` or `admin` role.
- A room belongs to one category; facilities are shared across categories.
- Each image belongs to exactly one room or category.
- A booking snapshots nightly price, subtotal, tax, and total when created.
- Status history records actors and reasons for lifecycle transitions.
- Enquiries support assignment, internal notes, and controlled transitions.

Booking ranges are half-open `[check_in, check_out)`. Pending, confirmed, and checked-in states block inventory. A FastAPI availability check provides friendly conflicts; SQLite triggers remain the final concurrency boundary.

## 6. Authentication and authorization

- Registration creates only customers.
- Passwords require at least 12 characters and are stored as salted 600,000-iteration PBKDF2 hashes.
- Sessions are eight-hour HS256 tokens in an HttpOnly, SameSite=Lax cookie.
- The signing key is generated into ignored local storage.
- Customer endpoints enforce ownership. Administrator endpoints enforce the database role.
- Administrator self-demotion and removal of the final administrator are prohibited.
- Password changes require the current password; email delivery/reset is intentionally unavailable offline.

## 7. Media storage

Room images are stored below the configured upload root and served by FastAPI under `/media`. Uploads allow validated JPEG, PNG, and WebP content up to 5 MB. The storage layer rejects traversal, mismatched signatures, and unsafe paths; compensating cleanup prevents orphaned files or metadata.

Tracked demo images are copied into runtime storage during idempotent startup seeding.

## 8. Functional scope

### Public/customer

- Responsive public hotel pages and active catalog
- Search and filters for stay dates, guests, category, keyword, and price
- Registration, login, logout, session restoration, password change
- Profile read/update
- Transactional booking creation and customer reservation history/detail
- Eligible future cancellation with audit history
- Public or signed-in enquiries

### Administrator

- Sidebar dashboard with active navigation
- Categories, physical rooms, facilities, and image management
- Searchable/paginated booking and enquiry queues
- Validated status transitions, reasons, assignment, and notes
- User listing and protected role management
- Current summary, occupancy, and booked-revenue reports

## 9. Quality gates

Backend changes must pass Ruff and pytest. Frontend changes must pass ESLint, generated route/TypeScript checks, Vitest, and the production build. Cross-layer work must pass Playwright desktop/mobile journeys where relevant.

Security-sensitive work reviews cookie/session handling, authorization, origin checks, secret tracking, validation, generic error responses, upload confinement, and booking concurrency.

## 10. Remaining ordered work

`CODEX_RUNBOOK.md` is the execution tracker.

- Step 23 removes retired hosted runtime/deployment assets and rewrites active documentation.
- Step 24 adds explicit seed/reset/export/import/booking-export tooling and simple local startup commands.
- Step 25 completes offline release/security verification and zip-and-run packaging.
- Payment Steps 15 and 16 remain paused until the user explicitly resumes them.
