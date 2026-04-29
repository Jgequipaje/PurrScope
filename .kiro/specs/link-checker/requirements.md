# Requirements Document: Link Checker

## Introduction

The Link Checker feature adds comprehensive link health validation to PurrScope. It enables users to discover and validate all links across a website using sitemap-based crawling, checking for broken links, redirect chains, performance issues, SEO best practices, environment leaks, and accessibility concerns. The feature reuses PurrScope's existing sitemap crawling infrastructure and Playwright-based scanning patterns to provide fast, concurrent link validation with detailed reporting.

## Critical Constraint: Zero Impact on Existing SEO Checker

**"Use all related logics, presentations, styling, etc from the SEO Checker, but make sure any changes we will be doing does not affect the existing SEO Checker processes"**

This constraint means:

1. **Maximum Code Reuse** — Reuse existing components, utilities, and patterns from the SEO checker wherever possible
2. **Zero Breaking Changes** — No modifications to existing SEO checker code that could affect its functionality
3. **Additive Only** — New code should be isolated to link checker-specific files
4. **Shared Utilities** — Use existing utilities (sitemap, theme, types, duration, history) without modification

### Code Reuse Strategy

**Components to Reuse (No Modifications):**

- `components/ResultsTable.tsx` — Extract styled components into shared file, or create generic version
- `components/SitemapInput.tsx` — Reuse for URL input
- `components/ScopeSelector.tsx` — Adapt pattern for page selection
- `components/ModeTabs.tsx` — Add "Links" tab without breaking existing tabs
- `components/RecentSearches.tsx` — Reuse pattern for recent link scans

**Utilities to Reuse (No Modifications):**

- `lib/sitemap.ts` — Use existing sitemap crawling functions
- `lib/sitemapGroups.ts` — Use existing dynamic page grouping
- `lib/theme.tsx` — Use existing theme tokens and ThemeProvider
- `lib/types.ts` — Add new types, don't modify existing ones
- `lib/duration.ts` — Use existing timer utilities
- `lib/history.ts` — Use existing localStorage helpers

**Patterns to Reuse:**

- `scan/pipelines/improvedProcess.ts` — Follow concurrent execution pattern
- `app/api/scan-improved/route.ts` — Follow API route structure
- `app/page.tsx` — Follow state management pattern

## Glossary

- **Link_Checker**: The system component responsible for discovering, extracting, and validating links across web pages
- **Link_Extractor**: The component that parses HTML to identify link elements from page content
- **Sitemap_Crawler**: The existing PurrScope component that discovers page URLs from sitemap files
- **Page_Selector**: The UI component that allows users to choose which discovered pages to scan for links
- **Link_Validator**: The component that performs HTTP requests to validate link health and collect metadata
- **Static_Link**: A link defined in HTML markup (`<a>`, `<area>`, `<link>` tags)
- **Internal_Link**: A link pointing to the same domain as the source page
- **External_Link**: A link pointing to a different domain than the source page
- **Canonical_Link**: A link defined in `<link rel="canonical">` tags for SEO purposes
- **Redirect_Chain**: A sequence of HTTP redirects (3xx responses) from the original URL to the final destination
- **Environment_URL**: A URL pointing to non-production environments (staging, preview, development, localhost)
- **Link_Scope**: The user-selected option determining which links to validate (internal-only or all links)
- **Source_Page**: The page on which a link was discovered
- **Response_Time**: The duration in milliseconds from request initiation to response completion
- **Dynamic_Page**: A page URL containing route parameters (e.g., `/blog/[slug]`)
- **Static_Page**: A page URL without route parameters

## Requirements

### Requirement 1: Sitemap-Based Page Discovery

**User Story:** As a QA engineer, I want to discover pages via sitemap crawling, so that I can select which pages to scan for links.

#### Acceptance Criteria

1. WHEN a user enters a site URL, THE Link_Checker SHALL reuse the existing `crawlSitemap` function from `lib/sitemap.ts` without modification
2. THE Link_Checker SHALL reuse the existing Sitemap_Crawler to discover all available pages
3. THE Link_Checker SHALL display the total count of discovered pages to the user
4. THE Link_Checker SHALL group discovered pages into Static_Page and Dynamic_Page categories using the existing sitemapGroups logic
5. THE Link_Checker SHALL present the Page_Selector UI after successful sitemap crawling
6. IF sitemap crawling fails, THEN THE Link_Checker SHALL display a descriptive error message and allow retry

### Requirement 2: Page Selection Options

**User Story:** As a QA engineer, I want to select which pages to scan for links, so that I can focus on relevant sections of the site.

#### Acceptance Criteria

