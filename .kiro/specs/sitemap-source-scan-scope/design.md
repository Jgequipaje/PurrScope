# Design Document: sitemap-source-scan-scope

## Overview

This feature replaces the current path-heuristic scan scope system with a sitemap-source-based approach. Rather than inferring whether a URL is "static" or "dynamic" by inspecting path segments, slug patterns, or group sizes, the system uses the sitemap file a URL was discovered in as the authoritative classification signal.

The key insight is that the site already encodes this information structurally: static pages live in `sitemap-static.xml` and dynamic pages live in `*-dpages.xml` child sitemaps. We simply need to track which file each URL came from and expose that as a first-class field throughout the pipeline.

### Scope of Changes

| File | Change |
|---|---|
| `lib/types.ts` | Add `SitemapSource` type; update `SitemapCrawlResult`, `ScanResult`, `ScanScope` |
| `lib/sitemap.ts` | Tag each URL with its source sitemap filename during crawl |
| `lib/filter.ts` | Replace path-pattern logic with `sourceSitemap`-based filtering |
| `components/ScopeSelector.tsx` | Replace options; remove "Collapse Dynamic Pages to Parent" |
| `components/ResultsTable.tsx` | Add "Source Sitemap" column |
| `components/SitemapDebug.tsx` | Show per-source counts; update post-filter count reactively |
| `app/api/sitemap/route.ts` | Pass `sourceSitemapMap` through to filter; return updated result |
| `app/api/scan/route.ts` | Accept `sourceSitemapMap`; attach `sourceSitemap` to each `ScanResult` |

---

## Architecture

The data flows through three layers: crawl → filter → scan. The `sourceSitemap` label is attached at crawl time and threaded through each subsequent layer without modification.

```mermaid
flowchart TD
    A[User enters URL] --> B[POST /api/sitemap]
    B --> C[resolveSitemapUrls\nlib/sitemap.ts]
    C --> D[SitemapCrawlResult\n+ sourceSitemapMap\n+ perSourceCounts]
    D --> E[filterUrls\nlib/filter.ts]
    E --> F[FilterResult\n+ includedUrls with sourceSitemap]
    F --> G[SitemapDebug component\nshows counts + scope preview]
    G --> H[User clicks Scan]
    H --> I[POST /api/scan]
    I --> J[scanUrls\nlib/scanner.ts]
    J --> K[ScanResult[]\neach with sourceSitemap]
    K --> L[ResultsTable\nshows Source Sitemap column]
```

### Key Design Decisions

**Decision 1: Filename-only source label (not full URL)**
The `SitemapSource` stores only the filename (e.g. `sitemap-static.xml`), not the full URL. This keeps the label stable across environments (staging vs production) and matches what the UI should display.

**Decision 2: First-occurrence wins for deduplication**
When a URL appears in multiple sitemaps, the first sitemap encountered during the depth-first crawl wins. This is deterministic and predictable.

**Decision 3: Remove all path-heuristic logic from `filter.ts`**
The `DYNAMIC_THRESHOLD`, `isSlugLike`, `urlLooksDynamic`, `basePath`, `pathDepth`, and `deriveParentUrl` helpers are all removed. The new filter is a simple predicate over `sourceSitemap`.

**Decision 4: `FilterResult` simplified**
`collapsedMappings`, `groupedPathCounts`, and `totalCollapsed` are removed from `FilterResult` since they were artifacts of the old path-heuristic approach. `FilterDebug` and related components are updated accordingly.

---

## Components and Interfaces

### `lib/types.ts`

```typescript
// Filename of the sitemap a URL was discovered in (e.g. "sitemap-static.xml")
export type SitemapSource = string;

// Updated ScanScope — "collapse-dynamic" is removed
export type ScanScope = "all" | "static" | "dynamic";

// ScanResult gains an optional sourceSitemap field
export type ScanResult = {
  url: string;
  sourceSitemap?: SitemapSource;  // NEW
  // ... existing fields unchanged
};

// FilterResult simplified — path-heuristic fields removed
export type FilterResult = {
  includedUrls: string[];
  excludedUrls: string[];
  excludedPatterns: string[];
  totalDiscovered: number;
  totalAfterFiltering: number;
};

// SitemapCrawlResult gains source tracking fields
export type SitemapCrawlResult = {
  pageUrls: string[];
  sitemapUrls: string[];
  pageCount: number;
  sitemapCount: number;
  sourceSitemapMap: Record<string, SitemapSource>;  // NEW: url → filename
  perSourceCounts: Record<SitemapSource, number>;   // NEW: filename → count
  filter: FilterResult;
};
```

