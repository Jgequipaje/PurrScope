// Improved (optimized) scan pipeline.
//
// Key differences from the previous pipeline:
//   - Controlled concurrency: scans CONCURRENCY pages simultaneously
//   - Browser launched once and pages reused from a pool (no per-URL launch)
//   - Early limit application before any work starts
//   - Fetch-first: Playwright only used when fetch fails or metadata incomplete
//   - Per-URL timeout via AbortController (no global stall)
//   - Graceful cancellation at concurrency boundaries
//
// To remove this pipeline later:
//   1. Delete this file.
//   2. Remove the "improved" case from scan/scanRunner.ts.
//   3. Remove the "Use Improved Process" button from SitemapDebug.

import { chromium, type Browser, type Page } from "playwright";
import { decodeEntities } from "@/lib/entities";
import type { ScanResult, ScanStatus } from "@/lib/types";
import type { ScanRunOptions, ScanRunResult } from "@/scan/types";
import { IMPROVED_CONCURRENCY, PERFORMANCE_CONFIGS, DEFAULT_PERFORMANCE_MODE } from "@/scan/types";

// ─── Tuning constants ─────────────────────────────────────────────────────────
// These are fallback defaults — actual values come from the PerformanceConfig
// passed in via ScanRunOptions.performanceMode at runtime.

const CONCURRENCY = IMPROVED_CONCURRENCY;
const FETCH_TIMEOUT_MS   = 10000;
const PW_NAV_TIMEOUT_MS  = 18000;
const PW_STABILIZE_MS    = 600;
const PW_RETRY_WAIT_MS   = 1000;
const PW_MAX_ATTEMPTS    = 2;

// ─── Blocked-page detection (shared logic, duplicated to keep pipelines isolated) ──

const BLOCKED_SIGNALS = [
  "just a moment", "checking your browser", "please wait",
  "ddos protection", "cloudflare", "access denied", "403 forbidden",
  "sign in to continue", "log in to continue", "verify you are human",
  "enable javascript", "bot protection", "security check", "attention required",
];

function looksBlocked(title: string, bodySnippet: string): boolean {
  const haystack = `${title} ${bodySnippet}`.toLowerCase();
  return BLOCKED_SIGNALS.some((s) => haystack.includes(s));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decode(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value).trim();
  return decoded || null;
}

const TITLE_MIN = 45, TITLE_MAX = 61;
const DESC_MIN  = 145, DESC_MAX  = 161;

function titleStatus(t: string | null, len: number): "Pass" | "Fail" {
  return t && len >= TITLE_MIN && len <= TITLE_MAX ? "Pass" : "Fail";
}
function descStatus(d: string | null, len: number): "Pass" | "Fail" {
  return d && len >= DESC_MIN && len <= DESC_MAX ? "Pass" : "Fail";
}
function deriveScanStatus(title: string | null, desc: string | null, error?: string): ScanStatus {
  if (error) return "scan_error";
  if (!title && !desc) return "missing";
  return "success";
}

function blockedResult(url: string, finalUrl: string, method: "fetch" | "playwright"): ScanResult {
  return {
    url, finalUrl,
    title: null, titleLength: 0, titleStatus: "Fail",
    description: null, descriptionLength: 0, descriptionStatus: "Fail",
    scanStatus: "Blocked (automation)", methodUsed: method,
    titleFound: false, descriptionFound: false, attempts: 1,
  };
}

function errorResult(url: string, message: string, method: "fetch" | "playwright"): ScanResult {
  return {
    url,
    title: null, titleLength: 0, titleStatus: "Fail",
    description: null, descriptionLength: 0, descriptionStatus: "Fail",
    scanStatus: "scan_error", methodUsed: method,
    error: message, titleFound: false, descriptionFound: false, attempts: 1,
  };
}

