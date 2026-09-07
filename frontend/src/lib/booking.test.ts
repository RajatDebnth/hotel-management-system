import { describe, expect, it } from "vitest";

import { bookingSummary } from "@/lib/booking";

describe("bookingSummary", () => {
  it("uses checkout-exclusive night and price calculations", () => {
    expect(bookingSummary(5200, "2026-09-14", "2026-09-16")).toEqual({
      nights: 2, subtotal: 10400, tax: 0, total: 10400,
    });
  });

  it("does not quote invalid or incomplete date ranges", () => {
    expect(bookingSummary(5200, "2026-09-16", "2026-09-14").nights).toBe(0);
    expect(bookingSummary(5200, "", "2026-09-14").total).toBe(0);
  });
});
