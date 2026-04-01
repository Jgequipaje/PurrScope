// SEO metadata scanner.
//
// Strategy:
//   1. Primary: HTTP GET + HTML parse (fast, no browser overhead)
//   2. Fallback: Playwright headless browser (for JS-rendered pages)
//
// Blocked/interstitial detection:
//   If a page appears to be a challenge, login wall, or bot-protection screen,
//   it is classified as "Blocked (automation)" — no SEO fields are extracted
//   and no pass/fail is applied.
//
// Playwright rules:
//   - Read-only. Never clicks, signs in, or interacts with any UI element.

import { chromium, type Page } from "playwright";
import { decodeEntities } from "./entities";
import type { ScanResult, ScanStatus } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TITLE_MIN = 45;
export const TITLE_MAX = 61;
export const DESC_MIN  = 145;
export const DESC_MAX  = 161;

export const MAX_MANUAL_URLS  = 10;
export const MAX_SITEMAP_URLS = 1000;

const FETCH_TIMEOUT_MS        = 12000;
const PW_NAV_TIMEOUT_MS       = 20000;
const PW_STABILIZE_MS         = 800;
const PW_RETRY_WAIT_MS        = 1200;
const PW_MAX_ATTEMPTS         = 2;   // 1 initial + 1 retry

// ─── Blocked-page detection ───────────────────────────────────────────────────

/**
 * Phrases that indicate a challenge / interstitial / login wall.
 * Matched case-insensitively against the page title and a snippet of body text.
 */
const BLOCKED_SIGNALS = [
  "just a moment",
  "checking your browser",
  "please wait",
  "ddos protection",
  "cloudflare",
  "access denied",
  "403 forbidden",
  "sign in to continue",
  "log in to continue",
  "verify you are human",
  "enable javascript",
  "bot protection",
  "security check",
  "attention required",
];

function looksBlocked(title: string, bodySnippet: string): boolean {
  const haystack = `${title} ${bodySnippet}`.toLowerCase();
  return BLOCKED_SIGNALS.some((s) => haystack.includes(s));
}

// ─── Entity decoding ──────────────────────────────────────────────────────────

/** Decode entities in a nullable string; return null if result is empty. */
function decode(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value).trim();
  return decoded || null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function titleStatus(title: string | null, length: number): "Pass" | "Fail" {
  return title && length >= TITLE_MIN && length <= TITLE_MAX ? "Pass" : "Fail";
}

function descStatus(description: string | null, length: number): "Pass" | "Fail" {
  return description && length >= DESC_MIN && length <= DESC_MAX ? "Pass" : "Fail";
}

function deriveScanStatus(
  title: string | null,
  description: string | null,
  error?: string
): ScanStatus {
  if (error) return "scan_error";
  if (!title && !description) return "missing";
  return "success";
}

// ─── Blocked result factory ───────────────────────────────────────────────────

function blockedResult(
  url: string,
  finalUrl: string,
  method: "fetch" | "playwright"
): ScanResult {
  return {
    url,
    finalUrl,
    title: null,
    titleLength: 0,
    titleStatus: "Fail",
    description: null,
    descriptionLength: 0,
    descriptionStatus: "Fail",
    scanStatus: "Blocked (automation)",
    methodUsed: method,
    titleFound: false,
    descriptionFound: false,
    attempts: 1,
  };
}

// ─── Error result factory ─────────────────────────────────────────────────────

