import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getRooms: vi.fn().mockRejectedValue(new Error("API unavailable")),
  getFacilities: vi.fn().mockRejectedValue(new Error("API unavailable")),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

import Home from "./page";

describe("Home", () => {
  it("presents the hotel and its simplified navigation", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { name: "Stay somewhere with a story." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Book Your Stay" })[0]).toHaveAttribute("href", "/rooms");
    expect(screen.getAllByRole("link", { name: "Home" })[0]).toHaveAttribute("href", "/#home");
    expect(screen.getAllByRole("link", { name: "Gallery" })[0]).toHaveAttribute("href", "/#gallery");
    expect(screen.getAllByRole("link", { name: "Contact" })[0]).toHaveAttribute("href", "/#contact");
    expect(screen.getByLabelText("Check in")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Check out")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Guests")).toHaveValue("2");
    expect(screen.getByRole("button", { name: /check availability/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /from available room to confirmed stay/i })).toBeVisible();
    expect(screen.getByText(/room details are taking a short break/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Breakfast table" })).toBeVisible();
    expect(screen.getAllByRole("img", { name: /Deluxe King room with a king bed/i })).toHaveLength(2);
  });
});