1. THE Page_Selector SHALL reuse the page grouping logic from `lib/sitemapGroups.ts` without modification
2. THE Page_Selector SHALL provide an "All Pages" option that includes every discovered page
3. THE Page_Selector SHALL provide a "Static Pages Only" option that excludes Dynamic_Page URLs
4. THE Page_Selector SHALL provide a "Dynamic Pages Only" option that includes only Dynamic_Page URLs
5. WHERE dynamic page groups exist, THE Page_Selector SHALL provide checkboxes for selecting specific groups
6. THE Page_Selector SHALL provide an optional numeric limit input for capping the number of pages to scan
7. WHEN the user changes page selection, THE Page_Selector SHALL display the updated count of pages selected for scanning
8. THE Page_Selector SHALL validate that at least one page is selected before allowing scan initiation

### Requirement 3: Static Link Extraction

**User Story:** As a QA engineer, I want to extract static links from HTML, so that I can validate their health.

#### Acceptance Criteria

1. WHEN scanning a page, THE Link_Extractor SHALL extract all `<a href="...">` elements
2. WHEN scanning a page, THE Link_Extractor SHALL extract all `<area href="...">` elements from image maps
3. WHEN scanning a page, THE Link_Extractor SHALL extract all `<link rel="canonical" href="...">` elements
4. THE Link_Extractor SHALL normalize extracted URLs to absolute format using the Source_Page as the base
5. THE Link_Extractor SHALL record the Source_Page URL for each extracted link
6. THE Link_Extractor SHALL skip anchor-only links (href="#section") and javascript: protocol links
7. THE Link_Extractor SHALL skip mailto: and tel: protocol links

### Requirement 4: Link Scope Configuration

**User Story:** As a QA engineer, I want to choose which links to validate, so that I can control scan duration and focus.

#### Acceptance Criteria

1. THE Link_Checker SHALL provide an "Internal Links Only" Link_Scope option
2. THE Link_Checker SHALL provide an "All Links" Link_Scope option that includes both Internal_Link and External_Link URLs
3. WHEN "Internal Links Only" is selected, THE Link_Checker SHALL filter out all External_Link URLs before validation
4. WHEN "All Links" is selected, THE Link_Checker SHALL validate both Internal_Link and External_Link URLs
5. THE Link_Checker SHALL display the count of links selected for validation based on the current Link_Scope

### Requirement 5: Link Deduplication

**User Story:** As a QA engineer, I want each unique link validated once, so that scans complete faster and results are clearer.

#### Acceptance Criteria

1. THE Link_Checker SHALL deduplicate links by URL before validation
2. WHEN multiple Source_Page instances contain the same link URL, THE Link_Checker SHALL validate that URL once
3. THE Link_Checker SHALL track all Source_Page URLs for each unique link
4. THE Link_Checker SHALL display the list of Source_Page URLs in the results for each validated link

### Requirement 6: HTTP Status Detection

**User Story:** As a QA engineer, I want to know the HTTP status of each link, so that I can identify broken links.

#### Acceptance Criteria

1. WHEN validating a link, THE Link_Validator SHALL record the HTTP status code
2. THE Link_Validator SHALL classify 2xx status codes as success
3. THE Link_Validator SHALL classify 3xx status codes as redirects
4. THE Link_Validator SHALL classify 4xx status codes as client errors
5. THE Link_Validator SHALL classify 5xx status codes as server errors
6. WHEN a link times out, THE Link_Validator SHALL record a timeout status
7. WHEN a link is unreachable due to DNS or network errors, THE Link_Validator SHALL record an unreachable status

### Requirement 7: Redirect Chain Analysis

**User Story:** As a QA engineer, I want to see redirect chains, so that I can identify unnecessary redirects that slow page load.

#### Acceptance Criteria

1. WHEN a link returns a 3xx status, THE Link_Validator SHALL follow the redirect chain to the final destination
2. THE Link_Validator SHALL record each URL in the redirect chain in order
3. THE Link_Validator SHALL count the total number of redirect hops
4. WHEN a redirect chain exceeds 3 hops, THE Link_Validator SHALL flag the link with an "excessive redirects" warning
5. THE Link_Validator SHALL display the complete redirect chain in the results

### Requirement 8: Response Time Tracking

**User Story:** As a QA engineer, I want to measure link response times, so that I can identify slow external resources.

#### Acceptance Criteria

1. WHEN validating a link, THE Link_Validator SHALL measure the Response_Time from request start to response completion
2. THE Link_Validator SHALL record Response_Time in milliseconds
3. WHEN Response_Time exceeds 3000 milliseconds, THE Link_Validator SHALL flag the link with a "slow response" warning
4. WHEN Response_Time exceeds 5000 milliseconds, THE Link_Validator SHALL flag the link with a "slow response" failure
5. THE Link_Validator SHALL display Response_Time in the results for each link

### Requirement 9: External Link Best Practices

