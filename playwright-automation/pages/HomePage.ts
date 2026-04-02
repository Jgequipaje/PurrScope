import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  // Manual input area
  readonly urlTextarea: Locator;
  readonly urlCounter: Locator;
  readonly startScanButton: Locator;
  readonly cancelScanButton: Locator;

  // Results table
  readonly resultsTable: Locator;
  readonly resultsFooter: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.urlTextarea = page.locator("textarea");
    this.urlCounter = page.getByText(/\d+ \/ 10 URLs/);
    this.startScanButton = page.getByRole("button", { name: "Start Scan" });
    this.cancelScanButton = page.getByRole("button", { name: "Cancel Scan" });

    this.resultsTable = page.locator("table");
    // Footer text is rendered inside a span alongside an SVG icon,
    // so we match the containing div by partial text content
    this.resultsFooter = page.locator("div").filter({ hasText: /Scan complete — all \d+ pages passed/ }).last();
    this.tableRows = page.locator("tbody tr[class]");
  }

  async enterUrls(urls: string[]) {
    await this.urlTextarea.fill(urls.join("\n"));
  }

  async clickStartScan() {
    await this.startScanButton.click();
  }

  /**
   * Returns the Title Status pill text for the first result row.
   * Column order: expand | URL | Title Length | Title Status | Desc. Length | Desc. Status
   */
  async getTitleStatusPill(rowIndex = 0): Promise<string> {
    // Each data row has 6 cells; Title Status is the 4th (index 3)
    return this.page
      .locator("tbody tr")
      .nth(rowIndex)
      .locator("td")
      .nth(3)
      .innerText();
  }

  async getDescStatusPill(rowIndex = 0): Promise<string> {
    // Desc. Status is the 6th cell (index 5)
    return this.page
      .locator("tbody tr")
      .nth(rowIndex)
      .locator("td")
      .nth(5)
      .innerText();
  }

  async getDescLengthCell(rowIndex = 0): Promise<string> {
    // Desc. Length is the 5th cell (index 4)
    return this.page
      .locator("tbody tr")
      .nth(rowIndex)
      .locator("td")
      .nth(4)
      .innerText();
  }

  async getFooterText(): Promise<string> {
    return this.resultsFooter.innerText();
  }

  async waitForScanToComplete() {
    // The footer text is mixed with an SVG icon inside a span, so we use
    // a regex against the containing div and allow up to 5s for network latency
    await expect(this.resultsFooter).toBeVisible({ timeout: 5_000 });
  }

  async waitForResults() {
    // Waits for any footer to appear — covers both pass and fail outcomes
    await expect(
      this.page.locator("div").filter({ hasText: /Scan complete|pages need attention/ }).last()
    ).toBeVisible({ timeout: 5_000 });
  }

  async getResultsFooter(): Promise<Locator> {
    return this.page.locator("div").filter({ hasText: /Scan complete|pages need attention/ }).last();
  }

  async getRowCount(): Promise<number> {
    return this.page.locator("tbody tr").count();
  }
}
