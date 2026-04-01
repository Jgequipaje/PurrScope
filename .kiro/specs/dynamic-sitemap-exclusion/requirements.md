# Requirements Document

## Introduction

Replace the free-text "Exclude Patterns" textarea in the SEO Checker's Sitemap Crawl mode with a multi-select dropdown that is driven by the `-dpages.xml` sitemap files discovered during crawl. Users select human-readable group labels (e.g. "Blog", "Neighborhoods") instead of typing raw glob patterns. The control is only shown when Sitemap Crawl mode is active and at least one `-dpages.xml` sitemap was discovered.

## Glossary

- **SEO_Checker**: The Next.js web application that crawls sitemaps and scans pages for SEO metadata issues.
- **Sitemap_Crawler**: The server-side module (`lib/sitemap.ts` + `app/api/sitemap/route.ts`) that fetches and parses sitemap XML files.
- **DPages_Sitemap**: A sitemap file whose filename ends in `-dpages.xml` (e.g. `sitemap-blog-dpages.xml`).
- **Dynamic_Group**: A named exclusion group derived from a single DPages_Sitemap. The label is extracted by stripping the `sitemap-` prefix and `-dpages.xml` suffix from the filename, then title-casing the result (e.g. `sitemap-blog-dpages.xml` → `Blog`).
- **Exclusion_Dropdown**: The new multi-select UI control that replaces the Exclude Patterns textarea.
- **Filter_Pipeline**: The server-side URL filtering logic in `lib/filter.ts` that accepts `excludePatterns` (glob strings) and removes matching URLs from the scan.
- **ScopeSelector**: The React component (`components/ScopeSelector.tsx`) that currently renders the Scan Scope dropdown and the Exclude Patterns textarea.
- **SitemapInput**: The React component (`components/SitemapInput.tsx`) that renders the URL input row and hosts `ScopeSelector`.
- **CrawlResult**: The `SitemapCrawlResult` object returned by the sitemap API, containing `sitemapUrls` — the list of all discovered sitemap file URLs.

## Requirements

### Requirement 1: Detect Dynamic Sitemap Groups from Crawl Result

**User Story:** As a developer, I want the SEO Checker to automatically identify which dynamic sitemap groups are available, so that the exclusion control always reflects the actual content of the crawled site.

#### Acceptance Criteria

1. WHEN a CrawlResult is available, THE SEO_Checker SHALL derive the list of Dynamic_Groups by filtering `sitemapUrls` to those whose filename ends in `-dpages.xml`.
2. THE SEO_Checker SHALL extract the Dynamic_Group label from each DPages_Sitemap URL by removing the `sitemap-` prefix and `-dpages.xml` suffix from the filename and title-casing the remaining segment (e.g. `sitemap-blog-dpages.xml` → `Blog`).
3. THE SEO_Checker SHALL derive Dynamic_Groups from the CrawlResult's `sitemapUrls` field without making additional network requests.
4. IF a DPages_Sitemap filename does not contain a recognisable segment between `sitemap-` and `-dpages.xml`, THEN THE SEO_Checker SHALL use the raw filename (minus `.xml`) as the fallback label.

---

### Requirement 2: Show Exclusion Dropdown Only When Relevant

**User Story:** As a user, I want the exclusion control to appear only when it is useful, so that the interface stays clean and uncluttered.

#### Acceptance Criteria

1. WHILE Sitemap Crawl mode is active and at least one Dynamic_Group has been detected, THE SEO_Checker SHALL display the Exclusion_Dropdown in place of the Exclude Patterns textarea.
2. WHILE Sitemap Crawl mode is active and no Dynamic_Groups have been detected, THE SEO_Checker SHALL hide the Exclusion_Dropdown entirely.
3. WHILE Manual mode is active, THE SEO_Checker SHALL hide the Exclusion_Dropdown.
4. WHEN a new crawl is initiated, THE SEO_Checker SHALL reset the Exclusion_Dropdown selection to empty before the new CrawlResult is received.

---

