# PurrScope — Product Overview

PurrScope is an automated SEO & Compliance QA tool. It scans page titles and meta descriptions across websites, flags issues against defined pass ranges, and lets users export results.

## Core User Flows

1. **Manual mode** — paste up to 10 URLs and scan directly
2. **Sitemap mode** — enter a site URL, auto-discover pages via sitemap, then scan with optional scope/exclusion filtering

## SEO Rules

| Field            | Pass range       |
|------------------|------------------|
| Title            | 45–61 characters |
| Meta description | 145–161 characters |

## Page Statuses

- `success` — SEO fields extracted and evaluated
- `missing` — fields not found
- `scan_error` — fetch/playwright failure
- `Blocked (automation)` — Cloudflare/login wall detected

## Secondary Feature: QA Center

A floating drawer UI for tracking QA issues. Supports manual issue creation, markdown import, Playwright test linking, and status tracking. Persisted via API to `data/issues.json`.

## Pre-Deployment Notes

Several internal/benchmark components exist in the codebase that are not intended for end users (benchmark comparison table, performance mode selector, filter debug panel). These are marked for removal before production deployment. See `README.md` for the full cleanup checklist.
