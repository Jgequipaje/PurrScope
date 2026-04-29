// Improved scan pipeline — fetch-only, no Playwright.
// Playwright was removed for serverless/cloud deployment compatibility.
// Pages that require JS rendering will return scanStatus: "missing".
//
// Strategy per URL:
//   1. HTTP GET + regex HTML parse (fast, no browser overhead)
//   2. Blocked-page detection via title/body signals
//   3. Controlled concurrency with AbortController per URL

import { decodeEntities } from "@/lib/entities";
import type { ScanResult, ScanStatus } from "@/lib/types";
import type { ScanRunOptions, ScanRunResult } from "@/scan/types";
import { PERFORMANCE_CONFIGS, DEFAULT_PERFORMANCE_MODE } from "@/scan/types";

const FETCH_TIMEOUT_MS = 12000;

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

function decode(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value).trim();
  return decoded || null;
}

const TITLE_MIN = 45,
  TITLE_MAX = 61;
const DESC_MIN = 145,
  DESC_MAX = 161;

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

function parseHtml(html: string): {
  title: string | null;
  description: string | null;
  bodySnippet: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") || null : null;
  const descMatch =
    html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() || null : null;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,2000})/i);
  const bodySnippet = bodyMatch
    ? bodyMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 500)
    : "";
  return { title, description, bodySnippet };
}

async function scanOne(
  url: string,
  fetchTimeoutMs: number,
  noCache: boolean,
  signal?: AbortSignal
): Promise<ScanResult> {
  if (signal?.aborted) {
    return {
      url,
      title: null,
      titleLength: 0,
      titleStatus: "Fail",
      description: null,
      descriptionLength: 0,
      descriptionStatus: "Fail",
      scanStatus: "scan_error",
      methodUsed: "fetch",
      error: "cancelled",
      titleFound: false,
      descriptionFound: false,
      attempts: 1,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
    signal?.addEventListener("abort", () => controller.abort(), { once: true });

    const res = await fetch(url, {
      signal: controller.signal,
      cache: noCache ? "no-store" : "default",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PurrScope/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        url,
        title: null,
        titleLength: 0,
        titleStatus: "Fail",
        description: null,
        descriptionLength: 0,
        descriptionStatus: "Fail",
        scanStatus: "scan_error",
        methodUsed: "fetch",
        error: `HTTP ${res.status}`,
        titleFound: false,
        descriptionFound: false,
        attempts: 1,
      };
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) {
      return {
        url,
        title: null,
        titleLength: 0,
        titleStatus: "Fail",
        description: null,
        descriptionLength: 0,
        descriptionStatus: "Fail",
        scanStatus: "scan_error",
        methodUsed: "fetch",
        error: `Non-HTML (${ct})`,
        titleFound: false,
        descriptionFound: false,
        attempts: 1,
      };
    }

    const html = await res.text();
    const { title: rawTitle, description: rawDesc, bodySnippet } = parseHtml(html);
    const finalUrl = res.url || url;

    if (looksBlocked(rawTitle ?? "", bodySnippet)) {
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
        methodUsed: "fetch",
        titleFound: false,
        descriptionFound: false,
        attempts: 1,
      };
    }

    const title = decode(rawTitle);
    const description = decode(rawDesc);
    const titleLength = title?.length ?? 0;
    const descriptionLength = description?.length ?? 0;

    return {
      url,
      finalUrl,
      title,
      titleLength,
      titleStatus: titleStatus(title, titleLength),
      description,
      descriptionLength,
      descriptionStatus: descStatus(description, descriptionLength),
      scanStatus: deriveScanStatus(title, description),
      methodUsed: "fetch",
      titleFound: !!title,
      descriptionFound: !!description,
      attempts: 1,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "fetch error";
    return {
      url,
      title: null,
      titleLength: 0,
      titleStatus: "Fail",
      description: null,
      descriptionLength: 0,
      descriptionStatus: "Fail",
      scanStatus: "scan_error",
      methodUsed: "fetch",
      error,
      titleFound: false,
      descriptionFound: false,
      attempts: 1,
    };
  }
}

async function runConcurrent(
  urls: string[],
  cfg: { fetchTimeoutMs: number; noCache: boolean; delayBetweenTasksMs: number },
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
      results[i] = await scanOne(urls[i], cfg.fetchTimeoutMs, cfg.noCache, signal);
      if (cfg.delayBetweenTasksMs > 0 && !signal?.aborted) {
        await new Promise((r) => setTimeout(r, cfg.delayBetweenTasksMs));
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.filter(Boolean);
}

export async function runImprovedProcess(options: ScanRunOptions): Promise<ScanRunResult> {
  const {
    urls,
    limit,
    signal,
    performanceMode = DEFAULT_PERFORMANCE_MODE,
    noCache = false,
  } = options;
  const toScan = limit !== undefined ? urls.slice(0, limit) : urls;
  const perfConfig = PERFORMANCE_CONFIGS[performanceMode];

  const startedAt = Date.now();
  const results = await runConcurrent(
    toScan,
    {
      fetchTimeoutMs: perfConfig.fetchTimeoutMs,
      noCache,
      delayBetweenTasksMs: perfConfig.delayBetweenTasksMs,
    },
    perfConfig.concurrency,
    signal
  );
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
