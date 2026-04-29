# Test IDs and Classnames Reference

This document lists all `data-testid` attributes and classnames added to PurrScope components for Playwright test automation.

## Main Page (`app/page.tsx`)

| Element             | Test ID         | Classname      | Description              |
| ------------------- | --------------- | -------------- | ------------------------ |
| Main container      | `main-page`     | -              | Root page container      |
| Page title          | `page-title`    | -              | "PurrScope" heading      |
| Page subtitle       | `page-subtitle` | -              | Subtitle text            |
| Theme toggle button | `theme-toggle`  | `theme-toggle` | Light/dark mode toggle   |
| Mascot area         | `mascot-area`   | -              | Mascot display container |
| Error banner        | `error-banner`  | -              | Error message display    |

## Mode Tabs (`components/ModeTabs.tsx`)

| Element        | Test ID            | Classname                            | Description          |
| -------------- | ------------------ | ------------------------------------ | -------------------- |
| Tabs container | `mode-tabs`        | -                                    | Mode tabs wrapper    |
| Manual tab     | `mode-tab-manual`  | `mode-tab`, `active` (when selected) | Manual URLs mode tab |
| Sitemap tab    | `mode-tab-sitemap` | `mode-tab`, `active` (when selected) | Sitemap mode tab     |

## Manual Input (`components/ManualInput.tsx`)

| Element            | Test ID                  | Classname          | Description            |
| ------------------ | ------------------------ | ------------------ | ---------------------- |
| URL textarea       | `manual-url-input`       | `manual-url-input` | Manual URL input field |
| URL counter        | `url-counter`            | -                  | Shows URL count (X/10) |
| Start scan button  | `start-manual-scan-btn`  | -                  | Initiates manual scan  |
| Cancel scan button | `cancel-manual-scan-btn` | -                  | Cancels ongoing scan   |

## Sitemap Input (`components/SitemapInput.tsx`)

| Element           | Test ID             | Classname           | Description                         |
| ----------------- | ------------------- | ------------------- | ----------------------------------- |
| URL input         | `sitemap-url-input` | `sitemap-url-input` | Sitemap URL input field             |
| Crawl button      | `crawl-sitemap-btn` | -                   | Initiates sitemap crawl             |
| Cancel button     | `cancel-crawl-btn`  | -                   | Cancels crawl operation             |
| Validation hint   | `validation-hint`   | -                   | URL validation error message        |
| Root info callout | `sitemap-root-info` | -                   | Info about using site root          |
| Hint text         | `sitemap-hint`      | -                   | Helper text about sitemap discovery |

## Scope Selector (`components/ScopeSelector.tsx`)

| Element                    | Test ID                   | Classname      | Description                      |
| -------------------------- | ------------------------- | -------------- | -------------------------------- |
| Container                  | `scope-selector`          | -              | Scope selector wrapper           |
| Scope dropdown             | `scope-select`            | `scope-select` | Scan scope selection dropdown    |
| Scope hint                 | `scope-hint`              | -              | Description of selected scope    |
| Exclusion dropdown wrapper | `exclusion-dropdown-wrap` | -              | Container for exclusion dropdown |

## Exclusion Dropdown (`components/ExclusionDropdown.tsx`)

| Element          | Test ID                      | Classname                                     | Description                 |
| ---------------- | ---------------------------- | --------------------------------------------- | --------------------------- |
| Container        | `exclusion-dropdown`         | -                                             | Exclusion dropdown wrapper  |
| Trigger button   | `exclusion-dropdown-trigger` | `exclusion-dropdown-trigger`                  | Opens/closes dropdown       |
| Popover          | `exclusion-dropdown-popover` | -                                             | Dropdown options container  |
| Option (dynamic) | `exclusion-option-{label}`   | `exclusion-option`, `selected` (when checked) | Individual exclusion option |
| Helper text      | `exclusion-helper-text`      | -                                             | Helper text below dropdown  |

## Sitemap Debug (`components/SitemapDebug.tsx`)

