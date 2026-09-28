import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

describe("SiteHeader", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    usePathname.mockReset();
    usePathname.mockReturnValue("/");
  });

  it("shows sign in when no visitor session exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<SiteHeader />);

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /open profile menu/i })).not.toBeInTheDocument();
  });

  it("replaces sign in with the customer profile menu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: "aarav.desai@example.com", role: "customer" }),
    }));
    render(<SiteHeader />);

    const trigger = await screen.findByRole("button", { name: /open profile menu for aarav.desai@example.com/i });
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Profile menu" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Account overview" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: "Previous stays" })).toHaveAttribute("href", "/account#stays");
    expect(screen.getByRole("menuitem", { name: "Personal details" })).toHaveAttribute("href", "/account#profile");
    expect(screen.getByRole("menuitem", { name: "Password & security" })).toHaveAttribute("href", "/account#security");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  });

  it("shows administrator destinations instead of customer account links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: "admin@example.com", role: "admin" }),
    }));
    render(<SiteHeader />);

    fireEvent.click(await screen.findByRole("button", { name: /open profile menu for admin@example.com/i }));
    expect(screen.getByRole("menuitem", { name: "Admin dashboard" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("menuitem", { name: "Security" })).toHaveAttribute("href", "/admin/security");
    expect(screen.queryByRole("menuitem", { name: "Account overview" })).not.toBeInTheDocument();
  });
});
