# Implementation Plan: Dynamic Sitemap Exclusion

## Overview

Replace the free-text Exclude Patterns textarea with a multi-select dropdown driven by `-dpages.xml` sitemaps discovered during crawl. The server-side filter pipeline requires only a small backward-compatible extension; the bulk of the work is new client-side utilities and a new UI component.

## Tasks

- [x] 1. Add `lib/sitemapGroups.ts` — pure utility for deriving dynamic groups
  - Create `DynamicGroup` type (`label: string`, `sitemapUrl: string`)
  - Implement `labelFromDPagesSitemapUrl(url: string): string` — strips `sitemap-` prefix and `-dpages.xml` suffix, title-cases the segment, falls back to filename minus `.xml`
  - Implement `extractDynamicGroups(sitemapUrls: string[]): DynamicGroup[]` — filters to `-dpages.xml` URLs and maps each to a `DynamicGroup`
  - Export both the type and both functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.1 Write property test for `extractDynamicGroups` filters to `-dpages.xml` only
    - **Property 1: extractDynamicGroups filters to -dpages.xml only**
    - **Validates: Requirements 1.1**

  - [ ]* 1.2 Write property test for label round-trip
    - **Property 2: Label round-trip**
    - **Validates: Requirements 1.2**

- [x] 2. Extend `lib/filter.ts` to support sitemap-URL exclude patterns
  - In `filterUrls`, update step 1 so that when an exclude pattern starts with `http`, it matches by `sourceSitemap === pattern` instead of `matchesPattern(url, pattern)`
  - Existing glob patterns must continue to work unchanged
  - _Requirements: 4.3, 5.3_

  - [ ]* 2.1 Write property test for filter excludes by sourceSitemap
    - **Property 8: Filter excludes by sourceSitemap**
    - **Validates: Requirements 4.3**

  - [ ]* 2.2 Write property test for combined filter applies patterns before scope
    - **Property 9: Combined filter applies patterns before scope**
    - **Validates: Requirements 5.3**

- [x] 3. Checkpoint — ensure `lib/sitemapGroups.ts` and `lib/filter.ts` are correct
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create `components/ExclusionDropdown.tsx` — multi-select dropdown component
  - Accept props: `groups: DynamicGroup[]`, `selected: string[]`, `onChange: (urls: string[]) => void`, `disabled?: boolean`
  - Render a field label "Exclude Dynamic Page Types"
  - Render a collapsed trigger button; when clicked, open the option list
  - Collapsed trigger text: placeholder `"None — include all dynamic pages"` when empty; labels joined by `", "` for ≤2 selections; `"{n} selected"` for ≥3
  - Option list: one row per group with a checkmark indicator for selected groups; clicking toggles selection
  - Close the list on outside click via `useEffect` + `mousedown` listener
  - Render helper text "Choose dynamic sitemap groups to exclude from scan." below the control
  - Disable and make non-interactive when `disabled` is true
  - Use `tokens[theme]` from `lib/theme.tsx` for all colours; match border-radius, font-size, and spacing of existing `ScopeSelector` styled components
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 6.1, 6.2, 6.3_

  - [ ]* 4.1 Write property test for dropdown visibility matches group presence
    - **Property 3: Dropdown visibility matches group presence**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 4.2 Write property test for all groups appear as rows with correct checkmark state
    - **Property 4: All groups appear as rows with correct checkmark state**
    - **Validates: Requirements 3.3, 3.4, 3.6**

  - [ ]* 4.3 Write property test for select-then-deselect round trip
    - **Property 5: Select-then-deselect round trip**
    - **Validates: Requirements 3.5**

  - [ ]* 4.4 Write property test for collapsed trigger summary text rule
    - **Property 6: Collapsed trigger summary text rule**
    - **Validates: Requirements 3.7**

- [x] 5. Modify `components/ScopeSelector.tsx` — replace textarea with `ExclusionDropdown`
  - Remove `excludePatterns: string` and `onExcludePatternsChange` props
  - Add `dynamicGroups?: DynamicGroup[]`, `selectedGroups?: string[]`, `onSelectedGroupsChange?: (urls: string[]) => void` props
  - Remove the `ExcludeTextarea` and its label; render `<ExclusionDropdown>` in that slot when `dynamicGroups` is non-empty
  - When `dynamicGroups` is empty or absent, render nothing in that slot
  - Forward `disabled` to `ExclusionDropdown`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Modify `components/SitemapInput.tsx` — forward new group props, remove textarea props
  - Remove `excludePatterns` and `onExcludePatternsChange` from props and from the `ScopeSelector` call
  - Add `dynamicGroups?: DynamicGroup[]`, `selectedGroups?: string[]`, `onSelectedGroupsChange?: (urls: string[]) => void` props and forward them to `ScopeSelector`
  - _Requirements: 2.1, 2.2_

- [x] 7. Modify `app/page.tsx` — wire state and derive groups
  - Replace `excludePatterns: string` state with `selectedGroups: string[]` (initialised to `[]`)
  - Derive `dynamicGroups` inline from `crawlResult?.sitemapUrls` via `extractDynamicGroups` (no extra state)
  - Reset `selectedGroups` to `[]` when a new crawl is initiated (inside `handleDiscover` before the fetch)
  - In `handleDiscover`, pass `excludePatterns: selectedGroups` to the `/api/sitemap` request body
  - When `dynamicGroups` is empty, pass `excludePatterns: []`
  - Pass `dynamicGroups`, `selectedGroups`, and `onSelectedGroupsChange` down through `SitemapInput`
  - Remove all references to the old `excludePatterns` string state
  - _Requirements: 1.3, 2.4, 4.1, 4.2, 4.4, 5.1, 5.2, 5.4_

  - [ ]* 7.1 Write property test for selected groups map to excludePatterns
    - **Property 7: Selected groups map to excludePatterns**
    - **Validates: Requirements 4.1**

- [x] 8. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The server-side filter pipeline (`lib/filter.ts`) and API route (`app/api/sitemap/route.ts`) require no structural changes — only the small backward-compatible extension in task 2
- Property tests use fast-check with a minimum of 100 iterations each and must include the comment `// Feature: dynamic-sitemap-exclusion, Property {N}: {property_text}`