### Requirement 3: Render the Multi-Select Exclusion Dropdown

**User Story:** As a user, I want a clear, compact dropdown that lets me pick which dynamic sitemap groups to exclude, so that I do not need to type or understand raw glob patterns.

#### Acceptance Criteria

1. THE Exclusion_Dropdown SHALL display the field label "Exclude Dynamic Page Types".
2. THE Exclusion_Dropdown SHALL render a collapsed trigger element that, when clicked, opens a list of all detected Dynamic_Group options.
3. WHEN the option list is open, THE Exclusion_Dropdown SHALL display each Dynamic_Group as a selectable row with a checkmark indicator.
4. WHEN a Dynamic_Group option is selected, THE Exclusion_Dropdown SHALL display a visible checkmark beside that option.
5. WHEN a selected Dynamic_Group option is clicked again, THE Exclusion_Dropdown SHALL deselect it and remove the checkmark.
6. THE Exclusion_Dropdown SHALL support selecting multiple Dynamic_Groups simultaneously.
7. WHEN one or more Dynamic_Groups are selected, THE Exclusion_Dropdown collapsed trigger SHALL display the selected group labels joined by ", " if two or fewer are selected, or the text "{n} selected" if three or more are selected.
8. WHEN no Dynamic_Groups are selected, THE Exclusion_Dropdown collapsed trigger SHALL display the placeholder text "None — include all dynamic pages".
9. THE Exclusion_Dropdown SHALL include a helper text below the control reading "Choose dynamic sitemap groups to exclude from scan."
10. WHILE the crawl or scan process is running, THE Exclusion_Dropdown SHALL be disabled and non-interactive.

---

### Requirement 4: Map Selected Groups to Exclude Patterns

**User Story:** As a developer, I want selected Dynamic_Groups to be automatically translated into the exclude patterns the Filter_Pipeline already understands, so that existing scan logic does not need to change.

#### Acceptance Criteria

1. WHEN the user submits a crawl request with one or more Dynamic_Groups selected, THE SEO_Checker SHALL derive an `excludePatterns` array by mapping each selected Dynamic_Group back to its source DPages_Sitemap URL.
2. THE SEO_Checker SHALL pass the derived `excludePatterns` array to the sitemap API in the same format as the existing text-based exclude patterns.
3. THE Filter_Pipeline SHALL exclude all URLs whose `sourceSitemap` matches a selected DPages_Sitemap URL when those URLs are processed.
4. WHEN no Dynamic_Groups are selected, THE SEO_Checker SHALL pass an empty `excludePatterns` array to the sitemap API.

---

### Requirement 5: Preserve Existing Crawl and Scan Functionality

**User Story:** As a developer, I want the new exclusion control to integrate without breaking any existing behaviour, so that users who rely on the current scan flow are unaffected.

#### Acceptance Criteria

1. THE SEO_Checker SHALL continue to support the Scan Scope selector (All Pages / Static Pages Only / Dynamic Pages) independently of the Exclusion_Dropdown.
2. THE SEO_Checker SHALL continue to pass `scope` and `excludePatterns` to the sitemap API route in the existing request body format.
3. THE Filter_Pipeline SHALL apply both the scope filter and the exclude patterns filter in the same order as before this feature is introduced.
4. IF the Exclusion_Dropdown is not shown (no Dynamic_Groups detected), THEN THE SEO_Checker SHALL send an empty `excludePatterns` array, preserving the same behaviour as the previous empty textarea.

---

### Requirement 6: Consistent Styling

**User Story:** As a user, I want the new dropdown to look and feel like the rest of the interface, so that the design remains coherent.

#### Acceptance Criteria

1. THE Exclusion_Dropdown SHALL use colour tokens from `lib/theme.tsx` for all background, border, text, and focus styles.
2. THE Exclusion_Dropdown SHALL respond to light/dark theme changes without requiring a page reload.
3. THE Exclusion_Dropdown SHALL match the border-radius, font-size, and spacing conventions used by the existing `ScopeSelector` styled components.
