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
  };
});

import { InventoryManager } from "./inventory-manager";

const inventory = {
  categories: [{ id: "category-1", name: "Deluxe King" }],
  rooms: [],
  facilities: [],
  images: [],
} as unknown as AdminInventory;

describe("InventoryManager image controls", () => {
  it("keeps the upload interface visible but unavailable", () => {
    render(<InventoryManager inventory={inventory} />);

    fireEvent.click(screen.getByRole("tab", { name: "images" }));

    expect(screen.getByText("Image upload is currently not available.")).toBeVisible();
    expect(screen.getByLabelText("Image")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Image upload unavailable" })).toBeDisabled();
  });
});
