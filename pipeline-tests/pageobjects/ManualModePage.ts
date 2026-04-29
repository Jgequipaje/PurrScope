import { Locator, Page } from "@playwright/test";

export class ManualModePage {
  readonly page: Page;
  mascotArea: Locator;
  manualTab: Locator;
  inputBox: Locator;
  submitButton: Locator;
  constructor(page: Page) {
    this.page = page;
    this.mascotArea = page.getByTestId("mascot-area");
    this.manualTab = page.getByTestId("mode-tab-manual");
    this.inputBox = page.getByTestId("manual-url-input");
    this.submitButton = page.getByTestId("start-manual-scan-btn");
  }

  getHeadingByTitle(title: string): Locator {
    return this.page.getByRole("heading", { name: new RegExp(title, "i") });
  }

  getMascotArea(): Locator {
    return this.mascotArea;
  }

  getManualButton(): Locator {
    return this.manualTab;
  }

  async inputURL(url: string): Promise<void> {
    await this.inputBox.fill(url);
  }

  async startScan(): Promise<void> {
    await this.submitButton.click();
  }
}
