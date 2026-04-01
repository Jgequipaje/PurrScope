# Requirements Document

## Introduction

This feature replaces the current path-pattern-based scan scope logic with a sitemap-source-based approach. Instead of guessing whether a URL is "static" or "dynamic" by inspecting its path segments, the system uses the sitemap file a URL was discovered in as the authoritative classification. URLs from `/sitemap-static.xml` are static; URLs from any `*-dpages.xml` sitemap are dynamic. The scan scope options are updated to reflect this model, and the results table gains a "Source Sitemap" column for traceability.

## Glossary

- **Crawler**: The server-side module (`lib/sitemap.ts`) that fetches and parses sitemap XML files.
- **SitemapSource**: The filename (without base URL) of the sitemap file a URL was discovered in, e.g. `sitemap-static.xml` or `sitemap-agent-dpages.xml`.
- **Static URL**: A URL whose `SitemapSource` is `sitemap-static.xml`.
- **Dynamic URL**: A URL whose `SitemapSource` matches the pattern `*-dpages.xml`.
- **ScanScope**: The user-selected filter that determines which URLs are included in a scan run. Valid values: `all`, `static`, `dynamic`.
- **FilterPipeline**: The server-side module (`lib/filter.ts`) that applies the selected `ScanScope` to produce the final URL list.
- **SitemapCrawlResult**: The data structure returned by the Crawler, containing discovered URLs, their `SitemapSource` labels, and debug counts.
- **ScanResult**: The per-URL result record produced by the scanner, extended to carry the `SitemapSource` label.
- **ResultsTable**: The UI component (`components/ResultsTable.tsx`) that displays scan results.
- **ScopeSelector**: The UI component (`components/ScopeSelector.tsx`) that lets the user choose a `ScanScope`.
- **SitemapDebug**: The UI component (`components/SitemapDebug.tsx`) that shows crawl and filter debug information before scanning.

---

## Requirements

### Requirement 1: Sitemap Source Tracking

**User Story:** As a developer, I want every discovered URL to carry a label identifying which sitemap file it came from, so that scope filtering is based on authoritative source data rather than path heuristics.

#### Acceptance Criteria

1. WHEN the Crawler processes a `urlset` sitemap file, THE Crawler SHALL record the sitemap filename (e.g. `sitemap-static.xml`) as the `SitemapSource` for every URL extracted from that file.
2. WHEN the Crawler processes a `sitemapindex` file that links to child sitemaps, THE Crawler SHALL recurse into each child sitemap and assign that child's filename as the `SitemapSource` for its URLs.
3. THE Crawler SHALL deduplicate URLs such that each unique URL appears only once in the result, retaining the `SitemapSource` of its first occurrence.
4. THE `SitemapCrawlResult` SHALL include a map of URL → `SitemapSource` for all discovered URLs.
5. THE `SitemapCrawlResult` SHALL include a count of URLs discovered per `SitemapSource` for debug output.

---

### Requirement 2: Sitemap-Source-Based Scope Classification

**User Story:** As a developer, I want the FilterPipeline to classify URLs as static or dynamic based solely on their `SitemapSource`, so that no path-pattern inference is used.

#### Acceptance Criteria

1. WHEN the `ScanScope` is `all`, THE FilterPipeline SHALL include every URL regardless of its `SitemapSource`.
2. WHEN the `ScanScope` is `static`, THE FilterPipeline SHALL include only URLs whose `SitemapSource` is `sitemap-static.xml`.
3. WHEN the `ScanScope` is `dynamic`, THE FilterPipeline SHALL include only URLs whose `SitemapSource` matches the pattern `*-dpages.xml`.
4. THE FilterPipeline SHALL NOT use URL path segments, slug detection, or group-size thresholds to classify URLs as static or dynamic.
5. THE FilterPipeline SHALL NOT collapse child URLs to inferred parent routes.
6. THE FilterPipeline SHALL NOT invent URLs that were not present in a sitemap file.

