# Implementation Plan: Link Checker

## Overview

This implementation plan follows a phased approach to add comprehensive link health validation to PurrScope. The feature reuses existing sitemap crawling infrastructure and follows the concurrent scanning pattern from `improvedProcess.ts`. All changes are additive and isolated to link checker-specific files to ensure zero impact on existing SEO checker functionality.

**Critical Constraint**: Maximum code reuse with zero impact on existing SEO checker processes.

**Implementation Strategy**: Extract shared components → Add types → Extend UI → Build utilities → Build API → Integrate → Verify

## Tasks

- [x] 1. Phase 1: Extract shared styled components (zero-impact refactor)
  - [x] 1.1 Create ResultsTable.styles.ts with all styled components
    - Create `components/ResultsTable.styles.ts`
    - Export all styled components from existing `ResultsTable.tsx` (TableWrap, SummaryBar, SummaryChip, Toolbar, TabGroup, TabBtn, ToolbarRight, SearchWrap, SearchInput, CopyBtn, ScrollWrap, Table, Thead, Th, Td, DataRow, ExpandCell, UrlCell, UrlText, UrlAnchor, SubLine, PillSpan, CautionBadge, ExpandedTd, ExpandedGrid, ExpandedFieldLabel, ExpandedValue, FooterBar, FooterLeft, PaginationWrap, PageBtn, PageSizeSelect, EmptyRow, EmptyTd, IconWrap, ExecutionBadge)
    - Ensure all theme token references are preserved
    - _Requirements: 17.1, 17.2, 17.7, 17.8_

  - [x] 1.2 Refactor ResultsTable.tsx to import from styles file
    - Update `components/ResultsTable.tsx` to import all styled components from `ResultsTable.styles.ts`
    - Remove styled component definitions from ResultsTable.tsx
    - Verify no functional changes to component logic
    - _Requirements: 17.1, 17.2_

  - [ ]\* 1.3 Verify SEO checker functionality unchanged
    - Run manual mode scan and verify results display correctly
    - Run sitemap mode scan and verify results display correctly
    - Test CSV export functionality
    - Test recent searches functionality
    - Test theme switching (dark/light)
    - Verify all filter tabs work
    - Verify search, sort, and pagination work
    - _Requirements: Critical Constraint (Zero Impact)_

- [x] 2. Phase 2: Add link checker types to type system
  - [x] 2.1 Add link checker types to lib/types.ts
    - Add `LinkType = "internal" | "external" | "canonical"`
    - Add `LinkScope = "internal" | "all"`
    - Add `LinkStatus` enum (success, redirect, client_error, server_error, timeout, unreachable)
    - Add `LinkIssueSeverity = "error" | "warning"`
    - Add `LinkIssue` type with type, severity, message fields
    - Add `LinkCheckResult` type with url, linkType, status, statusCode, responseTime, redirectChain, issues, foundOn, finalUrl, error fields
    - Add `LinkValidationRequest` type with siteUrl, pageUrls, linkScope, concurrency, timeout fields
    - Add `LinkValidationResponse` type with links, summary, duration fields
    - Update `Mode` type to include "links"
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

  - [ ]\* 2.2 Verify TypeScript compilation succeeds
    - Run `npm run build` to verify no type errors
    - Verify no type errors in existing code
    - _Requirements: Critical Constraint (Zero Impact)_

- [x] 3. Phase 3: Extend ModeTabs with Links tab
  - [x] 3.1 Add "links" mode to ModeTabs component
    - Update `LABELS` constant in `components/ModeTabs.tsx` to include `links: "Link_Checker"`
    - Verify tab renders with correct styling
    - _Requirements: 32.1, 32.2_

  - [ ]\* 3.2 Verify existing tabs still work
    - Test Manual tab is clickable and displays correct content
    - Test Sitemap tab is clickable and displays correct content
    - Test Links tab is clickable
    - Verify tab styling matches existing pattern
    - _Requirements: 32.3, 32.4, 32.5, Critical Constraint_

