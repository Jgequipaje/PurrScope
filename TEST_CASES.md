# PurrScope — Manual Test Cases

Use this document to manually verify PurrScope before deployment or after making changes.

---

## 1. Manual URL Mode

### TC-01 — Single valid URL, passing SEO
- Input: one URL with a title between 45–61 chars and description between 145–161 chars
- Expected: row shows Pass / Pass, green pills, footer says "Scan complete — all 1 pages passed"

### TC-02 — Single valid URL, failing title
- Input: a URL where the page title is under 45 or over 61 characters
- Expected: Title Status shows Fail (red pill), Description Status may pass

### TC-03 — Single valid URL, missing meta description
- Input: a URL where the page has no meta description tag
- Expected: Desc. Length shows "(missing)", Desc. Status shows Fail

### TC-04 — Multiple URLs (up to 10)
- Input: paste 5 URLs, one per line
- Expected: all 5 are scanned, results table shows 5 rows

### TC-05 — URL limit enforcement
> ⚠️ Automation not yet created. Implementation not yet done.
- Input: paste 11 URLs
- Expected: counter shows "10 / 10 URLs — limit reached, remove a URL to add another", only 10 are scanned

### TC-06 — Invalid URL input
- Input: type `not-a-url` in the textarea
- Expected: Start Scan button is not disabled (manual mode doesn't validate), scan runs and returns an error banner for that URL

### TC-07 — Cancel mid-scan
> ⚠️ Automation not yet created. Implementation not yet done.
- Input: paste 5–10 URLs, click Start Scan, immediately click Cancel Scan
- Expected: scan stops, partial results may show, footer reflects cancelled state

---

## 2. Sitemap Mode — Crawl

### TC-08 — Valid site with sitemap
- Input: enter a site URL that has `/sitemap.xml` (e.g. a WordPress or standard site)
- Expected: crawl completes, summary shows "X pages discovered / Y pages selected for scanning"

### TC-09 — Valid site URL with a path
- Input: enter `https://example.com/blog/post-1`
- Expected: info callout appears saying "Sitemap crawl uses the site root: https://example.com", crawl uses root

### TC-10 — Site with no sitemap
- Input: enter a URL for a site that has no sitemap.xml or sitemap_index.xml
- Expected: red error banner shows "No sitemap found for this URL." with a "Show details" toggle

### TC-11 — Invalid URL in sitemap input
- Input: type `example` (no protocol)
- Expected: validation hint appears below input, Crawl Sitemap button is disabled

### TC-12 — Cancel crawl
- Input: enter a valid URL, click Crawl Sitemap, immediately click Cancel
- Expected: crawl stops, no results shown, no error banner

### TC-13 — Re-crawl clears previous results
- Input: crawl site A, then change URL to site B and crawl again
- Expected: previous results and discovery data are cleared, new results shown

---

## 3. Sitemap Mode — Scope Filtering

### TC-14 — Scope: All Pages
- After crawl, select "All Pages" scope
- Expected: discovered count equals selected count, all URLs included

### TC-15 — Scope: Static Pages Only
- After crawl, select "Static Pages Only"
- Expected: selected count drops to only URLs from `sitemap-static.xml`, updates instantly without re-crawling

### TC-16 — Scope: Dynamic Pages
- After crawl, select "Dynamic Pages"
- Expected: selected count shows only URLs from `-dpages.xml` sitemaps, updates instantly

### TC-17 — Scope change does not re-crawl
- After crawl, switch scope multiple times
- Expected: no new network request to `/api/sitemap`, counts update immediately, Crawl Sitemap button is not triggered

### TC-18 — Dynamic exclusion
- After crawl with Dynamic scope, open "Exclude Dynamic Page Types" dropdown
- Expected: dropdown shows available dynamic groups (e.g. Blog, Properties)
- Select one group → selected count decreases instantly
- Deselect → count returns to previous value

### TC-19 — Exclusion persists across scope toggle
- Select dynamic exclusions, switch to "All Pages" scope, switch back to "Dynamic Pages"
- Expected: exclusions are cleared when leaving dynamic scope (by design)

---

## 4. Sitemap Mode — Scan

### TC-20 — Scan after crawl
- Crawl a site, then click "Start Scan — N Pages"
- Expected: scan runs against the currently filtered URLs, results table appears

### TC-21 — Scan limit
- After crawl, set scan limit to 5, click Start Scan
- Expected: only 5 pages are scanned regardless of how many were selected

### TC-22 — Clear scan limit
- Set a scan limit, then click "clear (scan all)"
- Expected: limit input clears, "Ready to Scan" count returns to full filtered count

### TC-23 — Scan limit clamped on scope change
- Set scan limit to 50, switch to Static scope which has only 20 pages
- Expected: scan limit automatically clamps to 20

### TC-24 — Scan Pages button stays visible after scope change
- Crawl, then change scope multiple times
- Expected: "Start Scan" button remains visible and enabled throughout

### TC-25 — Cancel scan
- Start a scan, click Cancel Scan
- Expected: scan stops, partial results shown, footer shows stopped state

---

## 5. Results Table

### TC-26 — Expand row
- Click any row in the results table
- Expected: row expands to show full SEO Title and Meta Description text

### TC-27 — Collapse row
- Click an expanded row again
- Expected: row collapses

### TC-28 — Filter: Failed only
- After a scan with some failures, click "Failed (N)" filter button
- Expected: only failed rows shown, passing rows hidden

### TC-29 — Filter: All
- While "Failed" filter is active, click "All (N)"
- Expected: all rows shown again

### TC-30 — Copy results
- Click "Copy Results"
- Expected: button briefly shows "Copied!", clipboard contains tab-separated scan data

### TC-31 — Blocked page
- Scan a URL protected by Cloudflare or a login wall
- Expected: row shows "Blocked" pill, no title/description extracted, expand row shows explanation

### TC-32 — Redirect
- Scan a URL that redirects to another URL
- Expected: row shows original URL, expand shows "redirected to [final URL]"

---

## 6. Theme

### TC-33 — Default theme on first load
- Open app in a fresh browser (no localStorage)
- Expected: dark mode is applied immediately, no white flash

### TC-34 — Toggle theme
- Click the Light / Dark button in the top right
- Expected: theme switches, all components update colors

### TC-35 — Theme persists on refresh
- Switch to light mode, refresh the page
- Expected: light mode loads immediately, no dark flash

### TC-36 — Theme toggle stays in top right on mobile
- Open DevTools, switch to a mobile viewport
- Expected: theme toggle button stays compact in the top right, does not stretch full width

---

## 7. Responsive Layout

### TC-37 — Mobile: mode tabs stack
- On a viewport under 480px wide
- Expected: "Manual URLs" and "Sitemap Crawl" tabs stack vertically, each full width

### TC-38 — Mobile: Crawl Sitemap button stacks
- On a viewport under 540px wide
- Expected: URL input and Crawl Sitemap button stack vertically, button is full width

### TC-39 — Mobile: Start Scan button full width
- On a viewport under 540px wide
- Expected: Start Scan button is full width

### TC-40 — Tablet: side-by-side layout
- On a viewport over 540px (e.g. iPad Mini landscape)
- Expected: URL input and button are side by side, tabs are side by side

---

## 8. Error Handling

### TC-41 — No sitemap error is user-friendly
- Enter a URL with no sitemap
- Expected: banner shows "No sitemap found for this URL." — not the raw technical message
- Click "Show details" → full technical message expands

### TC-42 — Network error during scan
- Disconnect from internet, attempt a scan
- Expected: error banner appears with a readable message, app does not crash

### TC-43 — Recent searches history
- Perform several scans (manual and sitemap)
- Expected: recent searches appear below the mode tabs, clicking one restores the input

### TC-44 — Clear history
- Click "Clear" in recent searches
- Expected: history list disappears, localStorage is cleared
