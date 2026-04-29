import { Page } from "@playwright/test";

export class SiteMapModePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }
}