**User Story:** As a QA engineer, I want to validate external link attributes, so that I can ensure security and UX best practices.

#### Acceptance Criteria

1. WHEN an External_Link lacks `target="_blank"`, THE Link_Validator SHALL flag a "missing target blank" warning
2. WHEN an External_Link with `target="_blank"` lacks `rel="noopener"` or `rel="noreferrer"`, THE Link_Validator SHALL flag a "missing noopener/noreferrer" security warning
3. THE Link_Validator SHALL check both `rel="noopener"` and `rel="noreferrer"` attributes independently
4. THE Link_Validator SHALL display external link attribute warnings in the results

### Requirement 10: Mixed Content Detection

**User Story:** As a QA engineer, I want to detect HTTP links on HTTPS pages, so that I can fix mixed content warnings.

#### Acceptance Criteria

1. WHEN a Source_Page uses HTTPS protocol, THE Link_Validator SHALL check if extracted links use HTTP protocol
2. WHEN an HTTP link is found on an HTTPS Source_Page, THE Link_Validator SHALL flag a "mixed content" warning
3. THE Link_Validator SHALL skip mixed content checks for Source_Page URLs using HTTP protocol
4. THE Link_Validator SHALL display mixed content warnings in the results

### Requirement 11: Internal Link Path Analysis

**User Story:** As a QA engineer, I want to identify internal links using absolute URLs, so that I can convert them to relative paths for better portability.

#### Acceptance Criteria

1. WHEN an Internal_Link uses an absolute URL format, THE Link_Validator SHALL flag an "absolute URL for internal link" warning
2. THE Link_Validator SHALL suggest using relative paths for Internal_Link URLs
3. THE Link_Validator SHALL skip this check for External_Link URLs
4. THE Link_Validator SHALL display internal link path warnings in the results

### Requirement 12: Environment URL Detection

**User Story:** As a QA engineer, I want to detect staging and development URLs, so that I can prevent them from reaching production.

#### Acceptance Criteria

1. WHEN a link URL contains ".staging.", ".dev.", or "staging." subdomain patterns, THE Link_Validator SHALL flag an "environment URL detected" failure
2. WHEN a link URL contains "preview." subdomain or ".netlify.app" or ".vercel.app" domains, THE Link_Validator SHALL flag a "preview URL detected" failure
3. WHEN a link URL contains "localhost" or "127.0.0.1" or IP address patterns, THE Link_Validator SHALL flag a "development URL detected" failure
4. THE Link_Validator SHALL display environment URL warnings in the results with the detected pattern

### Requirement 13: Link Accessibility Validation

**User Story:** As a QA engineer, I want to validate link accessibility, so that I can ensure all users can navigate the site.

#### Acceptance Criteria

1. WHEN a link has empty text content, THE Link_Validator SHALL flag an "empty link text" accessibility failure
2. WHEN a link contains only generic text ("click here", "read more", "here", "link"), THE Link_Validator SHALL flag a "generic link text" accessibility warning
3. WHEN a link contains only an icon or image without `aria-label` or `alt` text, THE Link_Validator SHALL flag a "missing accessible label" accessibility failure
4. WHEN link text exceeds 100 characters, THE Link_Validator SHALL flag an "overly long link text" accessibility warning
5. THE Link_Validator SHALL display accessibility warnings in the results

### Requirement 14: Concurrent Link Validation

**User Story:** As a QA engineer, I want links validated concurrently, so that scans complete quickly.

#### Acceptance Criteria

1. THE Link_Validator SHALL validate multiple links concurrently using a configurable concurrency limit
2. THE Link_Validator SHALL default to a concurrency limit of 5 simultaneous requests
3. THE Link_Validator SHALL reuse browser contexts across link validations to reduce overhead
4. WHEN a link validation fails, THE Link_Validator SHALL continue validating remaining links
5. THE Link_Validator SHALL provide progress updates showing completed vs total link count

### Requirement 15: Link Validation Timeout Handling

**User Story:** As a QA engineer, I want configurable timeouts, so that slow links don't block the entire scan.

#### Acceptance Criteria

1. THE Link_Validator SHALL apply a configurable timeout to each link validation request
2. THE Link_Validator SHALL default to a 10-second timeout per link
3. WHEN a link validation exceeds the timeout, THE Link_Validator SHALL abort the request and record a timeout status
4. THE Link_Validator SHALL continue validating remaining links after a timeout occurs

### Requirement 16: Link Validation Retry Logic

**User Story:** As a QA engineer, I want automatic retries for network errors, so that transient failures don't cause false positives.

#### Acceptance Criteria

1. WHEN a link validation fails with a network error, THE Link_Validator SHALL retry the request once
2. THE Link_Validator SHALL wait 1 second between retry attempts
3. WHEN the retry succeeds, THE Link_Validator SHALL record the successful result
4. WHEN the retry fails, THE Link_Validator SHALL record the failure with a descriptive error message
5. THE Link_Validator SHALL not retry for 4xx or 5xx HTTP status codes