---

### Requirement 3: Updated Scan Scope Options

**User Story:** As a user, I want the scan scope dropdown to offer "All Pages", "Static Pages Only", and "Dynamic Pages Only" options, so that I can target the right set of pages without manual configuration.

#### Acceptance Criteria

1. THE ScopeSelector SHALL display exactly three options: `All Pages`, `Static Pages Only`, and `Dynamic Pages Only`.
2. WHEN the user selects `All Pages`, THE ScopeSelector SHALL pass `ScanScope` value `all` to the FilterPipeline.
3. WHEN the user selects `Static Pages Only`, THE ScopeSelector SHALL pass `ScanScope` value `static` to the FilterPipeline.
4. WHEN the user selects `Dynamic Pages Only`, THE ScopeSelector SHALL pass `ScanScope` value `dynamic` to the FilterPipeline.
5. THE ScopeSelector SHALL remove the `Collapse Dynamic Pages to Parent` option that existed in the previous implementation.

---

### Requirement 4: Source Sitemap Column in Results Table

**User Story:** As a user, I want to see which sitemap file each scanned URL came from in the results table, so that I can verify scope filtering worked correctly.

#### Acceptance Criteria

1. THE `ScanResult` type SHALL include an optional `sourceSitemap` field of type `string`.
2. WHEN scan results are displayed, THE ResultsTable SHALL render a "Source Sitemap" column showing the `sourceSitemap` value for each row.
3. WHEN a `ScanResult` has no `sourceSitemap` value, THE ResultsTable SHALL display an em dash (`—`) in the Source Sitemap column.
4. THE ResultsTable SHALL display the sitemap filename only (e.g. `sitemap-static.xml`), not the full URL.

---

### Requirement 5: Debug Output for Sitemap Source Counts

**User Story:** As a developer, I want the debug panel to show how many URLs came from each sitemap file and how many are included in the current scope, so that I can verify the crawl and filter results.

#### Acceptance Criteria

1. THE SitemapDebug component SHALL display the total number of URLs discovered across all sitemaps.
2. THE SitemapDebug component SHALL display a per-`SitemapSource` breakdown showing the filename and URL count for each sitemap file processed.
3. THE SitemapDebug component SHALL display the number of URLs included in the scan after the selected `ScanScope` is applied.
4. WHEN the `ScanScope` changes, THE SitemapDebug component SHALL update the included URL count to reflect the new scope without requiring a new crawl.

---

### Requirement 6: Preserve Existing SEO Scan Logic

**User Story:** As a developer, I want the title and meta description scanning logic to remain unchanged, so that the scope refactor does not introduce regressions in SEO checks.

#### Acceptance Criteria

1. THE Scanner SHALL continue to evaluate title length against the range 45–61 characters and report `Pass` or `Fail` accordingly.
2. THE Scanner SHALL continue to evaluate meta description length against the range 145–161 characters and report `Pass` or `Fail` accordingly.
3. WHEN a page fails to load, THE Scanner SHALL continue to record an error and proceed to the next URL.
4. THE Scanner SHALL NOT require database access or authentication to operate.

---

### Requirement 7: URL Deduplication and Source Preservation

**User Story:** As a developer, I want the system to deduplicate URLs across all sitemap files while preserving the source label, so that no URL is scanned twice and every result is traceable.

#### Acceptance Criteria

1. WHEN the same URL appears in more than one sitemap file, THE Crawler SHALL include it only once in the final URL list.
2. WHEN a URL is deduplicated, THE Crawler SHALL retain the `SitemapSource` of the first sitemap file in which the URL was encountered.
3. THE FilterPipeline SHALL pass the `sourceSitemap` label through to the `ScanResult` for every included URL.
4. FOR ALL URLs in the final scan list, parsing the `SitemapCrawlResult` source map and looking up the URL SHALL return a non-empty `SitemapSource` string (round-trip property).