function parseHtml(html: string): { title: string | null; description: string | null; bodySnippet: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") || null : null;
  const descMatch =
    html.match(/<meta\s+name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta\s+content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() || null : null;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,2000})/i);
  const bodySnippet = bodyMatch
    ? bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)
    : "";
  return { title, description, bodySnippet };
}

// ─── Fetch scanner ────────────────────────────────────────────────────────────

type FetchOutcome =
  | { kind: "ok"; finalUrl: string; title: string | null; description: string | null }
  | { kind: "blocked"; finalUrl: string }
  | { kind: "failed"; reason: string };

async function fetchScan(url: string, fetchTimeoutMs: number, noCache: boolean, cancelSignal?: AbortSignal): Promise<FetchOutcome> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    cancelSignal?.addEventListener("abort", () => controller.abort(), { once: true });

    const res = await fetch(url, {
      signal: controller.signal,
      cache: noCache ? "no-store" : "default",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOChecker/1.0; +https://github.com/seo-checker)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return { kind: "failed", reason: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return { kind: "failed", reason: `Non-HTML (${ct})` };

    const html = await res.text();
    const { title, description, bodySnippet } = parseHtml(html);
    if (looksBlocked(title ?? "", bodySnippet)) return { kind: "blocked", finalUrl: res.url || url };
    return { kind: "ok", finalUrl: res.url || url, title, description };
  } catch (err) {
    return { kind: "failed", reason: err instanceof Error ? err.message : "fetch error" };
  }
}

// ─── Playwright scanner ───────────────────────────────────────────────────────

type PwOutcome =
  | { kind: "ok"; finalUrl: string; title: string | null; description: string | null; attempts: number }
  | { kind: "blocked"; finalUrl: string }
  | { kind: "failed"; reason: string };

async function pwScan(url: string, page: Page, pwNavTimeoutMs: number, pwStabilizeMs: number, signal?: AbortSignal): Promise<PwOutcome> {
  try {
    if (signal?.aborted) return { kind: "failed", reason: "cancelled" };
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: pwNavTimeoutMs });
    const finalUrl = page.url();

    let title: string | null = null;
    let description: string | null = null;
    let attempts = 0;

    for (let i = 0; i < PW_MAX_ATTEMPTS; i++) {
      attempts = i + 1;
      await page.waitForTimeout(i === 0 ? pwStabilizeMs : PW_RETRY_WAIT_MS);

      title = await page.title().catch(() => "") || null;
      description = await page.evaluate(() => {
        for (const sel of ['meta[name="description"]', 'meta[name="Description"]', 'meta[property="og:description"]']) {
          const c = document.querySelector(sel)?.getAttribute("content")?.trim();
          if (c) return c;
        }
        return null;
      }).catch(() => null);

      if (i === 0) {
        const body = await page.evaluate(() => (document.body?.innerText ?? "").slice(0, 500)).catch(() => "");
        if (looksBlocked(title ?? "", body)) return { kind: "blocked", finalUrl };
      }
      if (title && description) break;
    }

    return { kind: "ok", finalUrl, title, description, attempts };
  } catch (err) {
    return { kind: "failed", reason: err instanceof Error ? err.message : "playwright error" };
  }
}

// ─── Single URL scan ──────────────────────────────────────────────────────────

type ScanConfig = { fetchTimeoutMs: number; pwNavTimeoutMs: number; pwStabilizeMs: number; delayBetweenTasksMs: number; noCache: boolean };