### Requirement 17: Results Table Structure

**User Story:** As a QA engineer, I want a well-organized results table, so that I can efficiently review link validation results.

#### Acceptance Criteria

1. THE Link_Checker SHALL reuse styled components from `components/ResultsTable.tsx` or extract them into a shared styles file
2. THE Link_Checker SHALL wrap the results table in a bordered container with border-radius and box-shadow matching the SEO ResultsTable design
3. THE Link_Checker SHALL display a summary bar at the top showing total links, failed count, warning count, passed count, and scan duration with color-coded icons
4. THE Link_Checker SHALL display a toolbar below the summary bar containing filter tabs on the left and search/action buttons on the right
5. THE Link_Checker SHALL display a scrollable table with sticky header below the toolbar
6. THE Link_Checker SHALL display a footer bar at the bottom with status summary on the left and pagination controls on the right
7. THE Link_Checker SHALL use theme tokens from `lib/theme.tsx` for all colors, never hardcoded hex values
8. THE Link_Checker SHALL apply a fade-in animation to table rows matching the SEO table animation timing

### Requirement 18: Filter Tabs

**User Story:** As a QA engineer, I want to filter results by status using tabs, so that I can focus on specific link categories.

#### Acceptance Criteria

1. THE Link_Checker SHALL provide filter tabs: "All", "Failed", "Warnings", "Passed"
2. WHEN a tab is selected, THE Link_Checker SHALL display only links matching that status category
3. THE Link_Checker SHALL display the count of links in each tab using the format "Tab Name (count)"
4. THE Link_Checker SHALL disable tabs with zero count and reduce their opacity to 0.4
5. THE Link_Checker SHALL highlight the active tab with a different background color using theme tokens
6. WHEN a filter tab is clicked, THE Link_Checker SHALL reset pagination to page 1
7. THE Link_Checker SHALL update the displayed results and counts immediately when a tab is selected

### Requirement 19: Search Functionality

**User Story:** As a QA engineer, I want to search results by URL, so that I can quickly find specific links.

#### Acceptance Criteria

1. THE Link_Checker SHALL provide a search input in the toolbar with a search icon and placeholder text "Search URLs…"
2. WHEN text is entered in the search input, THE Link_Checker SHALL filter results to show only links whose URL contains the search text (case-insensitive)
3. THE Link_Checker SHALL update the displayed results immediately as the user types
4. WHEN a search is active, THE Link_Checker SHALL reset pagination to page 1
5. THE Link_Checker SHALL display "No matching results for your search." when search returns zero results
6. THE Link_Checker SHALL style the search input with border, border-radius, and background matching the SEO table design

### Requirement 20: Copy/Export Button

**User Story:** As a QA engineer, I want to copy or export results, so that I can share findings with my team.

#### Acceptance Criteria

1. THE Link_Checker SHALL provide a "Copy" button in the toolbar (top right, next to search input)
2. WHEN the copy button is clicked, THE Link_Checker SHALL copy all link validation results to the clipboard in a structured text format
3. THE Link_Checker SHALL change the button text to "Copied!" and display a checkmark icon for 2 seconds after successful copy
4. THE Link_Checker SHALL include all validated links in the copy operation regardless of current filters or search
5. THE Link_Checker SHALL style the copy button with border, border-radius, padding, and colors matching the SEO table design
6. THE Link_Checker SHALL display the copy button with an icon (RiFileCopyLine when idle, RiCheckLine when copied)

### Requirement 21: Table Columns and Sorting

**User Story:** As a QA engineer, I want to sort results by different columns, so that I can analyze links in different orders.

#### Acceptance Criteria

1. THE Link_Checker SHALL display columns: Expand Arrow, Link URL, Link Type, Status, Response Time, Issues
2. THE Link_Checker SHALL make the Link URL, Status, and Response Time columns sortable
3. WHEN a sortable column header is clicked, THE Link_Checker SHALL sort results by that column in ascending order
4. WHEN a sorted column header is clicked again, THE Link_Checker SHALL toggle between ascending and descending order
5. THE Link_Checker SHALL display a sort indicator (↑ or ↓) next to the active sort column name
6. WHEN sorting changes, THE Link_Checker SHALL reset pagination to page 1
7. THE Link_Checker SHALL style sortable column headers with cursor pointer and hover opacity effect

### Requirement 22: Expandable Rows

**User Story:** As a QA engineer, I want to expand rows to see full link details, so that I can investigate issues thoroughly.

#### Acceptance Criteria