| Element            | Test ID                   | Classname          | Description             |
| ------------------ | ------------------------- | ------------------ | ----------------------- |
| Container          | `sitemap-debug`           | `sitemap-debug`    | Debug panel wrapper     |
| Start scan button  | `start-sitemap-scan-btn`  | `start-scan-btn`   | Initiates sitemap scan  |
| Cancel scan button | `cancel-sitemap-scan-btn` | -                  | Cancels ongoing scan    |
| Scan limit input   | `scan-limit-input`        | `scan-limit-input` | Scan limit number input |
| Clear limit button | `clear-scan-limit-btn`    | -                  | Clears scan limit       |

## Results Table (`components/ResultsTable.tsx`)

| Element               | Test ID                | Classname                                               | Description               |
| --------------------- | ---------------------- | ------------------------------------------------------- | ------------------------- |
| Table container       | `results-table`        | `results-table`                                         | Results table wrapper     |
| Summary bar           | `results-summary`      | -                                                       | Summary statistics bar    |
| Toolbar               | `results-toolbar`      | -                                                       | Filter and search toolbar |
| Filter tabs container | `filter-tabs`          | -                                                       | Tab group wrapper         |
| All tab               | `filter-tab-all`       | `filter-tab`, `active` (when selected)                  | All results tab           |
| Failed tab            | `filter-tab-failed`    | `filter-tab`, `active` (when selected)                  | Failed results tab        |
| Passed tab            | `filter-tab-passed`    | `filter-tab`, `active` (when selected)                  | Passed results tab        |
| Blocked tab           | `filter-tab-blocked`   | `filter-tab`, `active` (when selected)                  | Blocked results tab       |
| Search wrapper        | `search-wrap`          | -                                                       | Search input container    |
| Search input          | `results-search-input` | `results-search-input`                                  | URL search field          |
| Copy button           | `copy-results-btn`     | -                                                       | Copy results to clipboard |
| Result row (dynamic)  | `result-row-{url}`     | `result-row`, `failed`/`passed`, `expanded` (when open) | Individual result row     |

## Recent Searches (`components/RecentSearches.tsx`)

| Element                 | Test ID              | Classname                                                   | Description                  |
| ----------------------- | -------------------- | ----------------------------------------------------------- | ---------------------------- |
| Container               | `recent-searches`    | -                                                           | Recent searches wrapper      |
| Clear button            | `clear-history-btn`  | -                                                           | Clears search history        |
| Empty state             | `empty-history`      | -                                                           | "No recent searches" message |
| History list            | `history-list`       | -                                                           | List of history entries      |
| History entry (dynamic) | `history-entry-{id}` | `history-entry`, `history-entry-url`/`history-entry-manual` | Individual history item      |

## Usage Examples for Playwright

```typescript
// Navigate to manual mode
await page.getByTestId("mode-tab-manual").click();

// Enter URLs and scan
await page.getByTestId("manual-url-input").fill("https://example.com");
await page.getByTestId("start-manual-scan-btn").click();

// Switch to sitemap mode
await page.getByTestId("mode-tab-sitemap").click();

// Enter sitemap URL and crawl
await page.getByTestId("sitemap-url-input").fill("https://example.com");
await page.getByTestId("crawl-sitemap-btn").click();

// Wait for crawl to complete and start scan
await page.getByTestId("start-sitemap-scan-btn").click();

// Filter results
await page.getByTestId("filter-tab-failed").click();

// Search results
await page.getByTestId("results-search-input").fill("about");

// Copy results
await page.getByTestId("copy-results-btn").click();

// Select scope
await page.getByTestId("scope-select").selectOption("static");

// Set scan limit
await page.getByTestId("scan-limit-input").fill("50");

// Toggle theme
await page.getByTestId("theme-toggle").click();
```

## CSS Class Selectors

For cases where you need CSS selectors instead of test IDs:

```typescript
// Select active mode tab
await page.locator(".mode-tab.active");

// Select all failed result rows
await page.locator(".result-row.failed");

// Select expanded result row
await page.locator(".result-row.expanded");

// Select selected exclusion options
await page.locator(".exclusion-option.selected");
```

## Notes

- All `data-testid` attributes are stable and won't change with styling updates
- Classnames include state classes (e.g., `active`, `selected`, `expanded`) for conditional styling
- Dynamic test IDs use predictable patterns (e.g., `result-row-{url}`, `history-entry-{id}`)
- Test IDs are preferred over classnames for test automation as they're explicitly for testing
