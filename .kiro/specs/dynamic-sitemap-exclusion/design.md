# Design Document

## Dynamic Sitemap Exclusion

### Overview

This feature replaces the free-text "Exclude Patterns" textarea in the SEO Checker's Sitemap Crawl mode with a multi-select dropdown driven by `-dpages.xml` sitemap files discovered during crawl. Users select human-readable group labels (e.g. "Blog", "Neighborhoods") instead of typing raw glob patterns.

The change is purely additive on the server side — the existing `filterUrls` pipeline already accepts `excludePatterns` as an array of strings, and the new feature simply changes how those strings are derived. On the client side, the `ScopeSelector` component is extended to render the new dropdown when dynamic groups are available, and the parent page wires the selected groups through to the crawl API call.

### Architecture

The feature touches three layers:

```
┌─────────────────────────────────────────────────────────┐
│  Client (React)                                         │
│                                                         │
│  app/page.tsx                                           │
│    ├─ derives dynamicGroups from crawlResult            │
│    ├─ holds selectedGroups state                        │
│    └─ maps selectedGroups → excludePatterns on crawl    │
│                                                         │
│  components/ScopeSelector.tsx                           │
│    └─ renders ExclusionDropdown when groups present     │
│                                                         │
│  components/ExclusionDropdown.tsx  (new)                │
│    └─ multi-select UI, theme-aware                      │
│                                                         │
│  lib/sitemapGroups.ts  (new)                            │
│    └─ extractDynamicGroups(sitemapUrls) → DynamicGroup[]│
└─────────────────────────────────────────────────────────┘
                          │  POST /api/sitemap
                          │  { url, scope, excludePatterns: string[] }
┌─────────────────────────────────────────────────────────┐
│  Server (Next.js API route)                             │
│                                                         │
│  app/api/sitemap/route.ts  (unchanged)                  │
│    └─ passes excludePatterns to filterUrls              │
│                                                         │
│  lib/filter.ts  (unchanged)                             │
│    └─ matchesPattern / scope filter                     │
└─────────────────────────────────────────────────────────┘
```

The server-side filter pipeline requires no changes. The `excludePatterns` array it already accepts will now be populated from the selected DPages sitemap URLs rather than from a textarea.

### Components and Interfaces

#### `lib/sitemapGroups.ts` (new)

Pure utility module — no React, no side effects.

```ts
export type DynamicGroup = {
  label: string;       // e.g. "Blog"
  sitemapUrl: string;  // e.g. "https://example.com/sitemap-blog-dpages.xml"
};

/**
 * Derives the list of DynamicGroups from a list of sitemap URLs.
 * Filters to those ending in -dpages.xml and extracts a human-readable label.
 */
export function extractDynamicGroups(sitemapUrls: string[]): DynamicGroup[];

/**
 * Converts a DPages sitemap URL to a human-readable label.
 * "https://example.com/sitemap-blog-dpages.xml" → "Blog"
 * Falls back to the raw filename (minus .xml) if no segment is found.
 */
export function labelFromDPagesSitemapUrl(url: string): string;
```

Label extraction algorithm:
1. Parse the URL, take the last path segment (the filename).
2. Strip the `sitemap-` prefix (if present).
3. Strip the `-dpages.xml` suffix.
4. Title-case the remaining segment.
5. If the result is empty, fall back to the filename minus `.xml`.

#### `components/ExclusionDropdown.tsx` (new)

Custom multi-select dropdown component. Uses a `<div>`-based trigger + popover pattern (no native `<select multiple>`) to support checkmarks and the "{n} selected" summary.

```ts
type Props = {
  groups: DynamicGroup[];          // available options
  selected: string[];              // selected sitemapUrls
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};
```

Rendering rules:
- Collapsed trigger shows: placeholder when empty, labels joined by ", " for ≤2 selections, "{n} selected" for ≥3.
- Open list shows each group as a row with a checkmark indicator.
- Clicking outside the open list closes it (via `useEffect` + `mousedown` listener).
- All colours sourced from `tokens[theme]` via `useTheme()`.

#### `components/ScopeSelector.tsx` (modified)

New props added:

```ts
type Props = {
  // existing
  scope: ScanScope;
  onScopeChange: (s: ScanScope) => void;
  disabled?: boolean;
  // new
  dynamicGroups?: DynamicGroup[];
  selectedGroups?: string[];
  onSelectedGroupsChange?: (urls: string[]) => void;
};
```

