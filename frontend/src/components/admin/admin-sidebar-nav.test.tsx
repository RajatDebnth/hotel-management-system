import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSidebarNav } from "./admin-sidebar-nav";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("AdminSidebarNav", () => {
  afterEach(cleanup);

  beforeEach(() => {
    usePathname.mockReset();
  });

  it("marks only the overview link active on the admin root", () => {
    usePathname.mockReturnValue("/admin");
    render(<AdminSidebarNav />);

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Rooms & inventory" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Reservations" })).not.toHaveAttribute("aria-current");
  });

  it("keeps a section active on its nested routes", () => {
    usePathname.mockReturnValue("/admin/inventory/category/new");
    render(<AdminSidebarNav />);

    expect(screen.getByRole("link", { name: "Rooms & inventory" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });
});
