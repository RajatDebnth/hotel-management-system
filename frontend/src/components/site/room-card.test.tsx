import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogRoom } from "@/lib/api";

import { RoomCard } from "./room-card";

const room = {
  slug: "deluxe-king",
  name: "Deluxe King",
  description: "A spacious king room.",
  base_price: "5200.00",
  max_guests: 2,
  bed_type: "King",
  room_size_sq_m: "32.00",
  available_room_count: 3,
  images: [{
    id: "image-1",
    url: "http://localhost:8000/media/demo/deluxe-king.png",
    alt_text: "Deluxe King room photograph",
    sort_order: 0,
    is_cover: true,
  }],
} as unknown as CatalogRoom;

describe("RoomCard", () => {
  it("renders the stored media URL directly without the Next image optimizer", () => {
    render(<RoomCard room={room} />);

    expect(screen.getByRole("img", { name: "Deluxe King room photograph" })).toHaveAttribute(
      "src",
      "http://localhost:8000/media/demo/deluxe-king.png",
    );
  });
});
