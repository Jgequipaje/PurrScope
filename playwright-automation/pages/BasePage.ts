import { Page } from "@playwright/test";

export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path = "/") {
    await this.page.goto(path);
  }
}