- [x] 4. Phase 4: Build link checker utilities
  - [x] 4.1 Create link extraction utility
    - Create `lib/linkExtractor.ts`
    - Implement `extractLinksFromPage(pageUrl, signal)` function using Playwright
    - Extract all `<a href>`, `<area href>`, `<link rel="canonical">` elements
    - Normalize URLs to absolute format using page URL as base
    - Skip anchor-only (#), javascript:, mailto:, tel: links
    - Return array of extracted links with url, linkType, sourceElement, linkText, attributes (target, rel, aria-label)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]\* 4.2 Write unit tests for link extraction
    - Test extraction of `<a>` tags with various href formats
    - Test extraction of `<area>` tags from image maps
    - Test extraction of `<link rel="canonical">` tags
    - Test URL normalization (relative → absolute)
    - Test skipping of anchor-only, javascript:, mailto:, tel: links
    - Test handling of malformed HTML
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 4.3 Create link deduplication and issue detection utility
    - Create `lib/linkChecker.ts`
    - Implement `deduplicateLinks(extractedLinks, linkScope, baseDomain)` function
    - Group links by URL and track all source pages
    - Filter by linkScope (internal-only vs all)
    - Return Map of unique links with metadata
    - Implement `detectIssues(linkResult, extractedLink)` function
    - Detect HTTP status issues (4xx, 5xx, timeout, unreachable)
    - Detect performance issues (slow response > 3000ms, very slow > 5000ms)
    - Detect redirect issues (chain > 3 hops)
    - Detect external link best practices (missing target="\_blank", missing noopener/noreferrer)
    - Detect mixed content (HTTP link on HTTPS page)
    - Detect internal link path issues (absolute URL for internal link)
    - Detect environment URLs (staging, dev, preview, localhost patterns)
    - Detect accessibility issues (empty link text, generic text, missing accessible label, long link text)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1-6.7, 7.1-7.5, 8.1-8.5, 9.1-9.4, 10.1-10.4, 11.1-11.4, 12.1-12.4, 13.1-13.5_

  - [ ]\* 4.4 Write unit tests for deduplication and issue detection
    - Test deduplication by URL
    - Test tracking multiple source pages per link
    - Test filtering internal vs external links
    - Test issue detection for all issue types (HTTP status, performance, redirects, external link attributes, mixed content, internal link paths, environment URLs, accessibility)
    - _Requirements: 5.1, 5.2, 5.3, 6.1-6.7, 7.1-7.5, 8.1-8.5, 9.1-9.4, 10.1-10.4, 11.1-11.4, 12.1-12.4, 13.1-13.5_

  - [x] 4.5 Create concurrent link validation pipeline
    - Create `scan/pipelines/linkValidationProcess.ts`
    - Implement `extractLinksFromPages(pageUrls, concurrency, signal)` function
    - Use concurrent execution pattern from `improvedProcess.ts` with configurable concurrency (default 3)
    - Reuse browser context across page extractions
    - Handle per-page extraction errors gracefully (log, continue with remaining pages)
    - Implement `validateLinks(links, timeout, concurrency, signal)` function
    - Perform HTTP HEAD requests to validate links
    - Follow redirects and track redirect chain
    - Measure response time
    - Use concurrent execution with configurable concurrency (default 5)
    - Apply configurable timeout per link (default 10 seconds)
    - Retry once on network errors (not 4xx/5xx)
    - Handle per-link validation errors gracefully
    - Implement `runLinkValidation(request, signal)` main orchestrator function
    - Call extractLinksFromPages → deduplicateLinks → validateLinks → detectIssues
    - Return LinkValidationResponse with results, summary, duration
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]\* 4.6 Write integration tests for validation pipeline
    - Test concurrent page extraction
    - Test link deduplication across pages
    - Test concurrent link validation
    - Test timeout handling
    - Test retry logic for network errors
    - Test cancellation via AbortSignal
    - _Requirements: 14.1-14.5, 15.1-15.4, 16.1-16.5_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 5: Build link checker API route
  - [x] 6.1 Create /api/links route handler
    - Create `app/api/links/route.ts`
    - Implement POST handler accepting LinkValidationRequest
    - Validate request parameters (siteUrl, pageUrls array not empty, linkScope valid, concurrency 1-10, timeout 1000-30000ms)
    - Return 400 for validation errors with descriptive messages
    - Call `runLinkValidation` from linkValidationProcess
    - Return 200 with LinkValidationResponse on success
    - Return 500 for server errors with error message
    - Support AbortSignal for request cancellation
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5_

  - [ ]\* 6.2 Test API route with manual requests
    - Test valid request returns 200 with results
    - Test invalid request (empty pageUrls) returns 400
    - Test invalid request (invalid linkScope) returns 400
    - Test request cancellation via AbortSignal
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5_

  - [ ]\* 6.3 Verify existing scan APIs unaffected
    - Test /api/scan route still works
    - Test /api/scan-improved route still works
    - Test /api/sitemap route still works
    - _Requirements: Critical Constraint (Zero Impact)_