The `excludePatterns` / `onExcludePatternsChange` props are **removed** — the textarea is replaced entirely. When `dynamicGroups` is non-empty, `ExclusionDropdown` is rendered below the scope selector. When empty or absent, nothing is rendered in that slot.

#### `components/SitemapInput.tsx` (modified)

The `excludePatterns` / `onExcludePatternsChange` props are removed and replaced with the new group props, which are forwarded to `ScopeSelector`.

#### `app/page.tsx` (modified)

- `excludePatterns: string` state is replaced by `selectedGroups: string[]` (array of selected sitemapUrls).
- `dynamicGroups` is derived from `crawlResult?.sitemapUrls` via `extractDynamicGroups` (computed inline, no extra state).
- On new crawl initiation, `selectedGroups` is reset to `[]`.
- When calling `/api/sitemap`, `excludePatterns` is derived as `selectedGroups` (the sitemapUrls themselves are passed as the exclude patterns, since the filter pipeline matches on `sourceSitemap`).

### Data Models

#### `DynamicGroup` (new, client-side only)

```ts
type DynamicGroup = {
  label: string;       // human-readable, e.g. "Blog"
  sitemapUrl: string;  // full URL, e.g. "https://example.com/sitemap-blog-dpages.xml"
};
```

#### Filter pipeline — `excludePatterns` semantics change

Currently `excludePatterns` contains glob path patterns like `/blog/*`. After this feature, when the dropdown is used, `excludePatterns` will contain full sitemap URLs like `https://example.com/sitemap-blog-dpages.xml`.

The existing `matchesPattern` function in `lib/filter.ts` matches against URL pathnames using glob patterns. It will **not** match sitemap URLs. Therefore `lib/filter.ts` needs a small extension: when an exclude pattern looks like a full URL (starts with `http`), the filter should match by `sourceSitemap` equality rather than by pathname glob.

Updated `filterUrls` step 1 logic:

```ts
const afterPatternExclusion = entries.filter(({ url, sourceSitemap }) => {
  const blocked = excludePatterns.some((p) =>
    p.startsWith("http")
      ? sourceSitemap === p          // sitemap URL match (new)
      : matchesPattern(url, p)       // glob path match (existing)
  );
  if (blocked) excluded.push(url);
  return !blocked;
});
```

This is backward-compatible: existing glob patterns continue to work unchanged.

#### `SitemapCrawlResult` — no changes

The `sitemapUrls` field already present in `SitemapCrawlResult` is the sole source of truth for deriving dynamic groups. No new fields are needed.

#### State in `app/page.tsx`

| Before | After |
|---|---|
| `excludePatterns: string` | `selectedGroups: string[]` |
| `dynamicGroups` (none) | derived from `crawlResult` inline |


### Error Handling

| Scenario | Handling |
|---|---|
| DPages sitemap URL has no recognisable segment between `sitemap-` and `-dpages.xml` | `labelFromDPagesSitemapUrl` falls back to filename minus `.xml` |
| `crawlResult` is null (no crawl yet) | `dynamicGroups` is `[]`; dropdown is hidden |
| All selected groups are deselected before re-crawl | `selectedGroups` is `[]`; `excludePatterns: []` sent to API |
| Crawl returns no `-dpages.xml` sitemaps | `dynamicGroups` is `[]`; dropdown hidden; no exclude patterns sent |
| User clicks "Crawl Sitemap" while dropdown is open | Dropdown is disabled during crawl; open state is irrelevant |

### Testing Strategy

**Dual approach**: unit tests for specific examples and edge cases; property-based tests for universal correctness guarantees.

**Unit tests** (Jest / Vitest):
- `labelFromDPagesSitemapUrl`: specific examples (standard, hyphenated slug, no prefix, fallback).
- `extractDynamicGroups`: filters correctly, returns empty for no matches.
- `ExclusionDropdown` rendering: placeholder text, "{n} selected" threshold, checkmark presence.
- `filterUrls` with sitemap-URL exclude patterns: verifies sourceSitemap matching.

**Property-based tests** (fast-check, minimum 100 iterations each):
- Each property test must be tagged with a comment in the format:
  `// Feature: dynamic-sitemap-exclusion, Property {N}: {property_text}`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: extractDynamicGroups filters to -dpages.xml only

