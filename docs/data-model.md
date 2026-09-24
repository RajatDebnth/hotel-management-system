# Local data model

## Conventions

- SQLite text UUIDs are used as public identifiers.
- ISO date strings represent hotel stay boundaries; timestamps use SQLite UTC `current_timestamp` values.
- Monetary values are stored as integer paise and converted to exact `Decimal` values at the API boundary.
- Foreign keys are enabled for every connection. Mutable records carry `created_at` and `updated_at`.
- `PRAGMA user_version` tracks the local schema version.

## Relationships

```text
profiles 1---* bookings *---1 rooms *---1 room_categories
    |                 |
    |                 +---* booking_status_history
    +---* enquiries
    +---* assigned enquiries

room_categories *---* facilities (room_category_facilities)
rooms/categories 1---* room_images
```

## Tables

- `profiles`: local email/password identity, contact details, trusted role, and activation state.
- `room_categories`: public room product, capacity, bed, size, and base nightly price.
- `rooms`: individually reservable physical inventory.
- `facilities`: reusable amenities joined to categories.
- `room_images`: confined local paths and presentation metadata owned by one room or category.
- `bookings`: dates, assigned room, guest details, immutable price snapshot, status, and cancellation data.
- `booking_status_history`: audit trail for booking lifecycle changes.
- `enquiries`: public/customer messages plus administrator workflow fields.

## Double-booking protection

Booking dates use half-open ranges: `[check_in, check_out)`. Pending, confirmed, and checked-in reservations block the same room; cancelled, rejected, and checked-out records do not. This permits back-to-back stays where one checkout equals the next check-in.

FastAPI checks availability and assigns a physical room inside a serialized `BEGIN IMMEDIATE` transaction. SQLite insert/update triggers independently reject overlapping active bookings, so concurrent requests cannot bypass the rule.

## Authorization

Authorization is enforced in FastAPI using the authenticated profile loaded from SQLite. Customers can access only their own profile and bookings. Administrators receive separate inventory, operations, reporting, and role-management permissions. Role, price, room assignment, and lifecycle state are never trusted from browser identity claims.

## Schema and seed lifecycle

`backend/app/db/schema.py` owns versioned initialization and idempotent demo seeds. Startup applies supported upgrades, ensures catalog records and demo media exist, and creates the first local administrator only when needed. Step 24 adds explicit reset/export/import commands; direct manual edits to the database are not the normal workflow.
