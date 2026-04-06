# Tech Stack

## Framework & Runtime
- **Next.js** (App Router, v16) — React 19, TypeScript 5, Node.js 18+
- **Styled-components** v6 with SSR registry (`lib/registry.tsx`) and Next.js compiler plugin
- **Zustand** v5 — client state management (QA Center store)
- **react-icons** — icon library

## Scan Engine
- **Playwright** (Chromium) — headless browser fallback for JS-rendered pages
- Two pipelines: `scan/pipelines/improvedProcess.ts` (active, concurrent) and `scan/pipelines/previousProcess.ts` (reserve, sequential)
- Active API route: `app/api/scan-improved/route.ts`

## Testing
- **Vitest** — unit/property test runner
- **fast-check** — property-based testing library
- **Playwright** — end-to-end tests in `playwright-automation/`

## TypeScript Config
- Strict mode enabled
- Path alias: `@/*` maps to project root
- Module resolution: `bundler`

## Common Commands

```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build
npm run start     # Start production server
npm test          # Run Vitest unit/property tests (single run, no watch)
```

For Playwright e2e tests, run from the `playwright-automation/` subdirectory — it has its own `package.json` and `playwright.config.ts`.

## Theme System
- Dark/light theme via `ThemeContext` in `lib/theme.tsx`
- Design tokens exported as `tokens.light` / `tokens.dark` — always use these, never raw hex values
- FOUC prevention via blocking inline script in `app/layout.tsx` that sets `data-theme` before paint
- Default theme is dark
