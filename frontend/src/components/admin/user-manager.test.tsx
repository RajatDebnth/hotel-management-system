import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUser } from "@/lib/api";

const apiMocks = vi.hoisted(() => ({
  createAdministrator: vi.fn().mockResolvedValue({}),
  updateAdminUserRole: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/api", () => apiMocks);

import { UserManager } from "./user-manager";

const users = [
  { id: "admin-1", email: "owner@example.com", full_name: "Hotel Owner", role: "admin", is_active: true },
  { id: "admin-2", email: "manager@example.com", full_name: "Hotel Manager", role: "admin", is_active: true },
  { id: "visitor-1", email: "guest@example.com", full_name: "Aarav Sharma", role: "customer", is_active: true },
] as AdminUser[];

describe("UserManager", () => {
  it("keeps visitor records out of access management and creates administrators separately", async () => {
    render(<UserManager users={users} currentUserId="admin-1" />);

    expect(screen.queryByRole("button", { name: "Make administrator" })).not.toBeInTheDocument();
    expect(screen.queryByText("Aarav Sharma")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove administrator access" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Front Office Manager" } });
    fireEvent.change(screen.getByLabelText("Staff email"), { target: { value: "frontoffice@example.com" } });
    fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: "FrontOfficePassword!45" } });
    fireEvent.click(screen.getByRole("button", { name: "Create administrator" }));

    await waitFor(() => expect(apiMocks.createAdministrator).toHaveBeenCalledWith({
      full_name: "Front Office Manager",
      email: "frontoffice@example.com",
      password: "FrontOfficePassword!45",
    }));
  });
});
