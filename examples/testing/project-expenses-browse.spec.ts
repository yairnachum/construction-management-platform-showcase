// Sanitized Playwright example extracted from the private production test suite.
// It demonstrates pagination, search, filtering, URL state and edge-case coverage.

import { test, expect } from "@playwright/test";

test.describe("project expense browsing", () => {
  const projectId = "demo-project";

  test("pages beyond the first result set while keeping the total count stable", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("tab", { name: "הוצאות" }).click();

    await expect(page.getByRole("heading", { name: /הוצאות · 26/ })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(25);

    await page.getByRole("button", { name: "הבא" }).click();

    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /הוצאות · 26/ })).toBeVisible();
    await expect(page).toHaveURL(/exp_page=2/);
  });

  test("preserves search focus while URL state updates", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("tab", { name: "הוצאות" }).click();

    const search = page.getByLabel("חיפוש");
    await search.click();
    await search.pressSequentially("ספק", { delay: 100 });

    await page.waitForURL(/exp_q=/);
    await expect(search).toBeFocused();
    await expect(page.getByRole("tab", { name: "הוצאות" }))
      .toHaveAttribute("data-state", "active");
  });

  test("handles special characters in the search query", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("tab", { name: "הוצאות" }).click();

    await page.getByLabel("חיפוש").fill("a,b(c)");
    await expect(page.getByText("לא נמצאו הוצאות התואמות לסינון")).toBeVisible();
  });

  test("keeps concurrent filter state when a debounced search fires", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("tab", { name: "הוצאות" }).click();

    await page.getByLabel("חיפוש").fill("ספק");
    await page.getByLabel("שורת תקציב").selectOption("demo-line-id");

    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/exp_q=/);
    await expect(page).toHaveURL(/exp_bl=demo-line-id/);
  });

  test("a filtered URL survives reload", async ({ page }) => {
    await page.goto(`/projects/${projectId}?tab=expenses&exp_bl=demo-line-id`);
    await page.reload();

    await expect(page.getByRole("tab", { name: "הוצאות" }))
      .toHaveAttribute("data-state", "active");
  });
});
