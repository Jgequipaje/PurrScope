import { Page } from "@playwright/test";

export class BasePage {
  constructor(public page: Page) {}

  async navigate(path = "/") {
    // Retry navigation up to 3 times to handle transient ERR_ABORTED
    // that can occur when the Next.js dev server hot-reloads mid-request.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 });
        return;
      } catch (err: any) {
        const isAborted = err?.message?.includes("ERR_ABORTED") || err?.message?.includes("frame was detached");
        if (isAborted && attempt < 3) {
          await this.page.waitForTimeout(1500 * attempt);
          continue;
        }
        throw err;
      }
    }
  }
}