### `lib/sitemap.ts`

The crawler's internal `state` object gains two new fields:

```typescript
type CrawlState = {
  pageUrls: string[];
  pageUrlSet: Set<string>;
  sitemapUrls: string[];
  visitedSitemaps: Set<string>;
  sourceSitemapMap: Record<string, string>;  // NEW
  perSourceCounts: Record<string, number>;   // NEW
};
```

`crawlSitemap` receives the current sitemap URL and, when processing a `urlset`, extracts the filename via `new URL(sitemapUrl).pathname.split("/").pop()` and records it for each URL added.

The public `resolveSitemapUrls` function returns the two new fields in `SitemapCrawlResult`.

### `lib/filter.ts`

The new `filterUrls` signature accepts the source map:

```typescript
export function filterUrls(
  allUrls: string[],
  scope: ScanScope,
  excludePatterns: string[],
  sourceSitemapMap: Record<string, string>
): FilterResult
```

Scope logic:
- `"all"` — include all URLs not excluded by patterns
- `"static"` — include only URLs where `sourceSitemapMap[url] === "sitemap-static.xml"`
- `"dynamic"` — include only URLs where `sourceSitemapMap[url]?.endsWith("-dpages.xml")`

All path-heuristic helpers (`basePath`, `pathDepth`, `isSlugLike`, `urlLooksDynamic`, `deriveParentUrl`, `DYNAMIC_THRESHOLD`) are removed.

### `components/ScopeSelector.tsx`

Options array updated:

```typescript
const SCOPE_OPTIONS = [
  { value: "all",     label: "All Pages",          description: "Scan every URL discovered in the sitemap." },
  { value: "static",  label: "Static Pages Only",  description: "Only URLs from sitemap-static.xml." },
  { value: "dynamic", label: "Dynamic Pages",       description: "Only URLs from *-dpages.xml sitemaps." },
];
```

The "Collapse Dynamic Pages to Parent" option and its associated description are removed.

### `components/ResultsTable.tsx`

A new "Source Sitemap" column is added after the existing columns. The cell renders `r.sourceSitemap ?? "—"` (em dash when absent). The `colSpan` on the empty-state row is updated from 5 to 6.

### `components/SitemapDebug.tsx`

The debug counts grid is updated:
- "URLs Discovered" — `crawl.pageCount` (unchanged)
- Per-source breakdown — iterate `crawl.perSourceCounts`, show filename + count for each
- "After Filtering" — `filter.totalAfterFiltering` (reactive to scope changes, no re-crawl needed)
- "Will Be Scanned" — existing scan-limit logic (unchanged)

The `FilterDebug` panel reference is removed or simplified since `collapsedMappings` and `groupedPathCounts` no longer exist.

### `app/api/sitemap/route.ts`

Passes `crawl.sourceSitemapMap` to `filterUrls`:

```typescript
const filter = filterUrls(crawl.pageUrls, scope, excludePatterns, crawl.sourceSitemapMap);
return NextResponse.json({ ...crawl, filter });
```

### `app/api/scan/route.ts`

Accepts an optional `sourceSitemapMap` in the request body and attaches the label to each result:

```typescript
const sourceSitemapMap: Record<string, string> = body?.sourceSitemapMap ?? {};
// After scanUrls():
const annotated = results.map(r => ({
  ...r,
  sourceSitemap: sourceSitemapMap[r.url],
}));
```

---

## Data Models

### `SitemapCrawlResult` (updated)

```
{
  pageUrls: string[]                          // ordered list of all discovered URLs
  sitemapUrls: string[]                       // all sitemap files visited
  pageCount: number                           // = pageUrls.length
  sitemapCount: number                        // = sitemapUrls.length
  sourceSitemapMap: Record<string, string>    // url → sitemap filename
  perSourceCounts: Record<string, number>     // sitemap filename → URL count
  filter: FilterResult                        // result of applying current scope
}
```

### `FilterResult` (simplified)

```
{
  includedUrls: string[]      // URLs to scan
  excludedUrls: string[]      // URLs excluded by scope or patterns
  excludedPatterns: string[]  // patterns that were applied
  totalDiscovered: number
  totalAfterFiltering: number
}
```

