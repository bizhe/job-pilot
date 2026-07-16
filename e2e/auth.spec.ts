import { expect, test } from "@playwright/test";

test.describe("auth smoke flow", () => {
  test("shows the OAuth choices on login, covers: AC-1", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with github/i }),
    ).toBeVisible();
  });

  test("sends an unauthenticated dashboard visitor back to login, covers: AC-3", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeVisible();
  });
});
