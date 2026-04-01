# PurrScope — Manual Test Cases

Use this document to manually verify PurrScope before deployment or after making changes.

---

## 1. Manual URL Mode

### TC-01 — Single valid URL
- Steps: Switch to Manual URLs tab, enter one valid URL (e.g. `https://example.com`), click Start Scan
- Expected: Scan runs, results table appears with one row showing title/description pass or fail

### TC-02 — Multiple valid URLs
- Steps: Enter 3–5 valid URLs on separate lines, click Start Scan
- Expected: All URLs appear in results table, each with their own pass/fail status

### TC-03 — URL limit enforcement
- Steps: Paste 11 or more URLs
- Expected: Counter shows "10 / 10 URLs — limit reached, remove a URL to add another", only 10 are scanned

### TC-04 — Empty input
- Steps: Leave textarea empty, observe Start Scan button
- Expected: Button is disabled, cannot click

### TC-05 — Cancel mid-scan
- Steps: Start a scan with several URLs, click Cancel Scan before it finishes
- Expected: Scan stops, timer shows "Stopped after Xs", partial results may appear

### TC-06 — Page with missing title and description
- Steps: Scan a URL known to have no SEO metadata
- Expected: Row shows "Fail" for both title and description, scanStatus shows `missing`

### TC-07 — Blocked page
- Steps: Scan a URL protected by Cloudflare or a login wall
- Expected: Row shows "Blocked" pill, no title/description extracted

---

## 2. Sitemap Crawl Mode

### TC-08 — Valid site with sitemap
- Steps: Switch to Sitemap Crawl, enter a site URL with a known sitemap (e.g. `https://vercel.com`), click Crawl Sitemap
- Expected: Discovery Results panel appears, shows pages discovered count, scope selector appears

### TC-09 — Site with no sitemap
- Steps: Enter a URL for a site with no sitemap.xml or sitemap_index.xml
- Expected: Red error banner shows "No sitemap found for this URL." with a "Show details" toggle

### TC-10 — Invalid URL format
- Steps: Type `not-a-url` in the sitemap input
- Expected: Validation hint appears below input, Crawl Sitemap button stays disabled

### TC-11 — URL with a path (e.g. a blog post URL)
- Steps: Enter `https://example.com/blog/some-post`
- Expected: Info callout appears saying "Sitemap crawl uses the site root: https://example.com"

### TC-12 — Cancel crawl
- Steps: Start a crawl, click Cancel before it finishes
- Expected: Crawl stops, no results shown, no error banner

---

## 3. Scope Filtering (after crawl)

### TC-13 — Switch scope without re-crawling
- Steps: Crawl a site, then change Scan Scope from "All Pages" to "Static Pages Only"
- Expected: Page counts update immediately, no new crawl triggered, Crawl Sitemap button not required again

### TC-14 — Switch back to All Pages
- Steps: After TC-13, switch scope back to "All Pages"
- Expected: Original full count restored instantly

### TC-15 — Dynamic Pages scope
- Steps: Crawl a site with dynamic sitemaps (-dpages.xml), select "Dynamic Pages"
- Expected: Only dynamic page URLs shown in count, static pages excluded

### TC-16 — Exclude dynamic groups
- Steps: With "Dynamic Pages" scope selected, open the exclusion dropdown and select one group
- Expected: Page count decreases immediately to reflect the exclusion

### TC-17 — Scan uses filtered URLs
- Steps: Set scope to "Static Pages Only", then click Start Scan
- Expected: Only static pages are scanned, results table shows only those URLs

---

## 4. Scan Limit

### TC-18 — Set a scan limit
- Steps: After crawl, set scan limit to 5, click Start Scan
- Expected: Only 5 pages scanned regardless of how many were discovered

### TC-19 — Clear scan limit
- Steps: Set a limit, then click "clear (scan all)"
- Expected: Limit removed, placeholder shows full page count again

### TC-20 — Limit auto-clamps on scope change
- Steps: Set limit to 50, then switch scope to a filter that returns only 20 pages
- Expected: Limit automatically reduces to 20

---

## 5. Results Table

### TC-21 — All pages pass
- Steps: Scan a well-optimised site
- Expected: Footer shows "Scan complete — all N pages passed." in green

### TC-22 — Some pages fail
- Steps: Scan a site with known SEO issues
- Expected: Footer shows "N of M pages need attention." in amber/red, Failed filter tab shows count

### TC-23 — Filter to failed only
- Steps: After a scan with failures, click "Failed (N)" filter tab
- Expected: Only failing rows shown, passing rows hidden

### TC-24 — Expand a row
- Steps: Click any row in the results table
- Expected: Row expands to show full title and meta description text

### TC-25 — Copy results
- Steps: Click "Copy Results" button
- Expected: Button briefly shows "Copied!", clipboard contains tab-separated results

### TC-26 — Redirect shown
- Steps: Scan a URL that redirects to another URL
- Expected: Row shows original URL with a "redirected to" sub-line showing the final URL

---

## 6. Theme

### TC-27 — Default theme on first load
- Steps: Clear localStorage, open the app in a fresh tab
- Expected: App loads in dark mode with no flash of light mode

### TC-28 — Toggle to light mode
- Steps: Click the Light/Dark button in the top right
- Expected: App switches to light mode, all components update correctly

### TC-29 — Theme persists on refresh
- Steps: Switch to light mode, refresh the page
- Expected: App loads in light mode, no dark flash

---

## 7. Responsive Layout

### TC-30 — Mobile view (< 480px)
- Steps: Open DevTools, set viewport to 375px wide (iPhone SE)
- Expected: Mode tabs stack vertically, each full width; URL input and Crawl button stack vertically

### TC-31 — Tablet view (768px)
- Steps: Set viewport to 768px (iPad Mini)
- Expected: Layout is usable, no horizontal overflow, buttons readable

### TC-32 — Theme toggle stays top-right on mobile
- Steps: On mobile viewport, observe the Light/Dark button
- Expected: Button stays compact in the top-right corner, does not stretch full width

---

## 8. Recent Searches

### TC-33 — History saved after scan
- Steps: Scan a URL, refresh the page
- Expected: The URL appears in the Recent Searches list

### TC-34 — Select from history
- Steps: Click a recent search entry
- Expected: Input field populates with that URL/text, mode switches accordingly

### TC-35 — Clear history
- Steps: Click "Clear" in the Recent Searches section
- Expected: All history entries removed, list disappears

---

## 9. Edge Cases

### TC-36 — Scan with 0 filtered pages
- Steps: Select a scope that results in 0 pages (e.g. Dynamic on a static-only site)
- Expected: Start Scan button is disabled, "No pages available to scan." message shown

### TC-37 — Change scope after scan
- Steps: Scan with "All Pages", then change scope to "Static Only" without re-crawling
- Expected: Counts update, previous scan results remain visible, new scan uses new scope

### TC-38 — Network error during scan
- Steps: Start a scan, disconnect from the internet mid-scan
- Expected: Error banner appears with a readable message, app does not crash

### TC-39 — Very long URL in results
- Steps: Scan a page with a very long URL
- Expected: URL wraps or truncates cleanly, no horizontal overflow in the table

### TC-40 — Sitemap with hundreds of pages
- Steps: Crawl a large site (500+ pages), set limit to 10, scan
- Expected: Only 10 pages scanned, performance is acceptable, no timeout
