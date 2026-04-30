# Design Document: Link Checker

## Overview

The Link Checker feature adds comprehensive link health validation to PurrScope, enabling users to discover and validate all links across a website. It reuses PurrScope's existing sitemap crawling infrastructure and follows the concurrent scanning pattern from `improvedProcess.ts` to provide fast, parallel link validation with detailed reporting.

**Critical Design Constraint**: Maximum code reuse from the SEO checker with zero impact on existing functionality. All changes must be additive and isolated to link checker-specific files.

### Key Capabilities

- **Sitemap-based page discovery** — Reuses existing `lib/sitemap.ts` crawler
- **Concurrent link validation** — Follows `scan/pipelines/improvedProcess.ts` pattern
- **Comprehensive link analysis** — HTTP status, redirects, response time, accessibility, SEO best practices
- **Flexible filtering** — Internal-only or all links, with deduplication
- **Rich results UI** — Reuses ResultsTable styled components and patterns

### Design Principles

1. **Code Reuse First** — Extract and reuse existing components, utilities, and patterns
2. **Zero Breaking Changes** — No modifications to existing SEO checker code
3. **Additive Architecture** — New code isolated to link checker-specific files
4. **Consistent UX** — Match SEO checker's visual design and interaction patterns
5. **Type Safety** — Extend existing type system without conflicts

## Architecture

### High-Level Flow

```
User enters site URL
    ↓
Sitemap Crawler (reused from lib/sitemap.ts)
    ↓
Page Selection UI (new component, follows ScopeSelector pattern)
    ↓
Link Extraction (new: lib/linkExtractor.ts)
    ↓
Link Deduplication & Filtering (new: lib/linkChecker.ts)
    ↓
Concurrent Link Validation (new: scan/pipelines/linkValidationProcess.ts)
    ↓
Results Display (reuses ResultsTable styled components)
```

### Component Hierarchy

```
app/page.tsx (Links tab state)
  ├─ ModeTabs (extended with "Links" tab)
  ├─ SitemapInput (reused)
  ├─ PageSelector (new, follows ScopeSelector pattern)
  ├─ LinkScopeSelector (new, simple radio buttons)
  └─ LinkResultsTable (new, reuses ResultsTable styles)
```

### API Layer

```
POST /api/links
  ├─ Request: { siteUrl, pageUrls, linkScope, concurrency, timeout }
  ├─ Link Extraction (Playwright-based HTML parsing)
  ├─ Link Validation (concurrent HTTP requests)
  └─ Response: { links: LinkCheckResult[], summary, duration }
```

## Components and Interfaces

### 1. Shared Styled Components Extraction

**Decision: Option B** — Create separate `LinkResultsTable` component that imports shared styled components.

**Rationale**:

- Lower risk — SEO table remains untouched
- Faster implementation — no refactoring of existing component
- Easier testing — verify SEO works, then build link table
- Clear separation — link-specific logic isolated

**Implementation Strategy**:

**Phase 1: Extract Shared Styles**

- Create `components/ResultsTable.styles.ts`
- Export all styled components from ResultsTable
- Refactor `ResultsTable.tsx` to import from `.styles.ts`
- **Verify SEO checker still works** before proceeding

**Phase 2: Build Link Table**

- Create `components/LinkResultsTable.tsx`
- Import styled components from `ResultsTable.styles.ts`
- Implement link-specific columns and logic
- Test independently

### 2. ModeTabs Extension

**File**: `components/ModeTabs.tsx`

**Changes**:

```typescript
// Add "links" to Mode type in lib/types.ts
export type Mode = "manual" | "sitemap" | "links";

// Update LABELS in ModeTabs.tsx
const LABELS: Record<Mode, string> = {
  manual: "Manual_URLs",
  sitemap: "Sitemap_Crawl",
  links: "Link_Checker", // NEW
};
```

**Impact**: Minimal — adds one tab button, existing tabs unaffected

### 3. PageSelector Component

**File**: `components/PageSelector.tsx` (new)

**Purpose**: Allow users to select which discovered pages to scan for links

**Props**:

```typescript
type PageSelectorProps = {
  pages: string[];
  dynamicGroups: DynamicGroup[];
  selectedScope: "all" | "static" | "dynamic";
  selectedGroups: string[];
  onScopeChange: (scope: "all" | "static" | "dynamic") => void;
  onGroupsChange: (groups: string[]) => void;
  disabled?: boolean;
};
```

