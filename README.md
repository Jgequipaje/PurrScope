# PurrScope

Automated SEO & Compliance QA — scan page titles and meta descriptions across any site, flag issues, and export results.

## Current Features

- **Manual mode** — paste up to 10 URLs and scan them directly
- **Sitemap mode** — enter a site URL, auto-discover all pages via sitemap, then scan
- **Scope filtering** — scan all pages, static-only, or dynamic-only (based on source sitemap)
- **Dynamic group exclusion** — exclude specific `-dpages.xml` sitemap groups from a scan
- **Scan limit** — cap the number of URLs scanned per run
- **Recent searches** — history of past manual inputs and sitemap URLs
- **Dark / light theme** — persisted to `localStorage`, defaults to dark, no flash on load
- **Responsive layout** — works on mobile, tablet, and desktop
- **Friendly error messages** — "No sitemap found" with expandable technical detail
- **Dual pipeline** (internal) — improved concurrent engine + legacy sequential engine kept in reserve
- **Benchmark mode** (internal) — compare both pipelines on identical inputs with cold/warm cache runs
- **Performance mode selector** (internal) — Safe / Balanced / Fast concurrency presets

## SEO Rules

| Field | Pass range |
|---|---|
| Title | 45–61 characters |
| Meta description | 145–161 characters |

Pages are classified as `success`, `missing`, `scan_error`, or `Blocked (automation)`.

---

## Pre-Deployment Checklist

Before going live, clean up the internal/developer tooling that end users don't need.

### Remove from UI

| What | Where | Why |
|---|---|---|
| Performance Mode selector (Safe / Balanced / Fast) | `components/PerformanceModeSelector.tsx`, `components/SitemapDebug.tsx` | Users don't understand concurrency — hardcode `balanced` |
| Run mode toggle (Cold / Warm) | `components/SitemapDebug.tsx` | Benchmark tooling, not a user feature |
| Reset Benchmark button | `components/SitemapDebug.tsx` | Goes with benchmark mode |
| Benchmark Comparison Table | `components/BenchmarkComparisonTable.tsx` | Internal pipeline comparison only |
| FilterDebug panel | `components/FilterDebug.tsx`, inside `SitemapDebug` | Internal filter breakdown, replace with summary bar |
| "Discovery Results" debug section | `components/SitemapDebug.tsx` | Simplify to counts + scan limit + Start Scan only |

### Keep but simplify

| What | Action |
|---|---|
| Scan pipeline | Keep improved pipeline only, remove Previous Process button (already done) |
| `SitemapDebug` | Strip to: discovered count, selected count, scan limit input, Start Scan button |
| Crawl summary bar | Already clean — "X pages discovered / Y pages selected for scanning" |

### Code to delete after UI cleanup

```
components/BenchmarkComparisonTable.tsx
components/FilterDebug.tsx
components/PerformanceModeSelector.tsx
scan/benchmarkTypes.ts
scan/benchmarkUtils.ts
```

Keep these (server-side only, no user impact):
```
scan/pipelines/previousProcess.ts   ← reserve, not exposed in UI
scan/pipelines/improvedProcess.ts   ← active pipeline
scan/scanRunner.ts
app/api/scan/route.ts               ← reserve route
app/api/scan-improved/route.ts      ← active route
```

### State to remove from `app/page.tsx`

- `benchmarkRunMode`, `setBenchmarkRunMode`
- `benchmarkSnapshot`, `setBenchmarkSnapshot`
- `benchPrevious`, `setBenchPrevious`
- `benchImproved`, `setBenchImproved`
- `prevResults`, `setPrevResults`
- `imprResults`, `setImprResults`
- `performanceMode` state + `setPerformanceMode` (replace with constant `"balanced"`)
- All `computeMetrics` / `createSnapshot` calls
- `BenchmarkComparisonTable` render block

### Final user-facing flow after cleanup

1. Choose **Manual URLs** or **Sitemap Crawl**
2. Enter URL(s)
3. _(Sitemap only)_ Crawl → see pages discovered → choose scope / exclusions → set optional limit
4. Hit **Start Scan**
5. Review results table — Pass/Fail per page, expandable detail rows
6. Copy results to clipboard

---

## Architecture

```
app/                        Next.js App Router
  page.tsx                  Main UI — all state lives here
  layout.tsx                Root layout, theme bootstrap, FOUC prevention
  api/
    scan/route.ts           API route → previous pipeline (reserve)
    scan-improved/route.ts  API route → improved pipeline (active)
    sitemap/route.ts        API route → sitemap crawler

scan/                       Scan engine (server-only)
  scanRunner.ts             Pipeline selector
  types.ts                  Shared pipeline types + PerformanceMode configs
  benchmarkTypes.ts         Benchmark snapshot + metrics types (remove pre-deploy)
  benchmarkUtils.ts         Pure benchmark helpers (remove pre-deploy)
  pipelines/
    previousProcess.ts      Sequential pipeline — reserve, not exposed in UI
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
  theme.tsx                 ThemeContext + design tokens (dark default, no FOUC)
  registry.tsx              styled-components SSR registry

components/                 React UI components
  ModeTabs.tsx              Manual / Sitemap tab switcher (responsive)
  ManualInput.tsx           URL textarea + scan button
  SitemapInput.tsx          Sitemap URL input (crawl phase only)
  ScopeSelector.tsx         All / Static / Dynamic scope picker
  ExclusionDropdown.tsx     Dynamic group multi-select
  SitemapDebug.tsx          Discovery counts + scan controls (simplify pre-deploy)
  ResultsTable.tsx          Scan results table with pass/fail highlighting
  RecentSearches.tsx        History list
  FilterDebug.tsx           Filter breakdown — remove pre-deploy
  BenchmarkComparisonTable  Pipeline comparison — remove pre-deploy
  PerformanceModeSelector   Concurrency preset picker — remove pre-deploy
```

### Scan pipeline

Each pipeline follows the same two-step strategy per URL:

1. **Fetch** — HTTP GET + regex HTML parse. Fast, no browser overhead.
2. **Playwright fallback** — headless Chromium, used when fetch fails or returns incomplete metadata.

Blocked/interstitial pages (Cloudflare, login walls, bot checks) are detected by matching known phrases in the title and body text, and classified as `Blocked (automation)` without extracting SEO fields.

The **improved pipeline** adds:
- Controlled concurrency (4 workers at balanced mode)
- Single browser instance shared across all pages in a run
- Per-URL `AbortController` timeout
- Graceful cancellation at concurrency boundaries

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
