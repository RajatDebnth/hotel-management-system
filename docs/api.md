# Local API

FastAPI runs at `http://localhost:8000`. The OpenAPI document is at `/openapi.json`; interactive documentation is available at `/docs` in development.

## Authentication

- `POST /api/v1/auth/register` creates a customer and session.
- `POST /api/v1/auth/login` creates a session.
- `POST /api/v1/auth/logout` clears the session.
- `POST /api/v1/auth/password` changes the authenticated user's password.
- `GET /api/v1/auth/me` returns the current identity.
- `GET /api/v1/auth/admin-check` validates administrator access.

Authentication uses the HttpOnly `hms_session` cookie. Browser requests must use credentials. Unsafe cookie-authenticated requests are accepted only from the configured frontend origin.

## Catalog and availability

- `GET /api/v1/catalog/rooms` lists active categories with pagination and optional search, dates, guests, category, and price filters.
- `GET /api/v1/catalog/availability` returns canonical night count and available categories.
- `GET /api/v1/catalog/rooms/{slug}` returns category, facilities, local media URLs, price, capacity, and active room count.
- `GET /api/v1/catalog/facilities` lists active facilities.

Checkout is exclusive. Pending, confirmed, and checked-in bookings block inventory. Check-in cannot be in the past, checkout must follow check-in, and stays are limited to 30 nights.

## Customer operations

- `GET/PATCH /api/v1/me` reads or updates the authenticated profile.
- `POST/GET /api/v1/bookings` creates or lists the customer's bookings.
- `GET /api/v1/bookings/{reference}` returns an owned booking.
- `POST /api/v1/bookings/{reference}/cancel` cancels an eligible future booking.
- `POST /api/v1/enquiries` accepts public or authenticated enquiries.

FastAPI calculates pricing, assigns rooms, and derives identity from the session. The browser cannot supply trusted price, owner, role, or status fields.

## Administrator operations

Routes under `/api/v1/admin` cover inventory and media, booking/enquiry queues and transitions, dashboard/reports, administrator options, user listing, and role changes. Every route performs server-side administrator authorization. An administrator cannot change their own role, and the final active administrator cannot be removed.

## Media, errors, and contract generation

Validated local media is served under `/media/{path}`. API responses include request IDs and security/no-store headers. Unexpected failures return a generic response correlated with structured server logs.

After changing API schemas, run the backend and regenerate the versioned frontend contract:

```powershell
cd frontend
npm run generate:api
```
