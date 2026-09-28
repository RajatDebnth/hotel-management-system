import { describe, expect, it } from "vitest";

import type { Booking } from "@/lib/api";
import { groupStays } from "./bookings";

function booking(reference: string, status: string, checkIn: string, checkOut: string): Booking {
  return {
    id: reference,
    booking_reference: reference,
    room_id: "room-1",
    category_id: "category-1",
    room_number: "201",
    category_name: "Deluxe King",
    check_in: checkIn,
    check_out: checkOut,
    adult_count: 2,
    child_count: 0,
    guest_name: "Aarav Desai",
    guest_email: "aarav.desai@example.com",
    guest_phone: "9876543210",
    price_per_night: "6500.00",
    night_count: 2,
    subtotal: "13000.00",
    tax_amount: "0.00",
    total_amount: "13000.00",
    status,
    special_requests: null,
    created_at: "2026-09-01T10:00:00Z",
  };
}

describe("groupStays", () => {
  it("separates and orders active, upcoming, and past or cancelled stays", () => {
    const groups = groupStays([
      booking("PAST", "checked_out", "2026-08-01", "2026-08-03"),
      booking("LATER", "confirmed", "2026-10-10", "2026-10-12"),
      booking("ACTIVE", "checked_in", "2026-09-27", "2026-09-30"),
      booking("SOON", "pending", "2026-10-02", "2026-10-04"),
      booking("CANCELLED", "cancelled", "2026-11-01", "2026-11-03"),
    ], "2026-09-28");

    expect(groups.active.map((item) => item.booking_reference)).toEqual(["ACTIVE"]);
    expect(groups.upcoming.map((item) => item.booking_reference)).toEqual(["SOON", "LATER"]);
    expect(groups.past.map((item) => item.booking_reference)).toEqual(["CANCELLED", "PAST"]);
  });

  it("treats an expired pending request as past", () => {
    const groups = groupStays([
      booking("EXPIRED", "pending", "2026-09-20", "2026-09-22"),
    ], "2026-09-28");

    expect(groups.upcoming).toHaveLength(0);
    expect(groups.past[0].booking_reference).toBe("EXPIRED");
  });
});
