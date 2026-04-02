import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test.describe("Manual URL Mode", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate("/");
  });

  test("TC-01: Single URL — all SEO passing", async () => {
    await homePage.enterUrls(["https://stoneandcoastgroup.com/"]);
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
    await homePage.enterUrls(["https://realestate-services.netlify.app/"]);
    await expect(homePage.urlCounter).toContainText("1 / 10 URLs");

    await homePage.clickStartScan();
    await homePage.waitForResults();

    const titleStatus = await homePage.getTitleStatusPill(0);
    expect(titleStatus.trim()).toBe("Fail");

    const footer = await homePage.getResultsFooter();
    await expect(footer).toContainText("pages need attention");
  });
});