### `ScanResult` (updated)

```
{
  url: string
  sourceSitemap?: string      // NEW: filename of originating sitemap
  title: string | null
  titleLength: number
  titleStatus: "Pass" | "Fail"
  description: string | null
  descriptionLength: number
  descriptionStatus: "Pass" | "Fail"
  error?: string
  finalUrl?: string
  titleFound?: boolean
  descriptionFound?: boolean
  attempts?: number
}
```

### Crawl State (internal to `lib/sitemap.ts`)

```
{
  pageUrls: string[]
  pageUrlSet: Set<string>           // for O(1) dedup check
  sitemapUrls: string[]
  visitedSitemaps: Set<string>      // loop guard
  sourceSitemapMap: Record<string, string>   // url → filename
  perSourceCounts: Record<string, number>    // filename → count
}
```

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Source labeling — filename stored, not full URL

*For any* urlset sitemap fetched during a crawl, every URL extracted from that sitemap should have a `sourceSitemap` value equal to the filename portion of the sitemap URL (e.g. `sitemap-static.xml`), not the full URL path.

**Validates: Requirements 1.1, 1.2, 4.4**

---

### Property 2: Deduplication with first-occurrence-wins

*For any* crawl over a sitemap tree where the same URL appears in multiple child sitemaps, the final `pageUrls` list should contain that URL exactly once, and its `sourceSitemap` should be the filename of the first sitemap in which it was encountered (depth-first order).

**Validates: Requirements 1.3, 7.1, 7.2**

---

### Property 3: Source map completeness (round-trip)

*For any* completed crawl, every URL in `pageUrls` should have a corresponding non-empty entry in `sourceSitemapMap`. That is, `sourceSitemapMap[url]` should be a non-empty string for all `url` in `pageUrls`.

**Validates: Requirements 1.4, 7.4**

---

### Property 4: perSourceCounts consistency

*For any* completed crawl, the sum of all values in `perSourceCounts` should equal `pageCount`, and for each sitemap filename `f`, `perSourceCounts[f]` should equal the number of entries in `sourceSitemapMap` whose value is `f`.

**Validates: Requirements 1.5**

---

### Property 5: "all" scope includes every URL

*For any* URL list and source map, filtering with scope `"all"` (and no exclude patterns) should return every URL in the input list unchanged.

**Validates: Requirements 2.1**

---

### Property 6: "static" scope includes only sitemap-static.xml URLs

*For any* URL list and source map, filtering with scope `"static"` should return only URLs whose `sourceSitemapMap` entry is exactly `"sitemap-static.xml"`. No URL with a different source should appear in the output.

**Validates: Requirements 2.2**

---

### Property 7: "dynamic" scope includes only *-dpages.xml URLs

*For any* URL list and source map, filtering with scope `"dynamic"` should return only URLs whose `sourceSitemapMap` entry ends with `"-dpages.xml"`. No URL with a non-matching source should appear in the output.

**Validates: Requirements 2.3**

---

### Property 8: Output is a subset of input — no invented URLs

*For any* URL list, scope, and source map, every URL in the filter output should be a URL that was present in the input list. The filter should never construct or invent URLs.

**Validates: Requirements 2.5, 2.6**

---

### Property 9: ResultsTable renders sourceSitemap for every row

*For any* array of `ScanResult` objects, the rendered `ResultsTable` should contain a "Source Sitemap" cell for each row showing the `sourceSitemap` value when present, or an em dash (`—`) when `sourceSitemap` is absent.

**Validates: Requirements 4.2, 4.3**

---

### Property 10: SitemapDebug per-source breakdown is accurate

*For any* `SitemapCrawlResult` with a non-empty `perSourceCounts`, the rendered `SitemapDebug` component should display each sitemap filename and its corresponding URL count.

**Validates: Requirements 5.2**

---

### Property 11: SitemapDebug scope reactivity

*For any* `SitemapCrawlResult` and any two different `ScanScope` values, rendering `SitemapDebug` with each scope should display the `totalAfterFiltering` value from the corresponding `FilterResult` without triggering a new crawl.

**Validates: Requirements 5.4**

---

### Property 12: sourceSitemap round-trip through scan pipeline

*For any* URL included in a scan, the `ScanResult` for that URL should have a `sourceSitemap` field equal to `sourceSitemapMap[url]` from the originating `SitemapCrawlResult`.

