import { expect, test } from "@playwright/test";

test("public journey has no horizontal overflow and exposes core navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Aurelia House/);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("link", { name: /rooms/i }).first()).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("anonymous customer and admin routes redirect to login without losing destination", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("login form is keyboard-addressable and labelled", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("customer can register, change password, sign out, and sign back in", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `customer-${Date.now()}-${test.info().project.name}@example.com`;
  const initialPassword = "LocalCustomer!234";
  const changedPassword = "ChangedCustomer!567";

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Local Test Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(initialPassword);
  await page.getByLabel("Confirm password").fill(initialPassword);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /welcome, local test customer/i })).toBeVisible();

  await page.getByLabel("Phone").fill("9876543210");
  await page.getByRole("button", { name: /save profile/i }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible({ timeout: 45_000 });

  await page.getByLabel("Current password").fill(initialPassword);
  await page.getByLabel("New password", { exact: true }).fill(changedPassword);
  await page.getByLabel("Confirm new password").fill(changedPassword);
  await page.getByRole("button", { name: /update password/i }).click();
  await expect(page.getByText("Password updated successfully.")).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 45_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(changedPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 45_000 });

  const roomSlug = test.info().project.name.includes("mobile") ? "deluxe-king" : "garden-twin";
  const checkIn = new Date();
  checkIn.setUTCDate(checkIn.getUTCDate() + 30 + (Date.now() % 3000));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);
  await page.goto(`/book/${roomSlug}`);
  await page.getByLabel("Check-in").fill(checkIn.toISOString().slice(0, 10));
  await page.getByLabel("Check-out").fill(checkOut.toISOString().slice(0, 10));
  await page.getByLabel("Guest name").fill("Local Test Customer");
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByRole("button", { name: /request reservation/i }).click();
  await expect(page.getByRole("heading", { name: /pending confirmation/i })).toBeVisible();
  await page.getByRole("link", { name: /go to my account/i }).click();
  await page.locator('a[href^="/account/bookings/"]').first().click();
  await page.getByRole("button", { name: /cancel booking/i }).click();
  await page.getByLabel("Why are you cancelling?").fill("Local browser verification");
  await page.getByRole("button", { name: /confirm cancellation/i }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible({ timeout: 45_000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?message=Administrator\+access\+is\+required\./);
});

test("administrator can manage local user roles", async ({ page }) => {
  test.setTimeout(120_000);
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD to run the local administrator journey.");
  const customerEmail = `role-test-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Role Test Customer");
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password", { exact: true }).fill("RoleCustomer!234");
  await page.getByLabel("Confirm password").fill("RoleCustomer!234");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 45_000 });
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 45_000 });

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 45_000 });
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /users and roles/i })).toBeVisible();

  const customer = page.locator("article").filter({ hasText: customerEmail });
  await customer.getByRole("button", { name: /make administrator/i }).click();
  await expect(customer.getByText(/admin · active/i)).toBeVisible({ timeout: 45_000 });
  await customer.getByRole("button", { name: /make customer/i }).click();
  await expect(customer.getByText(/customer · active/i)).toBeVisible({ timeout: 45_000 });

  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /house overview/i })).toBeVisible();
  await page.getByRole("link", { name: "Inventory" }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /rooms and amenities/i })).toBeVisible();
  await page.getByRole("link", { name: "Operations" }).click();
  await expect(page).toHaveURL(/\/admin\/operations$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /bookings and enquiries/i })).toBeVisible({
    timeout: 45_000,
  });
});
