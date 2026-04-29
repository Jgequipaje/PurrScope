# PurrScope — Smoke Test Scenarios

**Purpose:** Critical path tests to verify core functionality is working. Run these on every deployment and PR.

**Tag:** `@Smoke` — Use this tag in your Playwright tests to run smoke suite only

---

## Smoke Test Suite

### S01 — Manual Mode: Single URL Happy Path @Smoke

**Objective:** Verify basic manual URL scanning works end-to-end

**Preconditions:**

- App is running and accessible
- Test URL has valid title (45-61 chars) and description (145-161 chars)

**Steps:**

1. Navigate to app home page
2. Verify "Manual URLs" tab is selected by default
3. Enter a single valid URL in the textarea
4. Click "Start Scan" button
5. Wait for scan to complete

**Expected Results:**

- Results table appears with 1 row
- Both Title Status and Description Status show "Pass" (green pills)
- Footer shows "Scan complete — all 1 pages passed"
- No error banners displayed

---

### S02 — Manual Mode: Multiple URLs @Smoke

**Objective:** Verify manual mode can handle multiple URLs

**Preconditions:**

- App is running
- Have 3-5 test URLs ready

**Steps:**

1. Navigate to app home page
2. Select "Manual URLs" tab
3. Enter 3 URLs (one per line) in the textarea
4. Click "Start Scan" button
5. Wait for scan to complete

**Expected Results:**

- Results table shows exactly 3 rows
- Each row displays the correct URL
- All rows have status indicators (Pass/Fail)
- Footer shows scan completion summary
- No crashes or errors

---

### S03 — Sitemap Mode: Crawl and Discover @Smoke

**Objective:** Verify sitemap crawling discovers pages

**Preconditions:**

- App is running
- Test site URL with valid sitemap.xml available

**Steps:**

1. Navigate to app home page
2. Click "Sitemap Crawl" tab
3. Enter a valid site URL (e.g., `https://example.com`)
4. Click "Crawl Sitemap" button
5. Wait for crawl to complete

**Expected Results:**

- Crawl completes without errors
- Summary shows "X pages discovered / Y pages selected for scanning"
- "Start Scan — N Pages" button appears and is enabled
- No error banners displayed
- Scope selector shows "All Pages" by default

---

### S04 — Sitemap Mode: Scan After Crawl @Smoke

**Objective:** Verify scanning works after sitemap crawl

**Preconditions:**

- Sitemap crawl completed successfully (from S03)
- Pages discovered and ready to scan

**Steps:**

1. After successful crawl, verify scan controls are visible
2. Set scan limit to 3 pages (to keep test fast)
3. Click "Start Scan — 3 Pages" button
4. Wait for scan to complete

**Expected Results:**

- Scan runs and completes
- Results table shows exactly 3 rows
- Each row has URL, title, description, and status
- Footer shows scan completion message
- No errors or crashes

---

### S05 — Sitemap Mode: Scope Filtering @Smoke

**Objective:** Verify scope filtering updates page count

**Preconditions:**

- Sitemap crawl completed with multiple page types
- At least one static and one dynamic sitemap exists

**Steps:**

1. After successful crawl, note the initial "pages selected" count
2. Open "Scope" dropdown
3. Select "Static Pages Only"
4. Observe the updated count
5. Select "Dynamic Pages"
6. Observe the updated count
7. Select "All Pages" to return to default

**Expected Results:**

- Each scope change updates the "pages selected" count instantly
- No re-crawl is triggered (no loading spinner)
- "Start Scan" button remains enabled
- Counts are logical (All Pages ≥ Static + Dynamic)
- No errors displayed

---

### S06 — Results Table: Expand/Collapse Row @Smoke

**Objective:** Verify row expansion shows full details

**Preconditions:**

- At least one scan completed with results visible

**Steps:**

1. Locate any row in the results table
2. Click on the row to expand it
3. Verify expanded content is visible
4. Click the row again to collapse it

**Expected Results:**

- First click expands the row
- Expanded view shows full SEO Title and Meta Description text
- Second click collapses the row back to compact view
- No layout breaks or visual glitches

---

### S07 — Results Table: Filter Failed Pages @Smoke

**Objective:** Verify filtering shows only failed results

**Preconditions:**

- Scan completed with at least one passing and one failing page

**Steps:**

1. After scan with mixed results, locate filter buttons above table
2. Note the count in "Failed (N)" button
3. Click "Failed (N)" button
4. Observe filtered results
5. Click "All (N)" button to reset

**Expected Results:**

- "Failed" filter shows only rows with at least one Fail status
- Passing rows are hidden
- Failed count matches the number of visible rows
- "All" filter restores all rows
- No errors or layout issues

---

### S08 — Copy Results to Clipboard @Smoke

**Objective:** Verify export functionality works

**Preconditions:**

- At least one scan completed with results

**Steps:**

1. After scan completes, locate "Copy Results" button
2. Click "Copy Results" button
3. Observe button feedback
4. Paste clipboard content into a text editor or spreadsheet

**Expected Results:**

- Button briefly shows "Copied!" feedback
- Clipboard contains tab-separated data
- Data includes URL, Title, Description, and Status columns
- Data can be pasted into Excel/Google Sheets cleanly

---

### S09 — Theme Toggle @Smoke

**Objective:** Verify theme switching works without breaking UI

**Preconditions:**

- App is running

**Steps:**

1. Navigate to app home page
2. Note current theme (dark or light)
3. Click theme toggle button in top right
4. Observe theme change
5. Refresh the page
6. Verify theme persisted

**Expected Results:**

- Theme switches immediately on click
- All components update colors correctly
- No white/dark flash on refresh
- Theme preference persists after refresh
- No visual glitches or broken styles

---

### S10 — Error Handling: Invalid Sitemap URL @Smoke

**Objective:** Verify graceful error handling for invalid input

**Preconditions:**

- App is running

**Steps:**

1. Navigate to app home page
2. Click "Sitemap Crawl" tab
3. Enter an invalid URL (e.g., `not-a-url`)
4. Observe validation behavior
5. Enter a valid URL with no sitemap (e.g., `https://example.com/404`)
6. Click "Crawl Sitemap"
7. Wait for error response

**Expected Results:**

- Invalid URL disables "Crawl Sitemap" button
- Validation hint appears below input
- Valid URL with no sitemap shows user-friendly error banner
- Error message says "No sitemap found for this URL."
- App does not crash
- User can recover by entering a different URL

---

## Smoke Test Execution Notes

**Frequency:** Run on every PR and before every deployment

**Duration Target:** < 5 minutes for full suite

**Environment:**

- Run against local dev server (`npm run dev`) for PR checks
- Run against production build (`npm run start`) for deployment verification

**Test Data:**

- Use stable, publicly accessible test URLs
- Avoid URLs that require authentication
- Consider maintaining a test sitemap for consistent results

**Failure Handling:**

- Any smoke test failure is a blocker for deployment
- Investigate and fix immediately
- Do not skip or ignore smoke test failures

**Tagging Convention:**

- All smoke tests must have `@Smoke` tag
- Use `test.describe` blocks to group related scenarios
- Use descriptive test names matching scenario IDs (e.g., "S01 - Manual Mode: Single URL Happy Path")

---

## Additional Smoke Test Candidates (Future)

These scenarios are important but not yet automated:

- **S11** — Cancel scan mid-execution (requires implementation)
- **S12** — URL limit enforcement in manual mode (10 URL max)
- **S13** — Mobile responsive layout verification
- **S14** — Recent searches functionality
- **S15** — Network error handling during scan

Add these as smoke tests once the features are stable and testable.
