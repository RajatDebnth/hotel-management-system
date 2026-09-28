# Local architecture

The application is a two-process local system with no hosted runtime dependency.

```text
Browser
  |
  | http://localhost:3000
  v
Next.js frontend
  |
  | JSON + multipart requests, hms_session cookie
  v
FastAPI http://localhost:8000
  |-- SQLite: backend/data/hms.db
  |-- media:  backend/data/uploads/
  `-- key:    backend/data/.session-key
```

## Responsibilities

- Next.js owns rendering, navigation, forms, route guards, and user-facing state.
- FastAPI owns identity, authorization, availability, pricing, booking allocation, status transitions, inventory mutations, reports, and file validation.
- SQLite is the only application data store. Foreign keys, checks, unique indexes, serialized write transactions, and overlap triggers enforce persistent invariants.
- Local filesystem storage owns uploaded room images. FastAPI validates content and coordinates file/database changes with compensating cleanup.

## Authentication and authorization

FastAPI hashes passwords with PBKDF2-HMAC-SHA256 and signs eight-hour local session tokens. The token is stored in an HttpOnly, SameSite=Lax `hms_session` cookie. Protected endpoints load the current database role for every request. Customer and administrator checks remain separate; the frontend guard is an early navigation aid, not an authorization boundary.

Successful login selects a role-confined destination: normal customer registration and
login return to `/`, explicit trusted customer account and booking paths resume when
requested, and administrators enter `/admin`. The public header replaces Sign in with a
role-aware profile menu for authenticated sessions. Customer account and booking layouts
reject administrators, the admin layout rejects customers, and protected HTML responses
are private/no-store so logout plus browser Back cannot reveal a previously rendered
workspace.

The customer workspace uses dedicated `/account`, `/account/stays`, `/account/details`,
and `/account/security` routes under one role-checked layout. Booking details remain
nested under `/account/bookings/<reference>` and are treated as part of stay history.
FastAPI ownership checks remain authoritative for profiles, reservations, cancellation,
and password changes.

Cookie-authenticated unsafe requests must carry the configured frontend `Origin`. CORS allows only that exact origin and credentials. The default frontend and API origins are `http://localhost:3000` and `http://localhost:8000`.

## Startup

FastAPI creates directories, initializes or upgrades the versioned SQLite schema, copies demo media, and applies idempotent seed records. If no administrator exists, it creates `admin@example.com` and prints a one-time password. Runtime data and secrets are ignored by Git.

The former hosted architecture is available only through the `supabase-cloud-v1` Git tag; it is not part of the active runtime.
