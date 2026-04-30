import { test as base } from "@playwright/test";
import { TableUtils } from "../utils/TableUtils";
import { POManager } from "../pageobjects/POManager";

export const manualModeTest = base.extend<{
  tableUtils: TableUtils;
  poManager: POManager;
  manualModePage: ReturnType<POManager["getManualModePage"]>;
  sampleURL: string;
  multipleURL: string[];
}>({
  poManager: async ({ page }, use) => {
    use(new POManager(page));
  },

  manualModePage: async ({ poManager }, use) => {
    use(poManager.getManualModePage());
  },

  tableUtils: async ({ page }, use) => {
    use(new TableUtils(page));
  },

  sampleURL: async ({}, use) => {
    use("https://cooleygibsonrealestate.com/");
  },

  multipleURL: async ({}, use) => {
    use([
      "https://triciaquidley.com/1",
      "https://cooleygibsonrealestate.com/",
      "https://premiergroupmt.com/",
    ]);
  },
});

export { expect } from "@playwright/test";
