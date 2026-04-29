import { test, expect } from "@playwright/test";
import { POManager } from "../pageobjects/POManager";

test.describe("Manual Mode - Smoke Tests", () => {
  test("S01 — Manual Mode: Single URL Happy Path @Smoke", async ({ page }) => {
    const poManager = new POManager(page);
    const manualModePage = poManager.getManualModePage();
    const sampleURL = "https://cooleygibsonrealestate.com/";
    await page.goto("/");
    await expect(manualModePage.getHeadingByTitle("purrscope")).toBeVisible();
    await expect(manualModePage.getMascotArea()).toBeVisible();
    await expect(manualModePage.getManualButton()).toHaveClass(/active/i);
    await expect(manualModePage.getManualButton()).toHaveText("Manual_URLs");

    await manualModePage.inputURL(sampleURL);
    await expect(page.getByTestId("url-counter")).toHaveText("1 / 10 URLs");
    await manualModePage.startScan();

    await expect(page.getByTestId("results-table")).toBeVisible();
    await expect(page.getByTestId("results-summary")).toBeVisible();
    await expect(page.getByTestId("results-toolbar")).toBeVisible();
    await expect(page.getByTestId("filter-tabs")).toBeVisible();
    await expect(page.locator("tr[data-testid^='result-row']")).toHaveCount(1);
    await expect(page.locator(`tr[data-testid='result-row-${sampleURL}']`)).toBeVisible();
  });

  test("S02 — Manual Mode: Multiple URLs @Smoke", async ({ page }) => {});
});
