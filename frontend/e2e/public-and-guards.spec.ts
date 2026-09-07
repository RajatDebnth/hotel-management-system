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