**Design**: Follows `ScopeSelector.tsx` pattern with radio buttons and checkboxes

### 4. LinkScopeSelector Component

**File**: `components/LinkScopeSelector.tsx` (new)

**Purpose**: Choose which links to validate (internal-only vs all)

**Props**:

```typescript
type LinkScopeSelectorProps = {
  scope: LinkScope;
  onChange: (scope: LinkScope) => void;
  disabled?: boolean;
};
```

**Design**: Simple radio button group styled with theme tokens

### 5. LinkResultsTable Component

**File**: `components/LinkResultsTable.tsx` (new)

**Purpose**: Display link validation results with filtering, search, sorting, pagination

**Props**:

```typescript
type LinkResultsTableProps = {
  results: LinkCheckResult[];
  scanTimer?: TimerState;
};
```

**Columns**:

- Expand arrow
- Link URL (with source pages count)
- Link Type (Internal/External/Canonical)
- Status (Pass/Fail/Warn pill)
- Response Time (ms)
- Issues (count badge)

**Expanded Row Content**:

- Full URL
- All source pages (where link was found)
- Complete redirect chain (if any)
- All detected issues with severity
- Response headers (if relevant)

**Reused Styled Components** (from `ResultsTable.styles.ts`):

- TableWrap, SummaryBar, SummaryChip
- Toolbar, TabGroup, TabBtn, ToolbarRight
- SearchWrap, SearchInput, CopyBtn
- ScrollWrap, Table, Thead, Th, Td
- DataRow, ExpandCell, UrlCell, UrlText, UrlAnchor
- SubLine, PillSpan, CautionBadge
- ExpandedTd, ExpandedGrid, ExpandedFieldLabel, ExpandedValue
- FooterBar, FooterLeft, PaginationWrap, PageBtn, PageSizeSelect
- EmptyRow, EmptyTd, IconWrap, ExecutionBadge

**Filter Tabs**:

- All
- Failed (4xx, 5xx, timeout, unreachable)
- Warnings (slow response, missing attributes, accessibility issues)
- Passed (2xx with no warnings)

## Data Models

### LinkCheckResult Type

```typescript
// Add to lib/types.ts

export type LinkType = "internal" | "external" | "canonical";
export type LinkScope = "internal" | "all";

export type LinkStatus =
  | "success" // 2xx
  | "redirect" // 3xx
  | "client_error" // 4xx
  | "server_error" // 5xx
  | "timeout"
  | "unreachable";

export type LinkIssueSeverity = "error" | "warning";

export type LinkIssue = {
  type: string; // e.g., "broken_link", "slow_response", "missing_noopener"
  severity: LinkIssueSeverity;
  message: string;
};

export type LinkCheckResult = {
  url: string;
  linkType: LinkType;
  status: LinkStatus;
  statusCode: number | null;
  responseTime: number; // milliseconds
  redirectChain: string[]; // empty if no redirects
  issues: LinkIssue[];
  foundOn: string[]; // source page URLs
  finalUrl?: string; // after following redirects
  error?: string;
};
```

### Link Validation Request/Response

```typescript
// API request body
type LinkValidationRequest = {
  siteUrl: string;
  pageUrls: string[]; // pages to scan for links
  linkScope: LinkScope;
  concurrency?: number; // default 5
  timeout?: number; // default 10000ms
};

// API response
type LinkValidationResponse = {
  links: LinkCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  duration: number; // milliseconds
};
```

## Link Validation Pipeline

### Architecture

**File**: `scan/pipelines/linkValidationProcess.ts` (new)

**Pattern**: Follows `improvedProcess.ts` concurrent execution model

### Pipeline Stages

#### Stage 1: Page Fetching & Link Extraction

```typescript
async function extractLinksFromPage(
  pageUrl: string,
  signal?: AbortSignal
): Promise<ExtractedLink[]>;
```

**Implementation**:

