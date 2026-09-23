import { afterEach, describe, expect, it, vi } from "vitest";

import { getRooms } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("room availability filters", () => {
  it("serializes stay and price filters into the API request", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], page: 1, page_size: 6, total: 0, pages: 0 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRooms({
      pageSize: 6,
      checkIn: "2026-10-10",
      checkOut: "2026-10-12",
      guests: 3,
      minPrice: 4000,
      maxPrice: 8000,
      category: "family-suite",
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "1",
      page_size: "6",
      check_in: "2026-10-10",
      check_out: "2026-10-12",
      guests: "3",
      min_price: "4000",
      max_price: "8000",
      category: "family-suite",
    });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });
});
