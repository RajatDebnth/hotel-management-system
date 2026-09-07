# Hotel Management System - Build Plan

## 1. Product goal

Build a responsive hotel room booking application with two principal roles:

- Guest/customer: browse rooms, check availability, register, sign in, make and manage bookings, submit enquiries, and maintain a profile.
- Administrator: manage room categories, rooms, facilities, room images, bookings, enquiries, users, and operational reports.

The first release is a single-hotel system. Multi-hotel support, online payment capture, dynamic pricing, and staff scheduling are explicitly deferred until the core booking workflow is reliable.

## 2. Chosen technology stack

### Frontend

- Next.js App Router with TypeScript
- Tailwind CSS
- shadcn/ui components
- React Hook Form and Zod for forms and client-side validation
- TanStack Query only for client-side data that benefits from caching or mutation state; prefer Server Components for initial reads
- Recharts for administrator dashboard charts
- date-fns for date calculations and display

### Backend

- Python FastAPI
- Pydantic v2 request/response schemas
- SQLAlchemy 2 async ORM and Alembic migrations
- psycopg 3 async PostgreSQL driver
- Supabase JWT verification using the project's JWKS/signing configuration
- Structured logging and request IDs

### Supabase services

- PostgreSQL: source of truth for application data
- Auth: email/password authentication, email verification, password reset, and user sessions
- Storage: room, facility, and gallery images
- Row Level Security (RLS): database-level access control

### Quality and operations

- Frontend unit/component tests: Vitest and React Testing Library
- Backend tests: pytest, pytest-asyncio, and HTTPX
- End-to-end tests: Playwright
- Formatting/linting: ESLint/Prettier for frontend, Ruff for backend
- Local orchestration: separate frontend and backend processes; optional Docker Compose for reproducible development
- Deployment target: Vercel for Next.js, a container host for FastAPI, and hosted Supabase for data/auth/storage

## 3. Architecture and trust boundaries

```text
Browser
  |
  | Supabase Auth session (secure SSR cookies)
  v
Next.js application
  |
  | Authorization: Bearer <Supabase access token>
  v
FastAPI application
  |-- verifies JWT, role, input, and business rules
  |-- performs availability checks and transactional booking writes
  v
Supabase PostgreSQL

Browser/Next.js -- signed or policy-controlled access --> Supabase Storage
```

Rules:

1. FastAPI owns business operations. Do not duplicate booking logic in Next.js.
2. Next.js can use Supabase directly for authentication/session handling, but application mutations go through FastAPI.
3. Never expose the Supabase secret/service-role key to the browser.
4. Normal user queries must run with user identity or be protected by equivalent backend authorization plus RLS.
5. Administrative operations require both a valid token and an admin role stored in trusted profile/app metadata.
6. Room availability and booking creation must execute transactionally to prevent double booking.

## 4. Proposed repository layout

```text
hotel-management-system/
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- (public)/
|   |   |   |-- (auth)/
|   |   |   |-- account/
|   |   |   |-- admin/
|   |   |   `-- auth/callback/
|   |   |-- components/
|   |   |   |-- ui/
|   |   |   |-- rooms/
|   |   |   |-- booking/
|   |   |   `-- admin/
|   |   |-- lib/
|   |   |   |-- api/
|   |   |   |-- supabase/
|   |   |   `-- validation/
|   |   `-- types/
|   |-- public/
|   `-- tests/
|-- backend/
|   |-- app/
|   |   |-- api/v1/
|   |   |-- core/
|   |   |-- db/
|   |   |-- models/
|   |   |-- schemas/
|   |   |-- services/
|   |   `-- main.py
|   |-- alembic/
|   `-- tests/
|-- supabase/
|   |-- migrations/
|   |-- seed.sql
|   `-- config.toml
|-- docs/
|   |-- api.md
|   |-- data-model.md
|   `-- test-plan.md
|-- .env.example
|-- .gitignore
`-- README.md
```

## 5. Core database design

All primary keys use UUIDs. All mutable tables include `created_at` and `updated_at` timestamps. Money uses `numeric(12,2)` and dates use `date` unless time-of-day is genuinely required.

### profiles

- `id` UUID PK, references `auth.users(id)`
- `full_name`
- `phone`
- `avatar_path`
- `role`: `customer` or `admin`
- `is_active`

Create a profile automatically when an Auth user is created. A normal client must never be able to promote itself to admin.

### room_categories

- `id`, `name`, `slug`, `description`
- `base_price`, `max_guests`
- `bed_type`, `room_size_sq_m`
- `is_active`

### rooms

- `id`, `room_number` (unique)
- `category_id` FK
- `floor`, `description`
- `status`: `active`, `maintenance`, `inactive`

### facilities

- `id`, `name`, `icon`, `description`, `is_active`

### room_category_facilities

- `category_id` FK
- `facility_id` FK
- composite unique key

### room_images

- `id`, `room_id` or `category_id`
- `storage_path`, `alt_text`, `sort_order`, `is_cover`

### bookings