function errorResult(url: string, message: string, method: "fetch" | "playwright"): ScanResult {
  return {
    url,
    title: null,
    titleLength: 0,
    titleStatus: "Fail",
    description: null,
    descriptionLength: 0,
    descriptionStatus: "Fail",
    scanStatus: "scan_error",
    methodUsed: method,
    error: message,
    titleFound: false,
    descriptionFound: false,
    attempts: 1,
  };
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

/**
 * Extracts <title> and meta description from raw HTML using regex.
 * Fast and dependency-free — no DOM parser needed.
 */
function parseHtml(html: string): { title: string | null; description: string | null; bodySnippet: string } {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") || null : null;

  // Meta description — standard and case-insensitive variants
  const descMatch =
    html.match(/<meta\s+name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta\s+content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() || null : null;

  // Body snippet for blocked-page detection (first 500 chars of visible text)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,2000})/i);
  const bodySnippet = bodyMatch
    ? bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)
    : "";

  return { title, description, bodySnippet };
}

// ─── Primary: HTTP fetch ──────────────────────────────────────────────────────

type FetchScanOutcome =
  | { kind: "ok"; finalUrl: string; title: string | null; description: string | null }
  | { kind: "blocked"; finalUrl: string }
  | { kind: "failed"; reason: string };

async function scanWithFetch(url: string, cancelSignal?: AbortSignal, noCache = false): Promise<FetchScanOutcome> {
  try {
    // Use a combined signal: per-request timeout + outer cancellation
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    if (cancelSignal) {
      cancelSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const res = await fetch(url, {
      signal: controller.signal,
      cache: noCache ? "no-store" : "default",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOChecker/1.0; +https://github.com/seo-checker)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    const finalUrl = res.url || url;
    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      return { kind: "failed", reason: `HTTP ${res.status}` };
    }

    if (!contentType.includes("text/html")) {
      return { kind: "failed", reason: `Non-HTML response (${contentType})` };
    }

    const html = await res.text();
    const { title, description, bodySnippet } = parseHtml(html);

    if (looksBlocked(title ?? "", bodySnippet)) {
      return { kind: "blocked", finalUrl };
    }

    return { kind: "ok", finalUrl, title, description };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "fetch error";
    return { kind: "failed", reason };
  }
}

// ─── Fallback: Playwright ─────────────────────────────────────────────────────

async function extractTitlePw(page: Page): Promise<string | null> {
  const native = await page.title().catch(() => "");
  if (native.trim()) return native.trim();
  const dom = await page.evaluate(() =>
    document.querySelector("title")?.textContent?.trim() ?? ""
  ).catch(() => "");
  return dom || null;
}

async function extractDescriptionPw(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const selectors = [
      'meta[name="description"]',
      'meta[name="Description"]',
      'meta[property="og:description"]',
    ];
    for (const sel of selectors) {
      const content = document.querySelector(sel)?.getAttribute("content")?.trim();
      if (content) return content;
    }
    return null;
  }).catch(() => null);
}

async function extractBodySnippetPw(page: Page): Promise<string> {
  return page.evaluate(() =>
    (document.body?.innerText ?? "").slice(0, 500)
  ).catch(() => "");
}

type PwScanOutcome =
  | { kind: "ok"; finalUrl: string; title: string | null; description: string | null; attempts: number }
  | { kind: "blocked"; finalUrl: string }
  | { kind: "failed"; reason: string };

async function scanWithPlaywright(url: string, page: Page, signal?: AbortSignal): Promise<PwScanOutcome> {
  try {
    if (signal?.aborted) return { kind: "failed", reason: "cancelled" };
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PW_NAV_TIMEOUT_MS });
    const finalUrl = page.url();

    let title: string | null = null;
    let description: string | null = null;
    let attempts = 0;

    for (let i = 0; i < PW_MAX_ATTEMPTS; i++) {
      attempts = i + 1;
      await page.waitForTimeout(i === 0 ? PW_STABILIZE_MS : PW_RETRY_WAIT_MS);

      title       = await extractTitlePw(page);
      description = await extractDescriptionPw(page);

      // Check for blocked page on first attempt
      if (i === 0) {
        const bodySnippet = await extractBodySnippetPw(page);
        if (looksBlocked(title ?? "", bodySnippet)) {
          return { kind: "blocked", finalUrl };
        }
      }

      if (title && description) break;
    }

    return { kind: "ok", finalUrl, title, description, attempts };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "playwright error";
    return { kind: "failed", reason };
  }
}

// ─── Public scanner ───────────────────────────────────────────────────────────

/**
 * Scans an array of URLs.
 *
 * Accepts an optional AbortSignal — checked before each URL so cancellation
 * stops the loop immediately without waiting for the current page to finish.
 *
 * For each URL:
 *   1. Try HTTP fetch + HTML parse.
 *   2. If fetch fails or metadata is incomplete, fall back to Playwright.
 *   3. Classify blocked/interstitial pages without extracting SEO fields.
 */
