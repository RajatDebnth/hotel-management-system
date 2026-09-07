# Data model

## Conventions

- UUID primary keys avoid exposing sequential identifiers.
- `timestamptz` stores audit times; hotel stay boundaries use PostgreSQL `date` values.
- Monetary values use `numeric(12,2)`.
- Mutable records carry `created_at` and `updated_at`.
- Database constraints enforce invariants in addition to FastAPI validation.

## Relationships

```text
auth.users 1---1 profiles 1---* bookings *---1 rooms *---1 room_categories
                                      |
                                      +---* booking_status_history

room_categories *---* facilities (through room_category_facilities)
rooms/categories 1---* room_images
profiles 0---* enquiries
profiles 0---* assigned enquiries
```

## Tables

- `profiles`: application identity, contact details, activation state, and trusted role linked to Supabase Auth.
- `room_categories`: public product information, capacity, bed type, size, and base nightly price.
- `rooms`: individually reservable physical inventory.
- `facilities`: reusable amenities attached to categories through a join table.
- `room_images`: storage object paths and presentation metadata belonging to exactly one room or category.
- `bookings`: reservation dates, guest details, immutable price snapshot, lifecycle status, and cancellation data.
- `booking_status_history`: append-only audit trail for reservation transitions.
- `enquiries`: public or authenticated customer messages and administrator workflow state.

## Double-booking protection

The `bookings_no_overlapping_active_dates` GiST exclusion constraint rejects intersecting half-open date ranges (`[check_in, check_out)`) for the same room while either booking is `pending`, `confirmed`, or `checked_in`. This permits a new guest to check in on the prior guest's checkout date and prevents race conditions that an application-only availability check cannot stop.

FastAPI must still perform a friendly availability check before insertion, then translate a database exclusion violation into a domain-level conflict response.

## Authorization model

- Public roles can read active catalog records.
- Authenticated customers can read/update permitted fields of their own profile.
- Customers can read only their own bookings. Booking creation and cancellation are routed through FastAPI so clients cannot forge prices or lifecycle states.
- Public and authenticated visitors can submit enquiries, while authenticated users can read their own.
- Administrator policies use `is_admin()`, a restricted security-definer function that avoids recursive profile policies.
- Column-level grants prevent customers from updating trusted profile fields such as `role` and `is_active`.
- Column-level grants let public users submit only enquiry input fields; workflow state and administrator notes cannot be forged.
- Privileged FastAPI operations use backend-only credentials and still enforce application authorization.

## Migration workflow

After Docker Desktop is installed and running:

```powershell
npx supabase start
npx supabase db reset
npx supabase test db
```

`db reset` recreates the local database, applies migrations in order, and then applies `seed.sql`. Never use development seed data in production.