- [x] 7. Phase 6: Build link checker UI components
  - [x] 7.1 Create PageSelector component
    - Create `components/PageSelector.tsx`
    - Accept props: pages, dynamicGroups, selectedScope, selectedGroups, onScopeChange, onGroupsChange, disabled
    - Provide radio buttons for "All Pages", "Static Pages Only", "Dynamic Pages Only"
    - Provide checkboxes for dynamic page groups (when available)
    - Display count of pages selected for scanning
    - Validate at least one page is selected
    - Style with theme tokens matching ScopeSelector pattern
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 7.2 Create LinkScopeSelector component
    - Create `components/LinkScopeSelector.tsx`
    - Accept props: scope, onChange, disabled
    - Provide radio buttons for "Internal Links Only" and "All Links"
    - Display count of links selected for validation based on scope
    - Style with theme tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Create LinkResultsTable component
    - Create `components/LinkResultsTable.tsx`
    - Import all styled components from `ResultsTable.styles.ts`
    - Accept props: results (LinkCheckResult[]), scanTimer (TimerState)
    - Implement summary bar with total links, failed count, warning count, passed count, scan duration using formatDuration and executionLabel from lib/duration.ts
    - Use SummaryChip components with color-coded icons (RiCheckboxCircleLine for pass, RiErrorWarningLine for fail/warn)
    - _Requirements: 17.1, 17.2, 17.3, 17.7, 17.8, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

  - [x] 7.4 Implement filter tabs in LinkResultsTable
    - Add filter tabs: "All", "Failed", "Warnings", "Passed"
    - Display count in each tab using format "Tab Name (count)"
    - Disable tabs with zero count (opacity 0.4)
    - Highlight active tab with different background using theme tokens
    - Filter results based on selected tab
    - Reset pagination to page 1 when tab changes
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 7.5 Implement search functionality in LinkResultsTable
    - Add search input in toolbar with search icon (RiSearchLine) and placeholder "Search URLs…"
    - Filter results by URL containing search text (case-insensitive)
    - Update results immediately as user types
    - Reset pagination to page 1 when search changes
    - Display "No matching results for your search." when search returns zero results
    - Style search input with border, border-radius, background matching SEO table
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [x] 7.6 Implement copy/export button in LinkResultsTable
    - Add "Copy" button in toolbar (top right, next to search input)
    - Copy all link validation results to clipboard in structured text format when clicked
    - Change button text to "Copied!" with checkmark icon (RiCheckLine) for 2 seconds
    - Include all validated links regardless of current filters or search
    - Style button with border, border-radius, padding matching SEO table
    - Use RiFileCopyLine icon when idle
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 7.7 Implement table columns and sorting in LinkResultsTable
    - Display columns: Expand Arrow, Link URL, Link Type, Status, Response Time, Issues
    - Make Link URL, Status, Response Time columns sortable
    - Toggle between ascending/descending order on column header click
    - Display sort indicator (↑ or ↓) next to active sort column
    - Reset pagination to page 1 when sorting changes
    - Style sortable column headers with cursor pointer and hover opacity effect
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [x] 7.8 Implement expandable rows in LinkResultsTable
    - Expand row to show detailed link information when clicked
    - Collapse row when clicked again
    - Display expand/collapse arrow icon in first column (RiArrowDownSLine collapsed, RiArrowUpSLine expanded)
    - Display expanded content in grid layout (2 columns desktop, 1 column mobile)
    - Show in expanded section: Full URL, All Source Pages, Complete Redirect Chain, All Detected Issues, Response Headers (if relevant)
    - Apply left border accent color to expanded rows using theme tokens
    - Use different background color for expanded content (bgSubtle theme token)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [x] 7.9 Implement row styling and visual indicators in LinkResultsTable
    - Apply left border accent (3px solid) to failed link rows using rowFailBorder theme token
    - Use different row background colors for failed vs passed links (rowFail and rowOk theme tokens)
    - Display status pills with icons: Pass (green checkmark), Fail (red X), Warn (yellow/orange warning)
    - Display subtext below link URL showing "Found on: X pages" in smaller, muted font
    - Display redirect chain in subtext with corner-down-right arrow icon (RiCornerDownRightLine) when link has redirects
    - Display error messages in subtext with warning icon in fail text color when link has errors
    - Apply hover effect (filter brightness 0.97) to table rows
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [x] 7.10 Implement pagination in LinkResultsTable
    - Display pagination controls in footer when results exceed 25 links
    - Provide page size selector with options: 25, 50, 100 per page (default 25)
    - Display Previous and Next buttons with arrow icons (RiArrowLeftSLine, RiArrowRightSLine)
    - Display page number buttons showing up to 5 pages around current page
    - Display ellipsis (…) between non-consecutive page numbers
    - Disable Previous button on page 1 and Next button on last page
    - Highlight active page button with different background using theme tokens
    - Reset to page 1 when page size changes
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9_

  - [x] 7.11 Implement footer status summary in LinkResultsTable
    - Display status summary in footer left section with icon
    - Display "All X links passed." with green checkmark icon (RiCheckboxCircleLine) in success text color when all links pass
    - Display "X of Y links need attention." with red X icon (RiCloseCircleLine) in warning text color when links have issues
    - Display "· showing X filtered" in faint text color when filters or search are active
    - Use theme tokens for footer background: toolbarPassBg when all pass, toolbarFailBg when issues exist
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x] 7.12 Implement link type display and filtering in LinkResultsTable
    - Display link type in dedicated column: "Internal", "External", or "Canonical"
    - Style link types with appropriate colors using theme tokens
    - Add secondary filter control (dropdown) for filtering by link type
    - Update displayed results and counts immediately when link type filter is applied
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [x] 7.13 Implement empty states in LinkResultsTable
    - Display "No results in this category." centered in table when no results match current filter
    - Display "No matching results for your search." centered in table when no results match search query
    - Style empty state messages in faint text color with appropriate padding (3rem vertical, 1rem horizontal)
    - Display empty state messages in single table cell spanning all columns
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase 7: Integrate link checker into app/page.tsx
  - [x] 9.1 Add link checker state to app/page.tsx
    - Add state variables: linkScanResults, linkScanTimer, linkScanError, linkScanInProgress, linkCancelController
    - Add state for page selection: discoveredPages, dynamicGroups, selectedPageScope, selectedDynamicGroups
    - Add state for link scope: selectedLinkScope
    - Initialize all state with appropriate default values
    - _Requirements: 1.1, 2.1, 4.1, 32.2, 32.3_

  - [x] 9.2 Implement sitemap crawl handler for link checker
    - Create `handleLinkSitemapCrawl` function
    - Reuse existing `crawlSitemap` function from lib/sitemap.ts
    - Store discovered pages in state
    - Use existing sitemapGroups logic to group pages
    - Display total count of discovered pages
    - Display error message on failure with retry option
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 9.3 Implement link scan handler
    - Create `handleLinkScan` function
    - Validate at least one page is selected
    - Create AbortController for cancellation support
    - Call /api/links with selected pages, link scope, concurrency, timeout
    - Update scan timer using existing timer utilities from lib/duration.ts
    - Store results in linkScanResults state
    - Handle errors and display error messages
    - Clear cancel controller on completion
    - _Requirements: 2.8, 14.1-14.5, 15.1-15.4, 29.1-29.6, 33.1-33.5, 34.1-34.5_

  - [x] 9.4 Implement scan cancellation handler
    - Create `handleLinkScanCancel` function
    - Abort in-progress link validations using AbortController
    - Display partial results for completed links
    - Display "Scan cancelled" message
    - Allow user to start new scan after cancellation
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_

  - [x] 9.5 Implement progress tracking during scan
    - Display progress indicator before results table appears
    - Show count of pages scanned vs total pages
    - Show count of links validated vs total links discovered
    - Update progress indicators in real-time
    - Display estimated time remaining based on current scan rate
    - Hide results table until scan is complete or cancelled
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

  - [x] 9.6 Implement recent scans history for link checker
    - Reuse localStorage helper functions from lib/history.ts or follow same pattern
    - Store 10 most recent scan configurations in browser localStorage
    - Display "Recent Scans" list showing site URL and scan date
    - Populate URL input and page selection with saved configuration when recent scan is clicked
    - Provide "Clear History" button to remove all recent scans
    - Update recent scans list after each successful scan
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6_

  - [x] 9.7 Render link checker UI in app/page.tsx
    - Render SitemapInput component when mode === "links"
    - Render PageSelector component after successful sitemap crawl
    - Render LinkScopeSelector component after page selection
    - Render progress indicator during scan
    - Render LinkResultsTable component after scan completion
    - Render "Cancel Scan" button during scan
    - Render recent scans list
    - Preserve link checker state when switching tabs
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

