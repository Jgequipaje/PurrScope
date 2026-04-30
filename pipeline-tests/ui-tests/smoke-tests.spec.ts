import test from "@playwright/test";
import { manualModeTest, expect } from "../fixtures/manualModeFixture";

manualModeTest.describe("Manual Mode - Smoke Tests", () => {
  manualModeTest(
    "S01 — Manual Mode: Single URL Happy Path @Smoke",
    async ({ page, manualModePage, tableUtils, sampleURL }) => {
      // ARRANGE: Navigate and verify manual mode selected on default
      await page.goto("/");
      await expect(manualModePage.getManualButton()).toHaveClass(/active/i);

      // ACT: Input URL and scan
      await manualModePage.inputURL(sampleURL);
      await expect(page.getByTestId("url-counter")).toHaveText("1 / 10 URLs");
      await manualModePage.startScan();

      // ASSERT: Verify results table appears with 1 row
      await expect(page.getByTestId("results-table")).toBeVisible();
      await expect(manualModePage.getResultRowLink()).toHaveCount(1);

      // ASSERT: Both Title Status and Description Status show "Pass" (green pills)
      await expect(tableUtils.findOnTable(sampleURL, "Title Status")).toHaveText(/^(Pass|Fail)$/);
      await expect(tableUtils.findOnTable(sampleURL, "Desc. Status")).toHaveText(/^(Pass|Fail)$/);

      // ASSERT: Mascot Bubble Says All pages look great! ✅
      await expect(page.getByText("All pages look great! ✅")).toBeVisible();
    }
  );

  manualModeTest(
    "S02 — Manual Mode: Multiple URLs @Smoke",
    async ({ page, manualModePage, multipleURL, tableUtils }) => {
      // ARRANGE: Navigate and verify manual mode selected on default
      await page.goto("/");
      await expect(manualModePage.getManualButton()).toHaveClass(/active/i);

      // ACT: Input multiple URL and scan
      await manualModePage.inputURL(multipleURL.join("\n"));
      await expect(page.getByTestId("url-counter")).toHaveText(`${multipleURL.length} / 10 URLs`);
      await manualModePage.startScan();

      // ASSERT: Verify results table appears with 3 rows
      await expect(page.getByTestId("results-table")).toBeVisible();
      await expect(manualModePage.getResultRowLink()).toHaveCount(3);

      // ASSERT: Verify each row displays the correct URL
      for (const url of multipleURL) {
        await expect(manualModePage.getResultRowLink(url)).toBeVisible();
      }

      // ASSERT: Both Title Status and Description Status show "Pass" (green pills)
      for (const url of multipleURL) {
        await expect(tableUtils.findOnTable(url, "Title Status")).toHaveText(/^(Pass|Fail)$/);
        await expect(tableUtils.findOnTable(url, "Desc. Status")).toHaveText(/^(Pass|Fail)$/);
      }

      // ASSERT: Mascot Bubble Says All pages look great! or Found some issues to fix
      await expect(
        page.getByText(/^(All pages look great! ✅|Found some issues to fix ⚠️)$/)
      ).toBeVisible();
    }
  );

  test("S03 — Sitemap Mode: Crawl and Discover @Smoke", async () => {});
});
