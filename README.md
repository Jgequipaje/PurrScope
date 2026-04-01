# SEO Metadata Checker

An internal QA tool for auditing page titles and meta descriptions across a site. Paste URLs manually or point it at a sitemap — it scans each page and flags anything outside the recommended character ranges.

## Features

- **Manual mode** — paste up to 10 URLs and scan them directly
- **Sitemap mode** — enter a site URL, auto-discover all pages via sitemap, then scan
- **Scope filtering** — scan all pages, static-only, or dynamic-only (based on source sitemap)
- **Dynamic group exclusion** — exclude specific `-dpages.xml` sitemap groups from a scan
- **Dual pipeline** — run the previous (sequential) or improved (concurrent) scan engine and compare results side-by-side
- **Benchmark mode** — compare both pipelines on identical inputs with cold/warm cache runs
- **Performance modes** — Safe / Balanced / Fast concurrency presets for the improved pipeline
- **Scan limit** — cap the number of URLs scanned per run
- **Recent searches** — history of past manual inputs and sitemap URLs
- **Dark / light theme** — persisted to `localStorage`, defaults to dark

## SEO Rules

| Field | Pass range |
|---|---|
| Title | 45–61 characters |
| Meta description | 145–161 characters |

Pages are classified as `success`, `missing`, `scan_error`, or `Blocked (automation)`.

## Architecture

```
app/                        Next.js App Router
  page.tsx                  Main UI — all state lives here
  layout.tsx                Root layout, theme bootstrap, fonts
  api/
    scan/route.ts           API route → previous pipeline
    scan-improved/route.ts  API route → improved pipeline
    sitemap/route.ts        API route → sitemap crawler

scan/                       Scan engine (server-only)
  scanRunner.ts             Pipeline selector
  types.ts                  Shared pipeline types + PerformanceMode configs
  benchmarkTypes.ts         Benchmark snapshot + metrics types
  benchmarkUtils.ts         Pure benchmark helpers (compute, compare, format)
  pipelines/
    previousProcess.ts      Sequential pipeline (wraps lib/scanner.ts)
    improvedProcess.ts      Concurrent pipeline with browser pool + fetch-first

lib/                        Shared utilities
  scanner.ts                Original sequential scanner (fetch → Playwright fallback)
  filter.ts                 URL filter pipeline (scope + exclusion logic)
  sitemapGroups.ts          Dynamic group extraction from sitemap URLs
  sitemap.ts                Sitemap crawler
  types.ts                  Core shared types (ScanResult, ScanScope, etc.)
  history.ts                localStorage recent-searches helpers
  urlValidation.ts          URL normalisation + validation
  duration.ts               Scan timer state helpers
  entities.ts               HTML entity decoder
  theme.tsx                 ThemeContext + design tokens
  registry.tsx              styled-components SSR registry

components/                 React UI components
  ModeTabs.tsx              Manual / Sitemap tab switcher
  ManualInput.tsx           URL textarea + scan button
  SitemapInput.tsx          Sitemap URL input + scope/group controls
  SitemapDebug.tsx          Crawl summary + pipeline/benchmark controls
  ResultsTable.tsx          Scan results table with pass/fail highlighting
  BenchmarkComparisonTable  Side-by-side pipeline metrics + consistency report
  ExclusionDropdown.tsx     Dynamic group multi-select
  ScopeSelector.tsx         All / Static / Dynamic scope picker
  PerformanceModeSelector   Safe / Balanced / Fast preset picker
  RecentSearches.tsx        History list
  FilterDebug.tsx           Filter breakdown debug panel
```

### Scan pipeline

Each pipeline follows the same two-step strategy per URL:

1. **Fetch** — HTTP GET + regex HTML parse. Fast, no browser overhead.
2. **Playwright fallback** — headless Chromium, used when fetch fails or returns incomplete metadata.

Blocked/interstitial pages (Cloudflare, login walls, bot checks) are detected by matching known phrases in the title and body text, and classified as `Blocked (automation)` without extracting SEO fields.

The **improved pipeline** adds:
- Controlled concurrency (2–6 workers depending on performance mode)
- Single browser instance shared across all pages in a run
- Per-URL `AbortController` timeout
- Graceful cancellation at concurrency boundaries

### Benchmark system

Both pipelines can be run against an identical frozen input snapshot (`BenchmarkSnapshot`) so results are directly comparable. `BenchmarkMetrics` captures timing, counts, and config for each run. `ConsistencyReport` compares title/description/status agreement between the two result sets.

## Getting Started

```bash
npm install
npm run dev
```

Requires Node.js 18+ and Playwright's Chromium browser (installed via `@playwright/browser-chromium`).

## Testing

```bash
npm test
```

Uses [Vitest](https://vitest.dev/) with [fast-check](https://fast-check.dev/) for property-based tests.