- [x] 10. Phase 8: Final verification and testing
  - [ ]\* 10.1 Verify SEO checker functionality unchanged
    - Run manual mode scan and verify results display correctly
    - Run sitemap mode scan and verify results display correctly
    - Test CSV export functionality
    - Test recent searches functionality
    - Test theme switching (dark/light)
    - Verify all filter tabs work
    - Verify search, sort, and pagination work
    - Test browser back/forward navigation
    - _Requirements: Critical Constraint (Zero Impact)_

  - [ ]\* 10.2 Test complete link checker workflow
    - Enter site URL and verify sitemap crawl works
    - Verify page selection UI displays and works correctly
    - Select different page scopes (all, static, dynamic) and verify counts update
    - Select different link scopes (internal, all) and verify counts update
    - Start link scan and verify progress tracking works
    - Verify results table displays after scan completion
    - Test all filter tabs (All, Failed, Warnings, Passed)
    - Test search functionality
    - Test sorting by different columns
    - Test pagination controls
    - Test expandable rows show detailed information
    - Test copy button copies results to clipboard
    - Test scan cancellation works
    - Test recent scans history works
    - _Requirements: 1.1-1.6, 2.1-2.8, 3.1-3.7, 4.1-4.5, 17.1-17.8, 18.1-18.7, 19.1-19.6, 20.1-20.6, 21.1-21.7, 22.1-22.7, 23.1-23.7, 24.1-24.9, 25.1-25.5, 29.1-29.6, 30.1-30.5, 31.1-31.6, 32.1-32.5_

  - [ ]\* 10.3 Test link validation accuracy
    - Test detection of broken links (4xx, 5xx)
    - Test detection of slow response times
    - Test detection of redirect chains
    - Test detection of external link best practices issues
    - Test detection of mixed content warnings
    - Test detection of internal link path issues
    - Test detection of environment URLs
    - Test detection of accessibility issues
    - _Requirements: 6.1-6.7, 7.1-7.5, 8.1-8.5, 9.1-9.4, 10.1-10.4, 11.1-11.4, 12.1-12.4, 13.1-13.5_

  - [ ]\* 10.4 Test error handling and edge cases
    - Test sitemap crawl failure displays error message
    - Test page extraction failure continues with remaining pages
    - Test link validation failure records error details
    - Test timeout handling for slow links
    - Test retry logic for network errors
    - Test empty state messages display correctly
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [ ]\* 10.5 Test theme consistency
    - Verify link checker UI matches SEO checker visual design
    - Test theme switching works across all link checker components
    - Verify all colors use theme tokens (no hardcoded hex values)
    - Verify fade-in animations match SEO table timing
    - _Requirements: 17.7, 17.8_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional verification tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- All changes are additive and isolated to link checker-specific files
- Zero impact on existing SEO checker functionality is verified at multiple checkpoints
- Property-based tests are not included because this feature involves UI components, API integration, and external HTTP requests rather than pure algorithmic logic with universal properties
- Unit tests focus on link extraction, deduplication, and issue detection logic
- Integration tests focus on the validation pipeline and API route
- Manual testing verifies the complete user workflow and visual consistency
