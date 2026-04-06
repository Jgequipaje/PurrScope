# Project Structure

## Top-Level Layout

```
app/                    Next.js App Router — pages and API routes
components/             Shared React UI components
features/               Self-contained feature modules
lib/                    Shared utilities and types
scan/                   Scan engine (server-only)
data/                   JSON persistence files
playwright-automation/  Standalone e2e test suite (own package.json)
```

## app/

- `page.tsx` — main UI, all scan state lives here (single-page app pattern)
- `layout.tsx` — root layout, theme bootstrap, FOUC prevention, QA Center mount point
- `api/scan-improved/route.ts` — active scan API (concurrent pipeline)
- `api/scan/route.ts` — reserve scan API (sequential pipeline)
- `api/sitemap/route.ts` — sitemap crawler API
- `api/qa-issues/` — CRUD API for QA Center issues

## components/

Shared, reusable UI components. Styled with styled-components using `tokens` from `lib/theme.tsx`.

Key components:
- `ModeTabs` — manual/sitemap tab switcher
- `SitemapDebug` — post-crawl controls (scan limit, start scan)
- `ScopeSelector` — scope + exclusion filter UI
- `ResultsTable` — scan results with pass/fail highlighting
- `RecentSearches` — localStorage-backed history list

> Note: `BenchmarkComparisonTable`, `FilterDebug`, and `PerformanceModeSelector` are internal dev tools scheduled for removal before production.

## features/

Feature modules with co-located components, store, services, types, and utils.

```
features/qa-center/
  components/     React components for the QA drawer UI
  store/          Zustand store (useQACenterStore.ts)
  services/       API service layer + markdown parser
  types/          TypeScript types for issues, filters, etc.
  mock/           Mock data for development
```

## lib/

Shared utilities — imported by both client components and server API routes.

- `types.ts` — core shared types (`ScanResult`, `ScanScope`, `FilterResult`, etc.)
- `theme.tsx` — `ThemeProvider`, `useTheme`, and `tokens` design token map
- `filter.ts` — URL filter pipeline (scope + exclusion logic)
- `scanner.ts` — original sequential scanner (fetch → Playwright fallback)
- `sitemap.ts` — sitemap crawler
- `sitemapGroups.ts` — dynamic group extraction from sitemap URLs
- `history.ts` — localStorage recent-searches helpers
- `urlValidation.ts` — URL normalisation and validation
- `duration.ts` — scan timer state helpers
- `entities.ts` — HTML entity decoder
- `registry.tsx` — styled-components SSR registry

## scan/

Server-only scan engine. Never imported by client components.

- `scanRunner.ts` — pipeline selector
- `types.ts` — pipeline types and `PerformanceMode` configs
- `pipelines/improvedProcess.ts` — active concurrent pipeline
- `pipelines/previousProcess.ts` — reserve sequential pipeline
- `benchmarkTypes.ts` / `benchmarkUtils.ts` — internal benchmark tooling (remove pre-deploy)

## data/

- `issues.json` — persisted QA Center issues
- `available-tests.json` — Playwright test registry for issue linking

## Conventions

- All types for a domain live in `lib/types.ts` (core) or `features/<name>/types/index.ts` (feature-scoped)
- Styled-components props use `$`-prefixed transient props (e.g. `$color`, `$bg`) to avoid forwarding to DOM
- State management: `useState`/`useMemo` in `app/page.tsx` for scan state; Zustand for QA Center
- API routes are thin — business logic lives in `lib/` or `scan/`
- `@/` path alias resolves to project root