**Validates: Requirements 7.3**

---

### Property 13: Title validation range

*For any* title string, `titleStatus` should be `"Pass"` if and only if the title length is in the range [45, 61] inclusive, and `"Fail"` otherwise.

**Validates: Requirements 6.1**

---

### Property 14: Description validation range

*For any* meta description string, `descriptionStatus` should be `"Pass"` if and only if the description length is in the range [145, 161] inclusive, and `"Fail"` otherwise.

**Validates: Requirements 6.2**

---

## Error Handling

### Sitemap fetch failures
The crawler already handles per-sitemap fetch failures gracefully (returns `null`, logs, continues). This behavior is unchanged. A failed child sitemap simply contributes zero URLs and zero source entries.

### Unknown sitemap format
If a fetched document is neither a `sitemapindex` nor a `urlset`, it is logged and skipped. No URLs or source entries are added.

### Missing sourceSitemap in ScanResult
If a URL reaches the scan API without a `sourceSitemapMap` entry (e.g. manual mode, or a bug), `sourceSitemap` is `undefined` on the `ScanResult`. The `ResultsTable` renders `—` in this case (Property 9 edge case).

### Invalid scope value
If an unrecognised `ScanScope` value is passed to `filterUrls`, the function should default to `"all"` behaviour and log a warning. This prevents silent data loss.

### URL normalisation
The existing `normalizeUrl` helper in `lib/sitemap.ts` is unchanged. Deduplication uses the normalised form, so `http://example.com/page` and `HTTP://EXAMPLE.COM/page` are treated as the same URL.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests cover specific examples, integration points, and error conditions.
- Property tests verify universal invariants across many generated inputs.

### Property-Based Testing Library

Use **fast-check** (TypeScript/JavaScript). It is already compatible with Jest/Vitest and supports arbitrary generators for strings, records, and arrays.

Each property test should run a minimum of **100 iterations**.

Tag format for each test:
```
// Feature: sitemap-source-scan-scope, Property N: <property text>
```

### Property Tests (one test per property)

| Property | Test description |
|---|---|
| P1 | Generate random urlset XML with random URLs; verify all have sourceSitemap = filename |
| P2 | Generate overlapping URL sets across two fake sitemaps; verify dedup + first-occurrence |
| P3 | Generate any crawl result; verify sourceSitemapMap[url] is non-empty for all pageUrls |
| P4 | Generate any crawl result; verify sum(perSourceCounts) === pageCount and per-key counts match |
| P5 | Generate random URL+sourceMap pairs; filter with "all"; verify output === input |
| P6 | Generate random URL+sourceMap pairs; filter with "static"; verify all outputs have source "sitemap-static.xml" |
| P7 | Generate random URL+sourceMap pairs; filter with "dynamic"; verify all outputs have source ending "-dpages.xml" |
| P8 | Generate random URL+sourceMap pairs and any scope; verify every output URL was in the input |
| P9 | Generate random ScanResult arrays (with/without sourceSitemap); render ResultsTable; verify cells show value or "—" |
| P10 | Generate random perSourceCounts; render SitemapDebug; verify each filename+count appears |
| P11 | Generate crawl result; render SitemapDebug with two different scopes; verify count updates |
| P12 | Generate URL+sourceMap; run through scan pipeline mock; verify ScanResult.sourceSitemap matches map |
| P13 | Generate random title strings of varying lengths; verify titleStatus === "Pass" iff length in [45,61] |
| P14 | Generate random description strings of varying lengths; verify descriptionStatus === "Pass" iff length in [145,161] |

### Unit / Example Tests

- ScopeSelector renders exactly 3 options with correct labels and values (Requirements 3.1–3.4)
- ScopeSelector calls `onScopeChange` with correct value for each option selection
- SitemapDebug shows total URL count from crawl result
- SitemapDebug shows post-filter count
- Scanner records error and continues when a page fails to load (edge case, Requirement 6.3)
- `filterUrls` with exclude patterns removes matching URLs before scope is applied
- `resolveSitemapUrls` throws a user-friendly error when no sitemap is reachable

### What NOT to test

- Path-heuristic helpers (`isSlugLike`, `basePath`, etc.) — these are being deleted
- `collapsedMappings` / `groupedPathCounts` — these fields are removed
- Visual styling / CSS — not a computable property
- "Collapse Dynamic Pages to Parent" option — being removed