- `id`, `booking_reference` (unique, human-readable)
- `user_id` FK to profiles
- `room_id` FK
- `check_in`, `check_out`
- `adult_count`, `child_count`
- `guest_name`, `guest_email`, `guest_phone`
- `price_per_night`, `night_count`, `subtotal`, `tax_amount`, `total_amount`
- `status`: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `rejected`
- `special_requests`
- `cancelled_at`, `cancellation_reason`

Constraints:

- `check_out > check_in`
- guest counts are non-negative and at least one total guest
- a PostgreSQL exclusion constraint on room plus active booking date range prevents overlapping reservations even under concurrent requests
- historical prices are copied onto the booking and are not recalculated when category pricing changes

### booking_status_history

- `id`, `booking_id`, `from_status`, `to_status`
- `changed_by`, `reason`, `created_at`

### enquiries

- `id`, optional `user_id`
- `name`, `email`, `phone`, `subject`, `message`
- `status`: `new`, `in_progress`, `resolved`, `closed`
- `assigned_to`, `admin_notes`

### Optional post-MVP tables

- `payments` and `refunds` after choosing a payment provider
- `reviews`
- `promo_codes`
- `audit_logs`
- `hotel_settings`

## 6. Storage design

Buckets:

- `room-images`: public read, admin-only write/delete
- `avatars`: authenticated access; users can manage only their own folder
- `private-documents`: private bucket reserved for a later identity/document workflow

Store object paths in PostgreSQL, not full public URLs. Validate MIME type and size. Generate unique object names and delete replaced objects through a controlled backend/admin workflow.

## 7. Authentication and authorization

### Authentication flows

- Email/password sign-up
- Email verification
- Sign-in and sign-out
- Forgot/reset password
- Session refresh in Next.js server-side auth utilities
- Protected account and administrator route groups

### FastAPI authentication

- Read the bearer token from the `Authorization` header.
- Verify signature, issuer, audience/claims, and expiry using Supabase's supported key configuration.
- Resolve the profile and attach an authenticated-user object to the request.
- Provide `require_user` and `require_admin` dependencies.
- Return `401` for invalid/missing identity and `403` for insufficient role.

### Initial RLS policy intent

- Public users may read active room categories, active rooms, approved facilities, and public images.
- Customers may read/update their own profile, but never their role.
- Customers may create and read their own bookings; cancellation must use an API operation that enforces cancellation rules.
- Administrators may manage application records.
- Storage policies mirror the database roles and ownership rules.

## 8. API surface (`/api/v1`)

### Public/catalog

- `GET /rooms` - filter by category, guests, price, and availability dates
- `GET /rooms/{room_id}`
- `GET /room-categories`
- `GET /facilities`
- `POST /enquiries`
- `GET /availability?check_in=&check_out=&guests=`

### Customer

- `GET /me`
- `PATCH /me`
- `GET /bookings`
- `POST /bookings`
- `GET /bookings/{booking_id}`
- `POST /bookings/{booking_id}/cancel`

### Administrator

- CRUD `/admin/room-categories`
- CRUD `/admin/rooms`
- CRUD `/admin/facilities`
- CRUD `/admin/room-images`
- `GET /admin/bookings`
- `PATCH /admin/bookings/{booking_id}/status`
- `GET /admin/enquiries`
- `PATCH /admin/enquiries/{enquiry_id}`
- `GET /admin/users`
- `GET /admin/dashboard/summary`
- `GET /admin/reports/occupancy`
- `GET /admin/reports/revenue`

Every endpoint receives and returns explicit Pydantic schemas. Publish FastAPI's generated OpenAPI documentation in development, and generate frontend API types from the schema to reduce contract drift.

## 9. Frontend routes and screens

### Public

- `/` - hotel landing page, featured rooms, facilities, calls to action
- `/rooms` - search and filter available rooms
- `/rooms/[slug]` - room/category details and booking entry point
- `/about`, `/gallery`, `/contact`
- `/login`, `/register`, `/forgot-password`, `/reset-password`

### Customer account

- `/account` - dashboard
- `/account/profile`
- `/account/bookings`
- `/account/bookings/[reference]`
- `/book/[roomId]` - date/guest form, price summary, confirmation

### Administrator

- `/admin` - KPIs, occupancy, recent bookings and enquiries
- `/admin/rooms`
- `/admin/categories`
- `/admin/facilities`
- `/admin/bookings`
- `/admin/enquiries`
- `/admin/users`
- `/admin/reports`

All screens must include loading, empty, validation, failure, and success states. The UI must be keyboard accessible, responsive, and usable on mobile without horizontal overflow.

## 10. Booking workflow

1. Customer selects check-in/check-out dates and guest count.
2. Frontend requests availability from FastAPI.
3. FastAPI validates dates, capacity, room status, and overlapping active bookings.
4. Customer signs in if necessary and submits guest details.
5. FastAPI starts a transaction, repeats the availability check, calculates nights and price, then inserts the booking.
6. The database exclusion constraint is the final concurrency guard.
7. API returns a booking reference and immutable price summary.
8. Customer sees confirmation and can find the booking in their account.
9. Administrator confirms/rejects the request and every status change is recorded.

