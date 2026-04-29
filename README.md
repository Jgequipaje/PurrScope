# PurrScope

> Automated SEO & Compliance QA — scan page titles and meta descriptions across any site, flag issues, and review results.

Built by [byjeff.dev](https://www.byjeff.dev/)

---

## What it does

PurrScope scans websites for SEO issues by checking page titles and meta descriptions against defined pass/fail ranges. It supports both manual URL input and full sitemap crawling, making it useful for quick spot-checks or large-scale audits.

## Features

- **Manual mode** — paste up to 10 URLs and scan them directly
- **Sitemap mode** — enter a site URL, auto-discover all pages via sitemap, then scan
- **Scope filtering** — scan all pages, static-only, or dynamic-only
- **Dynamic group exclusion** — exclude specific sitemap groups from a scan
- **Scan limit** — cap the number of URLs scanned per run
- **Smart results table** — filter by All / Failed / Passed / Blocked, search by URL, sort columns, paginate large results
- **Recent searches** — history of past inputs persisted locally
- **Dark / light theme** — defaults to dark, no flash on load
- **Responsive layout** — works on mobile, tablet, and desktop
- **Copy results** — export scan results to clipboard

## SEO Rules

| Field            | Pass range         |
| ---------------- | ------------------ |
| Title            | 45–61 characters   |
| Meta description | 145–161 characters |

Pages are classified as `success`, `missing`, `scan_error`, or `Blocked (automation)`.

---

## Running locally

PurrScope runs locally because it uses Playwright (headless Chromium) as a fallback scanner — this cannot run on serverless platforms like Vercel.

### Requirements

- [Node.js 18+](https://nodejs.org)
- Windows (for the `.bat` launchers) or any OS with npm

### Quick start (Windows)

Double-click `start-dev.bat` — it will:

1. Check Node.js is installed
2. Install dependencies if needed
3. Start the dev server at `http://localhost:3000`
4. Open your browser automatically

```
start-dev.bat   ← development mode (hot reload, use this daily)
start.bat       ← production mode (builds first, then serves)
```

### Manual start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

---

## Tech stack

- **Next.js 16** (App Router) — React 19, TypeScript 5
- **Playwright** — headless Chromium for JS-rendered page scanning
- **styled-components** — theming and UI
- **Zustand** — state management

---

## Note on deployment

This app requires a persistent Node.js server with Playwright installed. It cannot be deployed to serverless platforms (Vercel, Netlify, etc.). For team use, deploy to a VPS (DigitalOcean, Fly.io, etc.) or run locally.
