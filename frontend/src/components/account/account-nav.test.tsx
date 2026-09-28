import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountNav } from "./account-nav";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("AccountNav", () => {
  afterEach(cleanup);

  beforeEach(() => {
    usePathname.mockReset();
  });

  it("marks only overview active on the account root", () => {
    usePathname.mockReturnValue("/account");
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Previous stays" })).not.toHaveAttribute("aria-current");
  });

  it("marks the matching dedicated page active", () => {
    usePathname.mockReturnValue("/account/security");
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Password & security" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("keeps stay history active while viewing a booking", () => {
    usePathname.mockReturnValue("/account/bookings/HMS-1234");
    render(<AccountNav />);

    expect(screen.getByRole("link", { name: "Previous stays" })).toHaveAttribute("aria-current", "page");
  });
});
