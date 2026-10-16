import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
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
    expect(screen.getAllByRole("link", { name: "Home" })[0]).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Rooms" })[0]).toHaveAttribute("href", "/rooms");
    expect(screen.getAllByRole("link", { name: "Contact" })[0]).toHaveAttribute("href", "/contact");
    expect(screen.getByLabelText("Check in")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Check out")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Guests")).toHaveValue("2");
    expect(screen.getByRole("button", { name: /check availability/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /heritage character, made effortless/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /comfort, considered/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Breakfast table" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /read our story/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /from available room to confirmed stay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /a closer look at the house/i })).not.toBeInTheDocument();
  });
});