1. WHEN a table row is clicked, THE Link_Checker SHALL expand that row to show detailed link information
2. WHEN an expanded row is clicked again, THE Link_Checker SHALL collapse the row
3. THE Link_Checker SHALL display an expand/collapse arrow icon in the first column (RiArrowDownSLine when collapsed, RiArrowUpSLine when expanded)
4. THE Link_Checker SHALL display expanded content in a grid layout with 2 columns on desktop and 1 column on mobile
5. THE Link_Checker SHALL show in the expanded section: Full URL, All Source Pages (where link was found), Complete Redirect Chain, All Detected Issues, Response Headers (if relevant)
6. THE Link_Checker SHALL apply a left border accent color to expanded rows using theme tokens
7. THE Link_Checker SHALL use a different background color for the expanded content area using theme token `bgSubtle`

### Requirement 23: Row Styling and Visual Indicators

**User Story:** As a QA engineer, I want visual indicators for link status, so that I can quickly identify issues.

#### Acceptance Criteria

1. THE Link_Checker SHALL apply a left border accent (3px solid) to failed link rows using theme token `rowFailBorder`
2. THE Link_Checker SHALL use different row background colors for failed vs passed links using theme tokens `rowFail` and `rowOk`
3. THE Link_Checker SHALL display status pills with icons: Pass (green with checkmark), Fail (red with X), Warn (yellow/orange with warning icon)
4. THE Link_Checker SHALL display subtext below the link URL showing "Found on: X pages" in a smaller, muted font
5. WHEN a link has redirects, THE Link_Checker SHALL display the redirect chain in subtext with a corner-down-right arrow icon
6. WHEN a link has errors, THE Link_Checker SHALL display error messages in subtext with a warning icon in fail text color
7. THE Link_Checker SHALL apply a hover effect (filter brightness 0.97) to table rows

### Requirement 24: Pagination

**User Story:** As a QA engineer, I want paginated results, so that I can navigate large result sets efficiently.

#### Acceptance Criteria

1. THE Link_Checker SHALL display pagination controls in the footer when results exceed 25 links
2. THE Link_Checker SHALL provide a page size selector with options: 25, 50, 100 per page
3. THE Link_Checker SHALL default to 25 results per page
4. THE Link_Checker SHALL display Previous and Next buttons with arrow icons (RiArrowLeftSLine, RiArrowRightSLine)
5. THE Link_Checker SHALL display page number buttons showing up to 5 pages around the current page
6. THE Link_Checker SHALL display ellipsis (…) between non-consecutive page numbers
7. THE Link_Checker SHALL disable Previous button on page 1 and Next button on the last page
8. THE Link_Checker SHALL highlight the active page button with a different background color using theme tokens
9. WHEN page size changes, THE Link_Checker SHALL reset to page 1

### Requirement 25: Footer Status Summary

**User Story:** As a QA engineer, I want a footer summary, so that I can see overall link health at a glance.

#### Acceptance Criteria

1. THE Link_Checker SHALL display a status summary in the footer left section with an icon
2. WHEN all links pass, THE Link_Checker SHALL display "All X links passed." with a green checkmark icon in success text color
3. WHEN links have issues, THE Link_Checker SHALL display "X of Y links need attention." with a red X icon in warning text color
4. WHEN filters or search are active, THE Link_Checker SHALL display "· showing X filtered" in faint text color
5. THE Link_Checker SHALL use theme tokens for footer background color: `toolbarPassBg` when all pass, `toolbarFailBg` when issues exist

### Requirement 26: Summary Bar Metrics

**User Story:** As a QA engineer, I want to see key metrics at the top of the table, so that I can quickly assess scan results.

#### Acceptance Criteria

1. THE Link_Checker SHALL reuse the `formatDuration` and `executionLabel` functions from `lib/duration.ts` without modification
2. THE Link_Checker SHALL display the total count of links checked with a checkmark icon in muted text color
3. THE Link_Checker SHALL display the count of failed links with an error warning icon in warning text color (only when count > 0)
4. THE Link_Checker SHALL display the count of passed links with a checkmark icon in pass text color
5. THE Link_Checker SHALL display the scan duration using the format from `lib/duration.ts` with `executionLabel` and `formatDuration`
6. THE Link_Checker SHALL use `SummaryChip` styled components with color-coded icons matching the SEO table design
7. THE Link_Checker SHALL display metrics in a flex layout with gap spacing matching the SEO table

### Requirement 27: Link Type Display

**User Story:** As a QA engineer, I want to see the link type, so that I can distinguish internal, external, and canonical links.

#### Acceptance Criteria

1. THE Link_Checker SHALL display the link type in a dedicated column: "Internal", "External", or "Canonical"
2. THE Link_Checker SHALL style link types with appropriate colors using theme tokens
3. THE Link_Checker SHALL allow filtering by link type using a secondary filter control (dropdown or additional tabs)
4. WHEN a link type filter is applied, THE Link_Checker SHALL update the displayed results and counts immediately