MVP uses `pending`/`confirmed` reservations without online card processing. Payment integration is a separate milestone because it requires webhooks, idempotency, reconciliation, refund rules, and provider-specific security work.

## 11. Implementation phases

### Phase 0 - Foundation

- Create the frontend, backend, and Supabase project structure.
- Add `.env.example`, safe `.gitignore`, scripts, linting, formatting, and test configuration.
- Add health endpoints and a basic CI workflow.
- Document local setup and secret handling.

Exit criterion: both apps start locally, lint/test commands run, and no secrets are committed.

### Phase 1 - Supabase schema and authentication

- Create enum types, tables, indexes, constraints, triggers, and RLS policies.
- Add deterministic seed data.
- Configure SSR-compatible Supabase Auth in Next.js.
- Implement register, verification callback, login, logout, reset password, and protected layouts.
- Add FastAPI JWT verification and role dependencies.

Exit criterion: a customer can authenticate; protected APIs reject invalid tokens; an admin route rejects a customer.

### Phase 2 - Public hotel experience

- Build the design system, global navigation, footer, and responsive layouts.
- Implement home, rooms, room detail, facilities, gallery, about, and contact pages.
- Implement room/facility read APIs and enquiries.
- Add optimized Supabase-hosted images and metadata for SEO.

Exit criterion: a visitor can browse the full catalog and submit a validated enquiry.

### Phase 3 - Availability and customer booking

- Implement date/capacity filtering and overlap-safe booking logic.
- Build booking form, price calculation display, confirmation page, and account booking history.
- Add profile editing and cancellation rules.
- Record booking status history.

Exit criterion: two concurrent requests cannot book the same room for overlapping dates, and customers can access only their own records.

### Phase 4 - Administrator application

- Implement room category, room, facility, and image management.
- Implement booking and enquiry queues with search, filters, pagination, and status changes.
- Add user lookup and dashboard summaries.

Exit criterion: an administrator can operate the MVP without editing the database manually.

### Phase 5 - Reports and hardening

- Add occupancy and revenue reports using booking snapshots.
- Complete unit, integration, RLS, concurrency, and end-to-end coverage.
- Add rate limiting, secure headers, CORS allowlist, upload validation, observability, and backup/restore documentation.
- Run accessibility, responsive-layout, performance, and production-build checks.

Exit criterion: all release checks pass and a staging deployment completes the principal user journeys.

### Phase 6 - Optional payments

- Select a payment gateway.
- Add payment intent/order creation, signed webhook handling, idempotency, reconciliation, refunds, and failure recovery.
- Never store raw card details.

## 12. Test strategy

### Backend tests

- Authentication and role enforcement
- Pydantic validation and consistent error responses
- Price/night calculation
- Date-boundary and timezone behavior
- Overlap detection and concurrent booking attempts
- Booking status-transition rules
- RLS behavior for anonymous, customer, and admin identities
- Storage authorization

### Frontend tests

- Form validation and accessible error messages
- Authentication redirects
- Search/filter state in the URL
- Booking price summary
- Loading, empty, success, and API-error states
- Admin tables and status workflows

### End-to-end critical paths

1. Register -> verify -> sign in -> browse -> book -> view booking -> cancel.
2. Admin signs in -> creates a category/room -> uploads an image -> confirms a booking.
3. Two users attempt overlapping bookings; only one succeeds.
4. Customer attempts to access another customer's booking and an admin page; both are denied.

## 13. Security and production checklist

- Secrets exist only in environment configuration.
- Supabase secret/service-role key is backend-only.
- CORS allows only known frontend origins.
- JWT signature and claims are verified on every protected API request.
- Authorization is checked in FastAPI and reinforced by RLS.
- SQL is parameterized through SQLAlchemy.
- Uploads have type/size limits and safe generated paths.
- Logs do not contain passwords, tokens, or sensitive guest data.
- Rate limits cover authentication-adjacent and enquiry endpoints.
- Booking writes are transactional and idempotency-ready.
- Security headers, HTTPS, database backups, migration rollback, and recovery steps are documented.
- Dependency and production-build checks run in CI.

## 14. MVP definition of done

The MVP is complete when:

- Visitors can browse rooms and see date-based availability.
- Customers can complete all authentication flows.
- Authenticated customers can create, view, and cancel their own bookings.
- Double booking is prevented at both application and database levels.
- Administrators can manage inventory, facilities, images, bookings, and enquiries.
- Dashboard summary and basic occupancy/revenue reports work.
- RLS and API authorization tests prove tenant/user isolation.
- The application passes lint, type checking, backend tests, frontend tests, E2E smoke tests, and production builds.
- Setup, architecture, API, schema, and deployment instructions are current.

## 15. Recommended execution order

Start with Phase 0, then build one thin vertical slice before expanding the UI:

1. Authenticated user
2. Seeded room visible in the catalog
3. Availability endpoint
4. Transactional booking creation
5. Booking visible to its owner
6. Booking visible and manageable by an administrator

This validates the riskiest integration boundaries early: Next.js session handling, bearer-token verification in FastAPI, Supabase RLS, and concurrency-safe PostgreSQL booking logic.
