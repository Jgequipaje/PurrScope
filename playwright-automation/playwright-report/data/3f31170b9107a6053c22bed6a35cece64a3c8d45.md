# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manualurlmode.spec.ts >> Manual URL Mode >> TC-07: Cancel mid-scan — scan stops and Cancel button disappears
- Location: tests\manualurlmode.spec.ts:102:8

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: 'Cancel Scan' })
    - locator resolved to <button type="button" class="ManualInput__CancelButton-sc-f5a5abca-3 kanBxl">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
  - element was detached from the DOM, retrying

```

# Test source

```ts
  12  | 
  13  |   test("TC-01: Single URL — all SEO passing", async () => {
  14  |     await homePage.enterUrls([TEST_URLS.TC01]);
  15  |     await expect(homePage.urlCounter).toContainText("1 / 10 URLs");
  16  | 
  17  |     await homePage.clickStartScan();
  18  |     await homePage.waitForScanToComplete();
  19  | 
  20  |     const titleStatus = await homePage.getTitleStatusPill(0);
  21  |     expect(titleStatus.trim()).toBe("Pass");
  22  | 
  23  |     const descStatus = await homePage.getDescStatusPill(0);
  24  |     expect(descStatus.trim()).toBe("Pass");
  25  | 
  26  |     const footer = await homePage.getFooterText();
  27  |     expect(footer).toContain("Scan complete — all 1 pages passed.");
  28  |   });
  29  | 
  30  |   test("TC-02: Single URL — title out of range (Fail)", async () => {
  31  |     await homePage.enterUrls([TEST_URLS.TC02]);
  32  |     await expect(homePage.urlCounter).toContainText("1 / 10 URLs");
  33  | 
  34  |     await homePage.clickStartScan();
  35  |     await homePage.waitForResults();
  36  | 
  37  |     const titleStatus = await homePage.getTitleStatusPill(0);
  38  |     expect(titleStatus.trim()).toBe("Fail");
  39  | 
  40  |     const footer = await homePage.getResultsFooter();
  41  |     await expect(footer).toContainText("pages need attention");
  42  |   });
  43  | 
  44  |   test("TC-03: Single URL — missing meta description (Fail)", async () => {
  45  |     await homePage.enterUrls([TEST_URLS.TC03]);
  46  |     await expect(homePage.urlCounter).toContainText("1 / 10 URLs");
  47  | 
  48  |     await homePage.clickStartScan();
  49  |     await homePage.waitForResults();
  50  | 
  51  |     // Desc. Length cell should show "(missing)"
  52  |     const descLength = await homePage.getDescLengthCell(0);
  53  |     expect(descLength.trim()).toBe("(missing)");
  54  | 
  55  |     // Desc. Status pill should be "Fail"
  56  |     const descStatus = await homePage.getDescStatusPill(0);
  57  |     expect(descStatus.trim()).toBe("Fail");
  58  |   });
  59  | 
  60  |   test("TC-04: Multiple URLs — all 5 rows appear in results", async () => {
  61  |     await homePage.enterUrls(TEST_URLS.TC04);
  62  |     await expect(homePage.urlCounter).toContainText("5 / 10 URLs");
  63  | 
  64  |     await homePage.clickStartScan();
  65  |     await homePage.waitForResults();
  66  | 
  67  |     // Results table should have exactly 5 rows
  68  |     const rowCount = await homePage.getRowCount();
  69  |     expect(rowCount).toBe(5);
  70  |   });
  71  | 
  72  |   test("TC-05: URL limit — counter warns at 10, only 10 scanned", async () => {
  73  |     await homePage.enterUrls(TEST_URLS.TC05);
  74  | 
  75  |     // Counter should show limit reached message
  76  |     await expect(homePage.urlCounter).toContainText("10 / 10 URLs — limit reached, remove a URL to add another");
  77  | 
  78  |     await homePage.clickStartScan();
  79  |     await homePage.waitForResults();
  80  | 
  81  |     // Only 10 rows should appear despite 11 URLs being pasted
  82  |     const rowCount = await homePage.getRowCount();
  83  |     expect(rowCount).toBe(10);
  84  |   });
  85  | 
  86  |   test("TC-06: Invalid URL — shows error banner, scan does not complete", async () => {
  87  |     await homePage.enterUrls([TEST_URLS.TC06]);
  88  |     await expect(homePage.urlCounter).toContainText("1 / 10 URLs");
  89  | 
  90  |     // Start Scan button should be enabled (manual mode does not block the button)
  91  |     await expect(homePage.startScanButton).toBeEnabled();
  92  | 
  93  |     await homePage.clickStartScan();
  94  | 
  95  |     // App returns an error banner for the invalid URL
  96  |     const errorBanner = homePage.page.locator("div").filter({
  97  |       hasText: /Invalid URL/,
  98  |     }).last();
  99  |     await expect(errorBanner).toBeVisible({ timeout: 15_000 });
  100 |   });
  101 | 
  102 |   test.only("TC-07: Cancel mid-scan — scan stops and Cancel button disappears", async () => {
  103 |     await homePage.enterUrls(TEST_URLS.TC07);
  104 |     await expect(homePage.urlCounter).toContainText("10 / 10 URLs");
  105 | 
  106 |     await homePage.clickStartScan();
  107 | 
  108 |     // Cancel button should appear while scan is in progress
  109 |     await expect(homePage.cancelScanButton).toBeVisible({ timeout: 10_000 });
  110 | 
  111 |     // Cancel the scan immediately
> 112 |     await homePage.cancelScanButton.click();
      |                                     ^ Error: locator.click: Target page, context or browser has been closed
  113 | 
  114 |     // Cancel button should disappear after cancellation
  115 |     await expect(homePage.cancelScanButton).not.toBeVisible({ timeout: 10_000 });
  116 | 
  117 |     // Start Scan button should be back
  118 |     await expect(homePage.startScanButton).toBeVisible();
  119 |   });
  120 | });
  121 | 
```