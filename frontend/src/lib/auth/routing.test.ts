import { describe, expect, it } from "vitest";

import { destinationForRole } from "./routing";

describe("destinationForRole", () => {
  it("routes administrators only into the administrator workspace", () => {
    expect(destinationForRole("admin", "")).toBe("/admin");
    expect(destinationForRole("admin", "/account")).toBe("/admin");
    expect(destinationForRole("admin", "/book/garden-twin")).toBe("/admin");
    expect(destinationForRole("admin", "/admin/operations?booking_status=pending")).toBe(
      "/admin/operations?booking_status=pending",
    );
  });

  it("routes customers only into customer-owned workflows", () => {
    expect(destinationForRole("customer", "")).toBe("/");
    expect(destinationForRole("customer", "/admin")).toBe("/");
    expect(destinationForRole("customer", "//outside.example")).toBe("/");
    expect(destinationForRole("customer", "/account/stays")).toBe("/account/stays");
    expect(destinationForRole("customer", "/book/deluxe-king")).toBe("/book/deluxe-king");
  });
});
