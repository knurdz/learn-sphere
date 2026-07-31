import { expect, test } from "@playwright/test";

test("landing page explains the student workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/LearnSphere/);
  await expect(
    page.getByRole("heading", { name: /learn with more clarity/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /create student account/i })).toBeVisible();
});
