# Public API

The FastAPI OpenAPI document is available at `http://localhost:8000/openapi.json` and the interactive development documentation at `http://localhost:8000/docs`.

## Catalog

- `GET /api/v1/catalog/rooms` lists active room categories. Query parameters: `page` (minimum 1), `page_size` (1–100), and optional `q` (name/description search).
- The room list also accepts paired `check_in`/`check_out` dates, `guests`, `category`, `min_price`, and `max_price`. When dates are supplied, unavailable categories are omitted and counts include only non-overlapping active rooms.
- `GET /api/v1/catalog/availability` requires `check_in`, `check_out`, and `guests` and returns canonical night count plus available categories.
- `GET /api/v1/catalog/rooms/{slug}` returns an active category with its active facilities, public images, price, capacity, and active physical-room count.
- `GET /api/v1/catalog/facilities` lists active facilities.

Public catalog queries always filter inactive categories, rooms, and facilities. Storage responses expose public object URLs, not privileged Storage credentials.

Checkout is exclusive: a booking ending on another booking's check-in date does not overlap. Pending, confirmed, and checked-in reservations block inventory; cancelled, rejected, and checked-out records do not. Check-in cannot be in the past, checkout must follow check-in, and the MVP maximum stay is 30 nights.

## Enquiries

- `POST /api/v1/enquiries` accepts name, email, optional phone, subject, and message and returns `201 Created`.
- Fields are length-limited and normalized. Invalid email, blank required content, or a populated `website` bot-trap field returns `422`.
- A valid Supabase bearer token associates the enquiry with that user. Anonymous submission is supported; an invalid supplied token is rejected.

The endpoint has a per-process sliding-window rate limit (five attempts per minute by default). Production deployments with multiple workers must also configure a shared edge/WAF limit. Database constraints remain the final validation boundary.

## Response security

API responses include a validated or generated `X-Request-ID`, `Cache-Control: no-store`, MIME-sniffing, framing, referrer, and browser-permission protections. Unexpected errors return a generic message plus the request ID; server logs contain the corresponding ID without request bodies, credentials, or tokens. CORS accepts only the configured frontend origin and explicit methods/headers.

## Frontend contract

Run the backend, then regenerate TypeScript definitions after changing an API schema:

```powershell
cd frontend
npm run generate:api
```

The generated `src/lib/api-schema.d.ts` is versioned, and `src/lib/api.ts` derives its catalog types from that schema.
