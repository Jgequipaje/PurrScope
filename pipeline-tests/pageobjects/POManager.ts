import { Page } from "@playwright/test";
import { ManualModePage } from "./ManualModePage";
import { SiteMapModePage } from "./SiteMapModePage";

export class POManager {
  readonly page: Page;
  manualModePage: ManualModePage;
  siteMapModePage: SiteMapModePage;

  constructor(page: Page) {
    this.page = page;
    this.manualModePage = new ManualModePage(this.page);
    this.siteMapModePage = new SiteMapModePage(this.page);
  }

  getManualModePage(): ManualModePage {
    return this.manualModePage;
  }

  getSiteMapModePage(): SiteMapModePage {
    return this.siteMapModePage;
  }
}
