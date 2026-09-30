import { describe, expect, it } from "vitest";

import { availabilitySearch } from "./availability-search";

describe("availabilitySearch", () => {
  it("builds the live room-results query from a valid stay", () => {
    expect(availabilitySearch({
      checkIn: "2026-10-15",
      checkOut: "2026-10-18",
      guests: 3,
    }, "2026-10-01")).toEqual({
      href: "/rooms?check_in=2026-10-15&check_out=2026-10-18&guests=3",
    });
  });

  it("requires a complete future date range", () => {
    expect(availabilitySearch({ checkIn: "", checkOut: "", guests: 2 }, "2026-10-01")).toEqual({
      error: "Choose both check-in and check-out dates.",
    });
    expect(availabilitySearch({ checkIn: "2026-09-30", checkOut: "2026-10-02", guests: 2 }, "2026-10-01")).toEqual({
      error: "Check-in cannot be in the past.",
    });
    expect(availabilitySearch({ checkIn: "2026-10-03", checkOut: "2026-10-03", guests: 2 }, "2026-10-01")).toEqual({
      error: "Check-out must be after check-in.",
    });
  });

  it("rejects invalid calendar dates and party sizes", () => {
    expect(availabilitySearch({ checkIn: "2026-02-30", checkOut: "2026-03-02", guests: 2 }, "2026-01-01")).toEqual({
      error: "Choose valid calendar dates.",
    });
    expect(availabilitySearch({ checkIn: "2026-10-03", checkOut: "2026-10-05", guests: 7 }, "2026-10-01")).toEqual({
      error: "Choose between 1 and 6 guests.",
    });
  });
});