export async function scanUrls(urls: string[], signal?: AbortSignal, noCache = false): Promise<ScanResult[]> {
  // Launch browser once for all Playwright fallbacks
  const browser = await chromium.launch({ headless: true });
  const results: ScanResult[] = [];

  try {
    for (const requestedUrl of urls) {
      // Stop immediately if the client cancelled
      if (signal?.aborted) {
        console.log("[scanner] Cancelled — stopping loop");
        break;
      }

      console.log(`[scanner] Scanning ${requestedUrl}`);

      // ── Step 1: fetch ──────────────────────────────────────────────────────
      const fetchOutcome = await scanWithFetch(requestedUrl, signal, noCache);

      // Abort check after potentially long fetch
      if (signal?.aborted) break;

      if (fetchOutcome.kind === "blocked") {
        console.log(`[scanner] BLOCKED (fetch) ${requestedUrl}`);
        results.push(blockedResult(requestedUrl, fetchOutcome.finalUrl, "fetch"));
        continue;
      }

      // If fetch succeeded and both fields are present, we're done
      if (
        fetchOutcome.kind === "ok" &&
        fetchOutcome.title &&
        fetchOutcome.description
      ) {
        const { finalUrl } = fetchOutcome;
        const title       = decode(fetchOutcome.title);
        const description = decode(fetchOutcome.description);
        const titleLength = title       ? title.length       : 0;
        const descriptionLength = description ? description.length : 0;
        console.log(`[scanner] OK (fetch) ${finalUrl} title=${titleLength}ch desc=${descriptionLength}ch`);
        results.push({
          url: requestedUrl,
          finalUrl,
          title,
          titleLength,
          titleStatus: titleStatus(title, titleLength),
          description,
          descriptionLength,
          descriptionStatus: descStatus(description, descriptionLength),
          scanStatus: "success",
          methodUsed: "fetch",
          titleFound: true,
          descriptionFound: true,
          attempts: 1,
        });
        continue;
      }

      // ── Step 2: Playwright fallback ────────────────────────────────────────
      if (signal?.aborted) break;

      console.log(
        `[scanner] Falling back to Playwright for ${requestedUrl}` +
        (fetchOutcome.kind === "failed" ? ` (${fetchOutcome.reason})` : " (incomplete metadata)")
      );

      const page = await browser.newPage();
      try {
        const pwOutcome = await scanWithPlaywright(requestedUrl, page, signal);

        if (signal?.aborted) break;

        if (pwOutcome.kind === "blocked") {
          console.log(`[scanner] BLOCKED (playwright) ${requestedUrl}`);
          results.push(blockedResult(requestedUrl, pwOutcome.finalUrl, "playwright"));
          continue;
        }

        if (pwOutcome.kind === "failed") {
          console.log(`[scanner] ERROR ${requestedUrl} — ${pwOutcome.reason}`);
          results.push(errorResult(requestedUrl, pwOutcome.reason, "playwright"));
          continue;
        }

        const { finalUrl, attempts } = pwOutcome;

        const resolvedTitle = decode(
          pwOutcome.title ?? (fetchOutcome.kind === "ok" ? fetchOutcome.title : null)
        );
        const resolvedDescription = decode(
          pwOutcome.description ?? (fetchOutcome.kind === "ok" ? fetchOutcome.description : null)
        );

        const titleLength       = resolvedTitle       ? resolvedTitle.length       : 0;
        const descriptionLength = resolvedDescription ? resolvedDescription.length : 0;

        console.log(
          `[scanner] OK (playwright) ${finalUrl} ` +
          `title=${titleLength}ch desc=${descriptionLength}ch attempts=${attempts}`
        );

        results.push({
          url: requestedUrl,
          finalUrl,
          title: resolvedTitle,
          titleLength,
          titleStatus: titleStatus(resolvedTitle, titleLength),
          description: resolvedDescription,
          descriptionLength,
          descriptionStatus: descStatus(resolvedDescription, descriptionLength),
          scanStatus: deriveScanStatus(resolvedTitle, resolvedDescription),
          methodUsed: "playwright",
          titleFound: !!resolvedTitle,
          descriptionFound: !!resolvedDescription,
          attempts,
        });
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