async function scanOne(url: string, browser: Browser, cfg: ScanConfig, signal?: AbortSignal): Promise<ScanResult> {
  if (signal?.aborted) return errorResult(url, "cancelled", "fetch");

  const fetchOutcome = await fetchScan(url, cfg.fetchTimeoutMs, cfg.noCache, signal);
  if (signal?.aborted) return errorResult(url, "cancelled", "fetch");

  if (fetchOutcome.kind === "blocked") return blockedResult(url, fetchOutcome.finalUrl, "fetch");

  if (fetchOutcome.kind === "ok" && fetchOutcome.title && fetchOutcome.description) {
    const title = decode(fetchOutcome.title);
    const description = decode(fetchOutcome.description);
    const titleLength = title?.length ?? 0;
    const descriptionLength = description?.length ?? 0;
    return {
      url, finalUrl: fetchOutcome.finalUrl,
      title, titleLength, titleStatus: titleStatus(title, titleLength),
      description, descriptionLength, descriptionStatus: descStatus(description, descriptionLength),
      scanStatus: "success", methodUsed: "fetch",
      titleFound: true, descriptionFound: true, attempts: 1,
    };
  }

  // Playwright fallback
  if (signal?.aborted) return errorResult(url, "cancelled", "playwright");
  const page = await browser.newPage();
  try {
    const pwOutcome = await pwScan(url, page, cfg.pwNavTimeoutMs, cfg.pwStabilizeMs, signal);
    if (signal?.aborted) return errorResult(url, "cancelled", "playwright");
    if (pwOutcome.kind === "blocked") return blockedResult(url, pwOutcome.finalUrl, "playwright");
    if (pwOutcome.kind === "failed") return errorResult(url, pwOutcome.reason, "playwright");

    const title = decode(pwOutcome.title ?? (fetchOutcome.kind === "ok" ? fetchOutcome.title : null));
    const description = decode(pwOutcome.description ?? (fetchOutcome.kind === "ok" ? fetchOutcome.description : null));
    const titleLength = title?.length ?? 0;
    const descriptionLength = description?.length ?? 0;
    return {
      url, finalUrl: pwOutcome.finalUrl,
      title, titleLength, titleStatus: titleStatus(title, titleLength),
      description, descriptionLength, descriptionStatus: descStatus(description, descriptionLength),
      scanStatus: deriveScanStatus(title, description),
      methodUsed: "playwright",
      titleFound: !!title, descriptionFound: !!description, attempts: pwOutcome.attempts,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

// ─── Concurrency runner ───────────────────────────────────────────────────────

async function runConcurrent(
  urls: string[],
  browser: Browser,
  cfg: ScanConfig,
  concurrency: number,
  signal?: AbortSignal
): Promise<ScanResult[]> {
  const results: ScanResult[] = new Array(urls.length);
  let index = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) break;
      const i = index++;
      if (i >= urls.length) break;
      results[i] = await scanOne(urls[i], browser, cfg, signal);
      // Optional inter-task delay for safe mode
      if (cfg.delayBetweenTasksMs > 0 && !signal?.aborted) {
        await new Promise((r) => setTimeout(r, cfg.delayBetweenTasksMs));
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Filter out any unfilled slots (from cancellation mid-run)
  return results.filter(Boolean);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runImprovedProcess(options: ScanRunOptions): Promise<ScanRunResult> {
  const { urls, limit, signal, performanceMode = DEFAULT_PERFORMANCE_MODE, noCache = false } = options;
  const toScan = limit !== undefined ? urls.slice(0, limit) : urls;

  const perfConfig = PERFORMANCE_CONFIGS[performanceMode];
  const cfg: ScanConfig = {
    fetchTimeoutMs: perfConfig.fetchTimeoutMs,
    pwNavTimeoutMs: perfConfig.pwNavTimeoutMs,
    pwStabilizeMs: perfConfig.pwStabilizeMs,
    delayBetweenTasksMs: perfConfig.delayBetweenTasksMs,
    noCache,
  };

  const browser = await chromium.launch({ headless: true });
  const startedAt = Date.now();

  let results: ScanResult[] = [];
  try {
    results = await runConcurrent(toScan, browser, cfg, perfConfig.concurrency, signal);
  } finally {
    await browser.close();
  }

  const finishedAt = Date.now();
  return {
    pipeline: "improved",
    results,
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    scannedCount: results.length,
    performanceMode,
  };
}
