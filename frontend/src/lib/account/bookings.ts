import type { Booking } from "@/lib/api";

export type StayGroups = {
  active: Booking[];
  upcoming: Booking[];
  past: Booking[];
};

const upcomingStatuses = new Set(["pending", "confirmed"]);

export function groupStays(bookings: Booking[], today = new Date().toISOString().slice(0, 10)): StayGroups {
  const groups: StayGroups = { active: [], upcoming: [], past: [] };

  for (const booking of bookings) {
    if (booking.status === "checked_in") {
      groups.active.push(booking);
    } else if (upcomingStatuses.has(booking.status) && booking.check_out > today) {
      groups.upcoming.push(booking);
    } else {
      groups.past.push(booking);
    }
  }

  groups.active.sort((left, right) => left.check_out.localeCompare(right.check_out));
  groups.upcoming.sort((left, right) => left.check_in.localeCompare(right.check_in));
  groups.past.sort((left, right) => right.check_out.localeCompare(left.check_out));
  return groups;
}
