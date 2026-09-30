export type AvailabilitySearchValues = {
  checkIn: string;
  checkOut: string;
  guests: number;
};

export type AvailabilitySearchResult =
  | { href: string }
  | { error: string };

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function availabilitySearch(
  { checkIn, checkOut, guests }: AvailabilitySearchValues,
  today: string,
): AvailabilitySearchResult {
  if (!checkIn || !checkOut) return { error: "Choose both check-in and check-out dates." };
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut)) return { error: "Choose valid calendar dates." };
  if (checkIn < today) return { error: "Check-in cannot be in the past." };
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };
  if (!Number.isInteger(guests) || guests < 1 || guests > 6) return { error: "Choose between 1 and 6 guests." };

  const params = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    guests: String(guests),
  });
  return { href: `/rooms?${params}` };
}
