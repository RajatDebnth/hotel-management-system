# Operational report definitions

All report ranges use `[start_date, end_date)` semantics: the start date is included and the end
date is excluded. A request may cover at most 366 nights.

## Dashboard

- **Total active rooms:** physical rooms whose current inventory status is `active`.
- **Occupied today:** distinct active rooms covered today by a `confirmed`, `checked_in`, or
  `checked_out` booking.
- **Arrivals:** `confirmed` or `checked_in` bookings whose check-in is the dashboard date.
- **Departures:** `checked_in` or `checked_out` bookings whose checkout is the dashboard date.
- **Pending bookings:** all reservations currently waiting for confirmation.
- **Open enquiries:** enquiries in `new` or `in_progress` status.

## Occupancy

Only `confirmed`, `checked_in`, and `checked_out` reservations count as occupied room-nights.
Pending, rejected, and cancelled reservations are excluded. Available room-nights equal the number
of currently active physical rooms multiplied by the number of report nights. Occupancy percentage
is `occupied room-nights / available room-nights × 100`, rounded to two decimal places. An empty
inventory reports 0%, avoiding division by zero.

## Booked revenue

Booked revenue uses each included reservation's immutable `price_per_night` snapshot for every
overlapping night. It includes `confirmed`, `checked_in`, and `checked_out` reservations and excludes
pending, rejected, and cancelled reservations. This is a booking-value report, not cash accounting:
the MVP has no payment, refund, or settlement ledger.
