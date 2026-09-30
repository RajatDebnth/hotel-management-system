import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
}

test("public journey has no horizontal overflow and exposes core navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Aurelia House/);
  await expect(page.getByRole("main")).toBeVisible();
  const mainNavigation = page.getByRole("navigation", { name: "Main navigation" });
  const desktopNavigationVisible = await mainNavigation.isVisible();
  if (!desktopNavigationVisible) await page.locator("summary[aria-label='Open navigation']").click();
  const navigation = desktopNavigationVisible
    ? mainNavigation
    : page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Gallery", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Book Your Stay", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /a closer look at the house/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /let.s make your stay feel easy/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const checkIn = new Date();
  checkIn.setUTCDate(checkIn.getUTCDate() + 45);
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 3);
  const checkInValue = checkIn.toISOString().slice(0, 10);
  const checkOutValue = checkOut.toISOString().slice(0, 10);
  await page.getByLabel("Check in").fill(checkInValue);
  await page.getByLabel("Check out").fill(checkOutValue);
  await page.getByLabel("Guests").selectOption("2");
  await page.getByRole("button", { name: /check availability/i }).click();
  await expect(page).toHaveURL(new RegExp(`/rooms\\?check_in=${checkInValue}&check_out=${checkOutValue}&guests=2`));
  await expect(page.getByText("Available for your stay")).toBeVisible();
  await expect(page.getByText(`${checkInValue} → ${checkOutValue}`)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /^View / }).first().click();
  await expect(page).toHaveURL(/\/rooms\/[^/?]+\?check_in=/, { timeout: 45_000 });
  const roomUrl = new URL(page.url());
  expect(roomUrl.searchParams.get("check_in")).toBe(checkInValue);
  expect(roomUrl.searchParams.get("check_out")).toBe(checkOutValue);
  expect(roomUrl.searchParams.get("guests")).toBe("2");
  const reserveLink = page.getByRole("link", { name: "Reserve this room" });
  await expect(reserveLink).toHaveAttribute("href", new RegExp(`check_in=${checkInValue}.*check_out=${checkOutValue}.*guests=2`));
});

test("anonymous customer and admin routes redirect to login without losing destination", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  await page.goto("/account/security");
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

test("customer can use dedicated account pages, book, cancel, and reauthenticate", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `aarav.desai.${Date.now()}.${test.info().project.name}@example.com`;
  const initialPassword = "LocalCustomer!234";
  const changedPassword = "ChangedCustomer!567";

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Aarav Desai");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(initialPassword);
  await page.getByLabel("Confirm password").fill(initialPassword);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  const profileMenu = page.getByRole("button", { name: new RegExp(`open profile menu for ${email}`, "i") });
  await expect(profileMenu).toBeVisible({ timeout: 45_000 });
  await profileMenu.click();
  await page.getByRole("menuitem", { name: "Account overview" }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: /welcome, aarav desai/i })).toBeVisible();
  const accountNavigation = page.getByRole("navigation", { name: "Customer account navigation" });
  await expect(accountNavigation.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);

  await accountNavigation.getByRole("link", { name: "Personal details", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/details$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await expect(accountNavigation.getByRole("link", { name: "Personal details", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByRole("button", { name: /save profile/i }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible({ timeout: 45_000 });

  await accountNavigation.getByRole("link", { name: "Password & security", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/security$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Password & security" })).toBeVisible();
  await expect(accountNavigation.getByRole("link", { name: "Password & security", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Current password").fill(initialPassword);
  await page.getByLabel("New password", { exact: true }).fill(changedPassword);
  await page.getByLabel("Confirm new password").fill(changedPassword);
  await page.getByRole("button", { name: /update password/i }).click();
  await expect(page.getByText("Password updated successfully.")).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 45_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(changedPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  const restoredProfileMenu = page.getByRole("button", { name: new RegExp(`open profile menu for ${email}`, "i") });
  await expect(restoredProfileMenu).toBeVisible({ timeout: 45_000 });
  await restoredProfileMenu.click();
  await page.getByRole("menuitem", { name: "Previous stays" }).click();
  await expect(page).toHaveURL(/\/account\/stays$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Previous stays" })).toBeVisible();

  const roomSlug = test.info().project.name.includes("mobile") ? "deluxe-king" : "garden-twin";
  const checkIn = new Date();
  checkIn.setUTCDate(checkIn.getUTCDate() + 30 + (Date.now() % 3000));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);
  await page.goto(`/book/${roomSlug}`);
  await page.getByLabel("Check-in").fill(checkIn.toISOString().slice(0, 10));
  await page.getByLabel("Check-out").fill(checkOut.toISOString().slice(0, 10));
  await page.getByLabel("Guest name").fill("Aarav Desai");
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByRole("button", { name: /request reservation/i }).click();
  await expect(page.getByRole("heading", { name: /pending confirmation/i })).toBeVisible();
  await page.getByRole("link", { name: /go to my account/i }).click();
  await accountNavigation.getByRole("link", { name: "Previous stays", exact: true }).click();
  await expect(accountNavigation.getByRole("link", { name: "Previous stays", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await page.locator('a[href^="/account/bookings/"]').first().click();
  await expect(accountNavigation.getByRole("link", { name: "Previous stays", exact: true })).toHaveAttribute("aria-current", "page");
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: /cancel booking/i }).click();
  await page
    .getByLabel("Why are you cancelling?")
    .fill("Travel itinerary changed after the airline rescheduled the return flight.");
  await page.getByRole("button", { name: /confirm cancellation/i }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible({ timeout: 45_000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?message=Administrator\+access\+is\+required\./);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
});

test("administrator can manage local user roles", async ({ page }) => {
  test.setTimeout(120_000);
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD to run the local administrator journey.");
  const customerEmail = `neha.kapoor.${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Neha Kapoor");
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password", { exact: true }).fill("RoleCustomer!234");
  await page.getByLabel("Confirm password").fill("RoleCustomer!234");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  await page.getByRole("button", { name: new RegExp(`open profile menu for ${customerEmail}`, "i") }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 45_000 });

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/, { timeout: 45_000 });
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

  await page.goto("/account");
  await expect(page).toHaveURL(/\/admin\?message=Customer\+accounts\+are\+restricted\+to\+visitors\./);
  await page.goto("/book/deluxe-king");
  await expect(page).toHaveURL(/\/admin\?message=Reservations\+must\+be\+created\+from\+a\+visitor\+account\./);
  await page.getByRole("link", { name: "Security" }).click();
  await expect(page).toHaveURL(/\/admin\/security$/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
});