*For any* list of sitemap URLs, `extractDynamicGroups` should return exactly those URLs whose filename ends in `-dpages.xml`, and no others.

**Validates: Requirements 1.1**

---

### Property 2: Label round-trip

*For any* non-empty alphanumeric slug string `s`, constructing the URL `https://example.com/sitemap-{s}-dpages.xml` and calling `labelFromDPagesSitemapUrl` should return the title-cased form of `s`.

**Validates: Requirements 1.2**

---

### Property 3: Dropdown visibility matches group presence

*For any* `dynamicGroups` array passed to `ScopeSelector`, the `ExclusionDropdown` is rendered if and only if the array is non-empty.

**Validates: Requirements 2.1, 2.2**

---

### Property 4: All groups appear as rows with correct checkmark state

*For any* set of `DynamicGroup` options and any subset of selected sitemapUrls, when the dropdown list is open, every group appears as a row, selected groups have a checkmark indicator, and unselected groups do not.

**Validates: Requirements 3.3, 3.4, 3.6**

---

### Property 5: Select-then-deselect round trip

*For any* `DynamicGroup`, selecting it and then clicking it again should result in it being absent from the selected set — restoring the original state.

**Validates: Requirements 3.5**

---

### Property 6: Collapsed trigger summary text rule

*For any* non-empty selection of `n` groups, the collapsed trigger text should be the labels joined by `", "` when `n ≤ 2`, and `"{n} selected"` when `n ≥ 3`.

**Validates: Requirements 3.7**

---

### Property 7: Selected groups map to excludePatterns

*For any* subset of `DynamicGroup` options that are selected, the `excludePatterns` array derived for the API call should equal the `sitemapUrl` values of those selected groups (and nothing else).

**Validates: Requirements 4.1**

---

### Property 8: Filter excludes by sourceSitemap

*For any* list of `PageEntry` objects and any set of DPages sitemap URLs passed as `excludePatterns`, `filterUrls` should exclude all entries whose `sourceSitemap` is in the set, and include all others (assuming scope is "all").

**Validates: Requirements 4.3**

---

### Property 9: Combined filter applies patterns before scope

*For any* list of `PageEntry` objects, scope, and excludePatterns, the result of `filterUrls` should be equivalent to first removing entries matching any exclude pattern, then applying the scope filter — in that order.

**Validates: Requirements 5.3**

---

## Testing Strategy (complete)

### Unit tests

Focus on specific examples, edge cases, and error conditions:

- `labelFromDPagesSitemapUrl`: standard slug, hyphenated slug (`sitemap-my-blog-dpages.xml` → `My-Blog` or `My Blog` depending on design choice), no prefix fallback, empty segment fallback.
- `extractDynamicGroups`: mixed URL list, all matching, none matching, empty input.
- `ExclusionDropdown`: placeholder text when empty, label join for 1 and 2 selections, "{n} selected" for 3+, disabled state blocks interaction, helper text present, field label present.
- `filterUrls` with sitemap-URL exclude patterns: verifies sourceSitemap equality matching works alongside existing glob matching.
- State reset: `selectedGroups` is `[]` when a new crawl is initiated.
- No-groups case: `excludePatterns: []` is sent when `dynamicGroups` is empty.

### Property-based tests (fast-check)

Minimum 100 iterations per test. Each test must include a comment:
`// Feature: dynamic-sitemap-exclusion, Property {N}: {property_text}`

| Test | Property |
|---|---|
| Generate random URL lists, assert extractDynamicGroups returns only -dpages.xml entries | Property 1 |
| Generate random slugs, construct URL, assert label round-trip | Property 2 |
| Generate random groups arrays (empty and non-empty), assert dropdown visibility | Property 3 |
| Generate random groups + random selected subsets, assert row/checkmark correctness | Property 4 |
| Generate random group, select then deselect, assert empty selection | Property 5 |
| Generate random selections of size 1–10, assert summary text rule | Property 6 |
| Generate random group subsets, assert excludePatterns equals sitemapUrls | Property 7 |
| Generate random PageEntry lists + random sitemap URL sets, assert filter exclusion | Property 8 |
| Generate random entries + scope + patterns, assert filter order equivalence | Property 9 |