### Requirement 28: Empty States

**User Story:** As a QA engineer, I want clear empty state messages, so that I understand why no results are shown.

#### Acceptance Criteria

1. WHEN no results match the current filter, THE Link_Checker SHALL display "No results in this category." centered in the table
2. WHEN no results match the search query, THE Link_Checker SHALL display "No matching results for your search." centered in the table
3. THE Link_Checker SHALL style empty state messages in faint text color with appropriate padding (3rem vertical, 1rem horizontal)
4. THE Link_Checker SHALL display empty state messages in a single table cell spanning all columns

### Requirement 29: Progress Tracking During Scan

**User Story:** As a QA engineer, I want to see scan progress, so that I know how long to wait.

#### Acceptance Criteria

1. WHEN a link scan is in progress, THE Link_Checker SHALL display a progress indicator before the results table appears
2. THE Link_Checker SHALL show the count of pages scanned vs total pages to scan
3. THE Link_Checker SHALL show the count of links validated vs total links discovered
4. THE Link_Checker SHALL update progress indicators in real-time as the scan proceeds
5. THE Link_Checker SHALL display an estimated time remaining based on current scan rate
6. THE Link_Checker SHALL not display the results table until the scan is complete or cancelled

### Requirement 30: Scan Cancellation

**User Story:** As a QA engineer, I want to cancel a running scan, so that I can adjust settings and restart.

#### Acceptance Criteria

1. WHEN a link scan is in progress, THE Link_Checker SHALL display a "Cancel Scan" button
2. WHEN the cancel button is clicked, THE Link_Checker SHALL abort all in-progress link validations
3. THE Link_Checker SHALL display partial results for links that completed before cancellation
4. THE Link_Checker SHALL display a "Scan cancelled" message after cancellation
5. THE Link_Checker SHALL allow the user to start a new scan after cancellation

### Requirement 31: Recent Scans History

**User Story:** As a QA engineer, I want to see recent scans, so that I can quickly re-run common checks.

#### Acceptance Criteria

1. THE Link_Checker SHALL reuse the localStorage helper functions from `lib/history.ts` or follow the same pattern
2. THE Link_Checker SHALL store the 10 most recent scan configurations in browser localStorage
3. THE Link_Checker SHALL display a "Recent Scans" list showing site URL and scan date
4. WHEN a recent scan is clicked, THE Link_Checker SHALL populate the URL input and page selection with the saved configuration
5. THE Link_Checker SHALL provide a "Clear History" button to remove all recent scans
6. THE Link_Checker SHALL update the recent scans list after each successful scan

### Requirement 32: Links Tab Integration

**User Story:** As a QA engineer, I want to access the link checker from a dedicated tab, so that I can switch between SEO and link checking workflows.

#### Acceptance Criteria

1. THE Link_Checker SHALL be accessible via a "Links" tab in the main navigation
2. THE Link_Checker SHALL maintain independent state from the SEO scan tabs
3. WHEN switching to the Links tab, THE Link_Checker SHALL preserve the current scan state
4. WHEN switching away from the Links tab, THE Link_Checker SHALL preserve the current scan state
5. THE Link_Checker SHALL follow the existing PurrScope tab styling and interaction patterns

### Requirement 33: Error Handling and User Feedback

**User Story:** As a QA engineer, I want clear error messages, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN sitemap crawling fails, THE Link_Checker SHALL display a descriptive error message with the failure reason
2. WHEN page extraction fails, THE Link_Checker SHALL log the error and continue with remaining pages
3. WHEN link validation fails with a network error, THE Link_Checker SHALL record the specific error type (DNS, timeout, SSL, connection refused)
4. THE Link_Checker SHALL display error details in the results view for each failed link
5. THE Link_Checker SHALL provide a "Retry Failed Links" button to re-validate only failed links

### Requirement 34: API Route Implementation

**User Story:** As a developer, I want a dedicated API route for link checking, so that the feature follows PurrScope's architecture patterns.

#### Acceptance Criteria

1. THE Link_Checker SHALL implement an API route at `/api/links`
2. THE API route SHALL accept POST requests with parameters: siteUrl, pageUrls, linkScope, concurrency, timeout
3. THE API route SHALL return a JSON response with: links (array of link results), summary (counts), duration (milliseconds)
4. THE API route SHALL handle request cancellation via AbortSignal
5. THE API route SHALL return appropriate HTTP status codes (200 for success, 400 for validation errors, 500 for server errors)

### Requirement 35: Type Definitions

**User Story:** As a developer, I want TypeScript types for link checking, so that the codebase remains type-safe.

#### Acceptance Criteria

