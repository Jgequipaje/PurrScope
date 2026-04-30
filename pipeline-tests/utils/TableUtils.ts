import { Locator, Page } from "@playwright/test";

export class TableUtils {
  page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  findOnTable(
    url: string,
    columnName: "Title Length" | "Title Status" | "Desc. Length" | "Desc. Status"
  ): Locator {
    const row = this.page.locator(`tr[data-testid='result-row-${url}']`);

    switch (columnName) {
      case "Title Length":
        return row.locator("td").nth(2);
      case "Title Status":
        return row.locator("td").nth(3);
      case "Desc. Length":
        return row.locator("td").nth(4);
      case "Desc. Status":
        return row.locator("td").nth(5);
      default:
        throw new Error(`Unknown column: ${columnName}`);
    }
  }
}