- Use Playwright to load page (reuse browser context pattern from improvedProcess)
- Extract all `<a href>`, `<area href>`, `<link rel="canonical">` elements
- Normalize URLs to absolute format
- Skip anchor-only (#), javascript:, mailto:, tel: links
- Return array of `{ url, linkType, sourceElement }`

**Concurrency**: Process multiple pages in parallel (default 3 concurrent page loads)

#### Stage 2: Link Deduplication & Filtering

```typescript
function deduplicateLinks(
  extractedLinks: ExtractedLink[],
  linkScope: LinkScope,
  baseDomain: string
): Map<string, LinkMetadata>;
```

**Implementation**:

- Group links by URL
- Track all source pages for each unique link
- Filter by linkScope (internal-only vs all)
- Return Map of unique links with metadata

#### Stage 3: Link Validation

```typescript
async function validateLink(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<LinkCheckResult>;
```

**Implementation**:

- HTTP HEAD request first (faster, less bandwidth)
- Follow redirects, track chain
- Measure response time
- Detect issues (status code, response time, attributes)
- Retry once on network errors (not 4xx/5xx)
- Return LinkCheckResult

**Concurrency**: Validate multiple links in parallel (default 5 concurrent requests)

### Concurrent Execution Pattern

```typescript
async function runConcurrent<T, R>(
  items: T[],
  processor: (item: T, signal?: AbortSignal) => Promise<R>,
  concurrency: number,
  signal?: AbortSignal
): Promise<R[]>;
```

**Reuse from improvedProcess.ts** — same worker pool pattern

### Issue Detection Logic

**HTTP Status Issues**:

- 4xx → error: "broken_link"
- 5xx → error: "server_error"
- Timeout → error: "timeout"
- Network error → error: "unreachable"

**Performance Issues**:

- Response time > 3000ms → warning: "slow_response"
- Response time > 5000ms → error: "very_slow_response"

**Redirect Issues**:

- Redirect chain > 3 hops → warning: "excessive_redirects"

**External Link Best Practices** (requires HTML parsing):

- Missing `target="_blank"` → warning: "missing_target_blank"
- Has `target="_blank"` but missing `rel="noopener"` or `rel="noreferrer"` → warning: "missing_noopener"

**Mixed Content**:

- HTTP link on HTTPS page → warning: "mixed_content"

**Internal Link Path**:

- Absolute URL for internal link → warning: "absolute_internal_url"

**Environment URLs**:

- Contains `.staging.`, `.dev.`, `staging.`, `preview.`, `.netlify.app`, `.vercel.app` → error: "environment_url"
- Contains `localhost`, `127.0.0.1`, IP address → error: "development_url"

**Accessibility** (requires HTML parsing):

- Empty link text → error: "empty_link_text"
- Generic text ("click here", "read more", "here", "link") → warning: "generic_link_text"
- Icon/image only without aria-label → error: "missing_accessible_label"
- Link text > 100 chars → warning: "long_link_text"

## Error Handling

### API Route Error Handling

**File**: `app/api/links/route.ts`

**Pattern**: Follow `app/api/scan-improved/route.ts` error handling

```typescript
// Validation errors → 400
if (!Array.isArray(pageUrls) || pageUrls.length === 0) {
  return NextResponse.json(
    { error: "Provide at least one page URL." },
    { status: 400 }
  );
}

// Server errors → 500
catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json(
    { error: `Link validation failed: ${message}` },
    { status: 500 }
  );
}
```

### Pipeline Error Handling

**Per-Page Extraction Errors**:

- Log error, continue with remaining pages
- Return empty array for failed page
- Track failed pages in summary

**Per-Link Validation Errors**:

- Retry once on network errors
- Record error in LinkCheckResult
- Continue with remaining links

**Timeout Handling**:

- Per-page timeout: 12 seconds (matches improvedProcess)
- Per-link timeout: 10 seconds (configurable)
- AbortController for cancellation

## Testing Strategy

### Unit Tests

**File**: `lib/linkExtractor.test.ts`

**Tests**:

- Extract `<a>` tags with various href formats
- Extract `<area>` tags from image maps
- Extract `<link rel="canonical">` tags
- URL normalization (relative → absolute)
- Skip anchor-only, javascript:, mailto:, tel: links
- Handle malformed HTML gracefully

**File**: `lib/linkChecker.test.ts`

**Tests**:

- Deduplication by URL
- Track multiple source pages per link
- Filter internal vs external links
- Issue detection logic for all issue types

### Integration Tests

**File**: `app/api/links/route.test.ts` (if test infrastructure exists)

**Tests**:

- Valid request returns 200 with results
- Invalid request returns 400 with error
- Empty pageUrls returns 400
- Request cancellation via AbortSignal

### Manual Testing Checklist

**Phase 1: Verify SEO Checker Unaffected**

- [ ] Manual mode scan works
- [ ] Sitemap mode scan works
- [ ] Results table displays correctly
- [ ] CSV export works
- [ ] Recent searches work
- [ ] Theme switching works
- [ ] All existing tabs (Manual/Sitemap) work

**Phase 2: Link Checker Functionality**

- [ ] Links tab appears and is clickable
- [ ] Sitemap crawl works from Links tab
- [ ] Page selection UI works
- [ ] Link scope selector works
- [ ] Link scan executes and completes
- [ ] Results table displays link data
- [ ] Filter tabs work (All/Failed/Warnings/Passed)
- [ ] Search works
- [ ] Sorting works
- [ ] Pagination works
- [ ] Expandable rows show details
- [ ] Copy button works
- [ ] Scan cancellation works

## Implementation Plan

### Phase 1: Extract Shared Components (Zero-Impact Refactor)

**Goal**: Extract styled components without breaking SEO checker

**Steps**:

1. Create `components/ResultsTable.styles.ts`
2. Move all styled components from `ResultsTable.tsx` to `.styles.ts`
3. Export all styled components
4. Update `ResultsTable.tsx` to import from `.styles.ts`
5. **Run full manual test suite on SEO checker**
6. **Verify no visual or functional changes**
7. Commit: "refactor: extract ResultsTable styled components"

**Rollback Plan**: Revert commit if any SEO functionality breaks

### Phase 2: Add Link Checker Types

**Goal**: Extend type system without conflicts

**Steps**:

1. Add link checker types to `lib/types.ts` in dedicated section
2. Update `Mode` type to include "links"
3. Export all new types
4. **Verify TypeScript compilation succeeds**
5. **Verify no type errors in existing code**
6. Commit: "feat: add link checker types"

### Phase 3: Extend ModeTabs

**Goal**: Add Links tab without breaking existing tabs

**Steps**:

1. Update `LABELS` in `ModeTabs.tsx` to include "links"
2. **Test Manual and Sitemap tabs still work**
3. **Test Links tab renders and is clickable**
4. Commit: "feat: add Links tab to ModeTabs"

### Phase 4: Build Link Checker Utilities

**Goal**: Create isolated link checking logic

**Steps**:

1. Create `lib/linkExtractor.ts` with link extraction functions
2. Create `lib/linkChecker.ts` with deduplication and issue detection
3. Create `scan/pipelines/linkValidationProcess.ts` with concurrent validation
4. Write unit tests for each utility
5. **Verify all tests pass**
6. Commit: "feat: add link validation pipeline"

### Phase 5: Build Link Checker API

**Goal**: Create isolated API route

**Steps**:

1. Create `app/api/links/route.ts`
2. Implement POST handler following scan-improved pattern
3. Test API with curl/Postman
4. **Verify existing scan APIs unaffected**
5. Commit: "feat: add /api/links route"

### Phase 6: Build Link Checker UI Components

**Goal**: Create link checker UI

**Steps**:

1. Create `components/PageSelector.tsx`
2. Create `components/LinkScopeSelector.tsx`
3. Create `components/LinkResultsTable.tsx` (imports from ResultsTable.styles.ts)
4. Test each component in isolation
5. Commit: "feat: add link checker UI components"

### Phase 7: Integrate into app/page.tsx

**Goal**: Add link checker state and handlers

**Steps**:

1. Add link checker state variables to `app/page.tsx`
2. Add link checker handlers (crawl, scan, cancel)
3. Render link checker UI when mode === "links"
4. **Test full link checker workflow**
5. **Verify SEO checker still works**
6. Commit: "feat: integrate link checker into main app"

### Phase 8: Final Verification

**Goal**: Ensure zero impact on SEO checker

**Steps**:

1. Run full manual test suite on SEO checker
2. Run full manual test suite on link checker
3. Test theme switching across all tabs
4. Test recent searches across all tabs
5. Test browser back/forward navigation
6. **Document any issues found**
7. **Fix issues before deployment**

## File Structure

### New Files

```
components/
  ResultsTable.styles.ts       # Extracted styled components
  PageSelector.tsx             # Page selection UI
  LinkScopeSelector.tsx        # Link scope radio buttons
  LinkResultsTable.tsx         # Link results table

lib/
  linkExtractor.ts             # Link extraction from HTML
  linkChecker.ts               # Deduplication, filtering, issue detection

scan/pipelines/
  linkValidationProcess.ts     # Concurrent link validation

app/api/links/
  route.ts                     # Link validation API endpoint
```

### Modified Files

```
lib/types.ts                   # Add link checker types
components/ModeTabs.tsx        # Add "links" mode
components/ResultsTable.tsx    # Import from .styles.ts
app/page.tsx                   # Add link checker state and UI
```

### Unchanged Files (Zero Impact)

```
app/api/scan/route.ts          # SEO scan API (sequential)
app/api/scan-improved/route.ts # SEO scan API (concurrent)
app/api/sitemap/route.ts       # Sitemap crawler API
lib/sitemap.ts                 # Sitemap crawling logic
lib/scanner.ts                 # SEO scanner logic
lib/theme.tsx                  # Theme system
lib/duration.ts                # Timer utilities
lib/history.ts                 # Recent searches
scan/pipelines/improvedProcess.ts  # SEO scan pipeline
scan/pipelines/previousProcess.ts  # SEO scan pipeline (reserve)
```

## Design Decisions and Rationale

### Decision 1: ResultsTable Strategy

**Chosen**: Option B (Separate component with shared styles)

**Rationale**:

- **Lower risk**: SEO table remains completely untouched
- **Faster implementation**: No refactoring of complex component logic
- **Easier testing**: Incremental verification (refactor styles → verify SEO → build link table)
- **Clear separation**: Link-specific logic isolated, easier to maintain
- **Rollback safety**: Can revert link table without affecting SEO

**Alternative Considered**: Option A (Generic component)

- **Rejected because**: Higher risk of breaking SEO table during refactor, longer implementation time, more complex testing

### Decision 2: Link Extraction Method

**Chosen**: Playwright-based HTML parsing

**Rationale**:

- **Consistency**: Matches existing SEO checker pattern (fetch → Playwright fallback)
- **Completeness**: Handles JavaScript-rendered links
- **Attribute access**: Can extract `target`, `rel`, `aria-label` for validation
- **Proven**: Playwright already used and working in codebase

**Alternative Considered**: Regex-based HTML parsing

- **Rejected because**: Cannot handle JS-rendered links, fragile for malformed HTML, cannot access element attributes reliably

### Decision 3: Concurrent Validation Pattern

**Chosen**: Reuse improvedProcess.ts worker pool pattern

**Rationale**:

- **Proven**: Already working for SEO scans
- **Efficient**: Controlled concurrency prevents overwhelming servers
- **Cancellable**: AbortSignal support for user cancellation
- **Consistent**: Same performance characteristics as SEO scans

### Decision 4: Link Deduplication Strategy

**Chosen**: Deduplicate by URL, track all source pages

**Rationale**:

- **Efficiency**: Validate each unique link once
- **Completeness**: Track where each link appears for debugging
- **User value**: "Found on X pages" helps prioritize fixes

### Decision 5: Issue Detection Scope

**Chosen**: Comprehensive (HTTP status, performance, SEO, accessibility, security)

**Rationale**:

- **User value**: Catches multiple issue types in one scan
- **Differentiation**: More comprehensive than basic link checkers
- **Actionable**: Each issue includes clear message and severity

**Deferred**: Some accessibility checks require full HTML parsing (expensive)

- **Phase 1**: Implement HTTP-based checks only
- **Phase 2**: Add HTML-based checks if performance acceptable

### Decision 6: State Management

**Chosen**: Add link checker state to app/page.tsx (same pattern as SEO)

**Rationale**:

- **Consistency**: Matches existing SEO checker pattern
- **Simplicity**: No need for global state management
- **Isolation**: Link state separate from SEO state, no conflicts

**Alternative Considered**: Zustand store (like QA Center)

- **Rejected because**: Overkill for single-page state, inconsistent with SEO pattern

## Performance Considerations

### Concurrent Execution Limits

**Page Extraction**: 3 concurrent pages

- **Rationale**: Playwright browser contexts are memory-intensive

**Link Validation**: 5 concurrent requests

- **Rationale**: Balances speed with server load, matches improvedProcess default

**Configurable**: Both limits exposed in API request for power users

### Timeout Configuration

**Per-Page Extraction**: 12 seconds (matches improvedProcess)
**Per-Link Validation**: 10 seconds (configurable)

**Rationale**: Prevents slow links from blocking entire scan

### Memory Management

**Browser Context Reuse**: Reuse Playwright browser context across page extractions
**Streaming Results**: Return results as they complete (future enhancement)
**Pagination**: Results table paginates at 25 items (matches SEO table)

## Security Considerations

### Input Validation

**Site URL**: Validate format, require http/https protocol
**Page URLs**: Validate format, require same domain as site URL
**Concurrency**: Clamp to reasonable range (1-10)
**Timeout**: Clamp to reasonable range (1000-30000ms)

### Rate Limiting

**Not implemented in Phase 1** — defer to deployment environment (Vercel, Cloudflare)

**Future Enhancement**: Add rate limiting per IP address

### SSRF Protection

**Risk**: User could provide internal URLs (localhost, 192.168.x.x)

**Mitigation**: Validate URLs against blocklist:

- localhost, 127.0.0.1, 0.0.0.0
- Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Link-local addresses (169.254.x.x)

**Implementation**: Add to `lib/urlValidation.ts`

## Accessibility

### Keyboard Navigation

**Results Table**: All interactive elements keyboard-accessible

- Tab through filter tabs, search input, copy button
- Enter to expand/collapse rows
- Arrow keys for pagination

### Screen Reader Support

**ARIA Labels**: All icon-only buttons have aria-label
**Semantic HTML**: Use `<table>`, `<thead>`, `<tbody>` for results
**Status Announcements**: Use aria-live for scan progress updates

### Color Contrast

**Theme Tokens**: All colors from `lib/theme.tsx` meet WCAG AA standards
**Status Indicators**: Use icons + text, not color alone

## Future Enhancements

### Phase 2 Features (Not in Initial Release)

1. **Streaming Results**: Return results as they complete (WebSocket or SSE)
2. **Link Health History**: Track link status over time, detect regressions
3. **Scheduled Scans**: Periodic link validation with email alerts
4. **Export Formats**: CSV, JSON, PDF reports
5. **Custom Issue Rules**: User-defined link validation rules
6. **Broken Link Fixing**: Suggest replacements for broken links
7. **Link Graph Visualization**: Show link relationships between pages

### Performance Optimizations

1. **Caching**: Cache link validation results (TTL: 1 hour)
2. **Incremental Scans**: Only re-validate changed pages
3. **HEAD Request Optimization**: Skip body download for most links
4. **DNS Prefetching**: Resolve domains in parallel

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual test suite completed (SEO + Link Checker)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Theme switching works across all tabs
- [ ] Recent searches work across all tabs
- [ ] Performance acceptable (scan 100 pages in < 60 seconds)

### Deployment

- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Monitor error logs for 24 hours
- [ ] Deploy to production
- [ ] Monitor error logs for 48 hours

### Post-Deployment

- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Plan Phase 2 features based on feedback

## Rollback Plan

### If SEO Checker Breaks

1. Revert most recent commit
2. Verify SEO checker works
3. Investigate root cause
4. Fix issue in separate branch
5. Re-test before re-deploying

### If Link Checker Has Critical Bug

1. Hide Links tab (comment out in ModeTabs)
2. Deploy hotfix
3. Fix bug in separate branch
4. Re-test before re-enabling

### If Performance Unacceptable

1. Reduce default concurrency limits
2. Add rate limiting
3. Add caching layer
4. Optimize link validation logic

## Success Metrics

### Functional Metrics

- [ ] Zero SEO checker regressions
- [ ] Link checker completes scans successfully
- [ ] Results table displays correctly
- [ ] All filter/search/sort/pagination features work

### Performance Metrics

- **Target**: Scan 100 pages with 1000 links in < 60 seconds
- **Acceptable**: < 120 seconds
- **Unacceptable**: > 180 seconds

### User Experience Metrics

- **Visual Consistency**: Link table matches SEO table design
- **Interaction Consistency**: Same patterns as SEO checker
- **Error Handling**: Clear error messages, graceful degradation

## Conclusion

This design provides a comprehensive link checker feature that maximizes code reuse from the existing SEO checker while ensuring zero impact on existing functionality. The phased implementation plan allows for incremental verification at each step, with clear rollback points if issues arise.

The chosen architecture (Option B: separate component with shared styles) balances risk, implementation speed, and maintainability. The concurrent validation pipeline follows proven patterns from `improvedProcess.ts`, ensuring consistent performance characteristics.

All new code is isolated to link checker-specific files, with no modifications to existing SEO checker logic. The type system is extended additively, and the UI follows established patterns for visual and interaction consistency.

The implementation plan includes comprehensive testing at each phase, with a focus on verifying that SEO checker functionality remains unchanged. The rollback plan provides clear steps for handling any issues that arise during or after deployment.