1. THE Link_Checker SHALL define a `LinkCheckResult` type in `lib/types.ts` with fields: url, status, statusCode, responseTime, redirectChain, issues, foundOn, linkType
2. THE Link_Checker SHALL define a `LinkIssue` type with fields: type, severity, message
3. THE Link_Checker SHALL define a `LinkScope` type as a union: "internal" | "all"
4. THE Link_Checker SHALL define a `LinkType` type as a union: "internal" | "external" | "canonical"
5. THE Link_Checker SHALL export all link-related types from `lib/types.ts` for use across components and API routes

### Requirement 36: Styled Components Reuse

**User Story:** As a developer, I want to reuse styled components from ResultsTable, so that the link checker table maintains visual consistency.

#### Acceptance Criteria

1. THE Link_Checker SHALL extract shared styled components into `components/ResultsTable.styles.ts` and refactor both SEO and link checker tables to import from this shared file, ensuring zero breaking changes to existing SEO functionality
2. THE Link_Checker SHALL reuse or adapt styled components from `components/ResultsTable.tsx`: TableWrap, SummaryBar, SummaryChip, Toolbar, TabGroup, TabBtn, SearchWrap, SearchInput, CopyBtn, Table, Thead, Th, Td, DataRow, ExpandedTd, FooterBar, PillSpan
3. THE Link_Checker SHALL use the same animation keyframes (fadeIn) from ResultsTable
4. THE Link_Checker SHALL use the same transition timing (0.15s) for hover effects and state changes
5. THE Link_Checker SHALL use transient props (prefixed with $) for all styled-component props to avoid DOM forwarding
6. THE Link_Checker SHALL import and use theme tokens from `lib/theme.tsx` for all color values

### Requirement 37: Code Reuse and Isolation

**User Story:** As a developer, I want the link checker to reuse existing SEO checker code, so that we maintain consistency and avoid duplication while ensuring zero impact on existing functionality.

#### Acceptance Criteria

1. THE Link_Checker SHALL reuse `components/ResultsTable.tsx` by either creating a generic `<ResultsTable>` component that accepts different data shapes via props, OR creating a new `<LinkResultsTable>` component that reuses the styled components and patterns from ResultsTable
2. THE Link_Checker SHALL NOT modify any existing SEO checker components, utilities, or API routes
3. THE Link_Checker SHALL add new types to `lib/types.ts` without modifying existing type definitions
4. THE Link_Checker SHALL reuse existing sitemap crawling functions from `lib/sitemap.ts` without modification
5. THE Link_Checker SHALL reuse existing theme tokens from `lib/theme.tsx` without adding new tokens
6. THE Link_Checker SHALL follow the same state management pattern as `app/page.tsx` for the Links tab
7. THE Link_Checker SHALL create isolated API routes (`app/api/links/route.ts`) that don't affect existing scan routes
8. THE Link_Checker SHALL create isolated utility files (`lib/linkChecker.ts`, `lib/linkExtractor.ts`) that don't modify existing utilities
9. THE Link_Checker SHALL add the "Links" tab to `components/ModeTabs.tsx` in a way that doesn't break existing tab functionality
10. THE Link_Checker SHALL ensure all new code is isolated to link checker-specific files and doesn't create dependencies that affect SEO checker behavior

### Requirement 38: ResultsTable Generalization Strategy

**User Story:** As a developer, I want a clear strategy for reusing ResultsTable, so that both SEO and link checker can use the same component without conflicts.

#### Acceptance Criteria

1. THE Link_Checker implementation SHALL choose ONE of these approaches:
   - **Option A (Preferred)**: Create a generic `<ResultsTable>` component that accepts a config object defining columns, data mapping, and expand content, then refactor both SEO and link checker to use it
   - **Option B**: Create `<LinkResultsTable>` that imports and reuses styled components from `components/ResultsTable.tsx` but implements link-specific logic independently
2. IF Option A is chosen, THE implementation SHALL ensure the refactored `<ResultsTable>` maintains 100% backward compatibility with existing SEO checker usage
3. IF Option A is chosen, THE implementation SHALL create a migration path that allows testing the new generic component without breaking existing SEO functionality
4. IF Option B is chosen, THE implementation SHALL extract shared styled components into a separate file (e.g., `components/ResultsTable.styles.ts`) that both components import
5. THE chosen approach SHALL be documented in the design document with rationale

### Requirement 39: Shared Styled Components

**User Story:** As a developer, I want to share styled components between SEO and link checker tables, so that styling remains consistent without duplication.

#### Acceptance Criteria

