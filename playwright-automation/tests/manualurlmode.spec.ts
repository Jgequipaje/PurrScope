import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";
import { TEST_URLS } from "../config/testUrls";

test.describe("Manual URL Mode", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate("/");
  });

  test("TC-01: Single URL — all SEO passing", async () => {
    await homePage.enterUrls([TEST_URLS.TC01]);
    await expect(homePage.urlCounter).toContainText("1 / 10 URLs");

    await homePage.clickStartScan();
    await homePage.waitForScanToComplete();

    const titleStatus = await homePage.getTitleStatusPill(0);
    expect(titleStatus.trim()).toBe("Pass");

    const descStatus = await homePage.getDescStatusPill(0);
    expect(descStatus.trim()).toBe("Pass");

    const footer = await homePage.getFooterText();
    expect(footer).toContain("Scan complete — all 1 pages passed.");
  });

  test("TC-02: Single URL — title out of range (Fail)", async () => {
    await homePage.enterUrls([TEST_URLS.TC02]);
    await expect(homePage.urlCounter).toContainText("1 / 10 URLs");

    await homePage.clickStartScan();
    await homePage.waitForResults();

    const titleStatus = await homePage.getTitleStatusPill(0);
    expect(titleStatus.trim()).toBe("Fail");

    const footer = await homePage.getResultsFooter();
    await expect(footer).toContainText("pages need attention");
  });

  test("TC-03: Single URL — missing meta description (Fail)", async () => {
    await homePage.enterUrls([TEST_URLS.TC03]);
    await expect(homePage.urlCounter).toContainText("1 / 10 URLs");

    await homePage.clickStartScan();
    await homePage.waitForResults();

    // Desc. Length cell should show "(missing)"
    const descLength = await homePage.getDescLengthCell(0);
    expect(descLength.trim()).toBe("(missing)");

    // Desc. Status pill should be "Fail"
    const descStatus = await homePage.getDescStatusPill(0);
    expect(descStatus.trim()).toBe("Fail");
  });

  test("TC-04: Multiple URLs — all 5 rows appear in results", async () => {
    await homePage.enterUrls(TEST_URLS.TC04);
    await expect(homePage.urlCounter).toContainText("5 / 10 URLs");

    await homePage.clickStartScan();
    await homePage.waitForResults();

    // Results table should have exactly 5 rows
    const rowCount = await homePage.getRowCount();
    expect(rowCount).toBe(5);
  });

  test("TC-05: URL limit — counter warns at 10, only 10 scanned", async () => {
    await homePage.enterUrls(TEST_URLS.TC05);

    // Counter should show limit reached message
    await expect(homePage.urlCounter).toContainText("10 / 10 URLs — limit reached, remove a URL to add another");

    await homePage.clickStartScan();
    await homePage.waitForResults();

    // Only 10 rows should appear despite 11 URLs being pasted
    const rowCount = await homePage.getRowCount();
    expect(rowCount).toBe(10);
  });

  test("TC-06: Invalid URL — shows error banner, scan does not complete", async () => {
    await homePage.enterUrls([TEST_URLS.TC06]);
    await expect(homePage.urlCounter).toContainText("1 / 10 URLs");

    // Start Scan button should be enabled (manual mode does not block the button)
    await expect(homePage.startScanButton).toBeEnabled();

    await homePage.clickStartScan();

    // App returns an error banner for the invalid URL
    const errorBanner = homePage.page.locator("div").filter({
      hasText: /Invalid URL/,
    }).last();
    await expect(errorBanner).toBeVisible({ timeout: 15_000 });
  });

  test.only("TC-07: Cancel mid-scan — scan stops and Cancel button disappears", async () => {
    await homePage.enterUrls(TEST_URLS.TC07);
    await expect(homePage.urlCounter).toContainText("10 / 10 URLs");

    await homePage.clickStartScan();

    // Cancel button should appear while scan is in progress
    await expect(homePage.cancelScanButton).toBeVisible({ timeout: 10_000 });

    // Cancel the scan immediately
    await homePage.cancelScanButton.click();

    // Cancel button should disappear after cancellation
    await expect(homePage.cancelScanButton).not.toBeVisible({ timeout: 10_000 });

    // Start Scan button should be back
    await expect(homePage.startScanButton).toBeVisible();
  });
});
