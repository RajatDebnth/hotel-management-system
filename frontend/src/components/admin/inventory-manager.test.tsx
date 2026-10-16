import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminInventory } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    deleteAdminRecord: vi.fn(),
    saveAdminRecord: vi.fn(),
    updateAdminImage: vi.fn(),
    uploadAdminImage: vi.fn(),
  };
});

import { InventoryManager } from "./inventory-manager";

const inventory = {
  categories: [{ id: "category-1", name: "Deluxe King", facility_ids: [], is_active: true }],
  rooms: [{ id: "room-1", room_number: "101", category_id: "category-1", category_name: "Deluxe King", floor: 1, description: "Lobby room", status: "active" }],
  facilities: [],
  images: [],
} as unknown as AdminInventory;

describe("InventoryManager room image controls", () => {
  it("keeps images inside the selected physical room", () => {
    render(<InventoryManager inventory={inventory} />);

    fireEvent.click(screen.getByRole("tab", { name: "Rooms" }));
    fireEvent.click(screen.getByText("Room 101"));

    expect(screen.getByRole("heading", { name: "Images for room 101" })).toBeVisible();
    expect(screen.getByLabelText("Image file")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Upload room image" })).toBeEnabled();
  });
});