1. THE Link_Checker SHALL extract reusable styled components from `components/ResultsTable.tsx` into a shared file (e.g., `components/ResultsTable.styles.ts`)
2. THE shared styled components SHALL include: TableWrap, SummaryBar, SummaryChip, Toolbar, TabGroup, TabBtn, ToolbarRight, SearchWrap, SearchInput, CopyBtn, ScrollWrap, Table, Thead, Th, Td, DataRow, ExpandCell, UrlCell, UrlText, UrlAnchor, SubLine, PillSpan, LengthSpan, MissingSpan, CautionBadge, ExpandedTd, ExpandedGrid, ExpandedFieldLabel, ExpandedValue, FooterBar, FooterLeft, PaginationWrap, PageBtn, PageSizeSelect, EmptyRow, EmptyTd, IconWrap, ExecutionBadge, and all other styled components
3. THE existing `components/ResultsTable.tsx` SHALL be refactored to import styled components from the shared file
4. THE new `components/LinkResultsTable.tsx` SHALL import styled components from the shared file
5. THE refactoring SHALL maintain 100% visual and functional compatibility with existing SEO checker
6. THE refactoring SHALL be done in a way that allows incremental testing (refactor SEO table first, verify it works, then build link table)

### Requirement 40: Type Safety and Extension

**User Story:** As a developer, I want type-safe link checker types that extend existing patterns, so that the codebase remains maintainable.

#### Acceptance Criteria

1. THE Link_Checker SHALL add new types to `lib/types.ts` in a dedicated section with a comment header "// Link Checker Types"
2. THE Link_Checker SHALL NOT modify existing type definitions for `ScanResult`, `ScanScope`, `FilterResult`, etc.
3. THE Link_Checker SHALL define `LinkCheckResult` as a new type that follows the same structure pattern as `ScanResult`
4. THE Link_Checker SHALL define `LinkIssue`, `LinkScope`, `LinkType` as new types that don't conflict with existing types
5. THE Link_Checker SHALL use TypeScript utility types (Pick, Omit, Partial) to compose new types from existing ones where appropriate

### Requirement 41: API Route Isolation

**User Story:** As a developer, I want isolated API routes for link checking, so that SEO scan routes remain unaffected.

#### Acceptance Criteria

1. THE Link_Checker SHALL create a new API route at `app/api/links/route.ts`
2. THE Link_Checker SHALL NOT modify existing API routes: `app/api/scan/route.ts`, `app/api/scan-improved/route.ts`, `app/api/sitemap/route.ts`
3. THE Link_Checker API route SHALL follow the same structure and error handling patterns as `app/api/scan-improved/route.ts`
4. THE Link_Checker API route SHALL use the same request/response patterns (POST with JSON body, NextResponse)
5. THE Link_Checker API route SHALL handle AbortSignal for cancellation like existing scan routes

### Requirement 42: State Management Isolation

**User Story:** As a developer, I want isolated state management for link checking, so that SEO scan state remains unaffected.

#### Acceptance Criteria

1. THE Link_Checker SHALL add link checker state to `app/page.tsx` in a separate section with clear boundaries
2. THE Link_Checker SHALL NOT modify existing SEO scan state variables or handlers
3. THE Link_Checker SHALL follow the same state management pattern as SEO checker (useState, useMemo, useCallback)
4. THE Link_Checker SHALL use separate state variables for: linkResults, linkScanTimer, linkSitemapData, linkSelectedPages, linkScope
5. THE Link_Checker SHALL ensure switching between tabs (Manual/Sitemap/Links) doesn't cause state conflicts or re-renders of inactive tabs

### Requirement 43: ModeTabs Extension

**User Story:** As a developer, I want to add the Links tab without breaking existing tabs, so that Manual and Sitemap modes continue to work perfectly.

#### Acceptance Criteria

1. THE Link_Checker SHALL add "Links" as a new mode to the `ScanMode` type in `components/ModeTabs.tsx`
2. THE Link_Checker SHALL add a "Links" tab button to the ModeTabs component
3. THE Link_Checker SHALL ensure the Links tab follows the same styling and interaction patterns as existing tabs
4. THE Link_Checker SHALL ensure clicking Manual or Sitemap tabs continues to work exactly as before
5. THE Link_Checker SHALL ensure the active tab state management doesn't break when adding the third tab

### Requirement 44: Zero Impact Verification

**User Story:** As a developer, I want to verify that link checker changes don't affect SEO checker, so that we can deploy with confidence.

#### Acceptance Criteria

1. THE Link_Checker implementation SHALL include a test plan that verifies all existing SEO checker functionality remains unchanged
2. THE test plan SHALL include manual testing of: Manual mode scan, Sitemap mode scan, Results table display, CSV export, Recent searches, Theme switching
3. THE test plan SHALL include automated tests (if applicable) that verify SEO scan API routes return identical responses before and after link checker implementation
4. THE implementation SHALL be done incrementally: 1) Extract shared components, 2) Verify SEO still works, 3) Build link checker, 4) Final verification
5. THE implementation SHALL include a rollback plan if any SEO functionality is affected
