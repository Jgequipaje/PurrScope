// Scan results cache — localStorage persistence for scan results
// Prevents loss of results when switching between tabs

import type { ScanResult, LinkCheckResult, Mode, SitemapCrawlResult } from "./types";
import type { TimerState } from "./duration";

// Storage keys for different modes
const MANUAL_RESULTS_KEY = "purrscope_manual_results";
const SITEMAP_RESULTS_KEY = "purrscope_sitemap_results";
const LINKS_RESULTS_KEY = "purrscope_links_results";

// Cache expiry: 24 hours
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export type CachedScanResults = {
  results: ScanResult[];
  timer: TimerState;
  timestamp: number;
  mode: "manual" | "sitemap";
};

export type CachedLinkResults = {
  results: LinkCheckResult[];
  timer: TimerState;
  crawlResult: SitemapCrawlResult | null; // Preserve sitemap crawl data
  sitemapInput: string; // Preserve the URL that was crawled
  timestamp: number;
};

// ── Storage helpers ───────────────────────────────────────────────────────────

function getStorageKey(mode: Mode): string {
  if (mode === "manual") return MANUAL_RESULTS_KEY;
  if (mode === "sitemap") return SITEMAP_RESULTS_KEY;
  if (mode === "links") return LINKS_RESULTS_KEY;
  return MANUAL_RESULTS_KEY; // fallback
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_EXPIRY_MS;
}

// ── Save results ──────────────────────────────────────────────────────────────

export function saveScanResults(
  mode: "manual" | "sitemap",
  results: ScanResult[],
  timer: TimerState
): void {
  try {
    const cached: CachedScanResults = {
      results,
      timer,
      timestamp: Date.now(),
      mode,
    };
    const key = getStorageKey(mode);
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    // Storage quota exceeded or unavailable — fail silently
    console.warn("Failed to save scan results to localStorage:", error);
  }
}

export function saveLinkResults(
  results: LinkCheckResult[],
  timer: TimerState,
  crawlResult: SitemapCrawlResult | null,
  sitemapInput: string
): void {
  try {
    const cached: CachedLinkResults = {
      results,
      timer,
      crawlResult,
      sitemapInput,
      timestamp: Date.now(),
    };
    localStorage.setItem(LINKS_RESULTS_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn("Failed to save link results to localStorage:", error);
  }
}

// ── Load results ──────────────────────────────────────────────────────────────

export function loadScanResults(mode: "manual" | "sitemap"): CachedScanResults | null {
  try {
    const key = getStorageKey(mode);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedScanResults;

    // Validate structure
    if (!cached.results || !Array.isArray(cached.results)) return null;
    if (!cached.timestamp || typeof cached.timestamp !== "number") return null;

    // Check expiry
    if (isExpired(cached.timestamp)) {
      localStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch (error) {
    console.warn("Failed to load scan results from localStorage:", error);
    return null;
  }
}

export function loadLinkResults(): CachedLinkResults | null {
  try {
    const raw = localStorage.getItem(LINKS_RESULTS_KEY);
    if (!raw) {
      console.log("[resultsCache] No link results in localStorage");
      return null;
    }

    const cached = JSON.parse(raw) as CachedLinkResults;
    console.log("[resultsCache] Loaded link results from cache:", {
      resultsCount: cached.results?.length,
      hasCrawlResult: !!cached.crawlResult,
      sitemapInput: cached.sitemapInput,
      timestamp: cached.timestamp,
    });

    // Validate structure
    if (!cached.results || !Array.isArray(cached.results)) {
      console.warn("[resultsCache] Invalid results structure");
      return null;
    }
    if (!cached.timestamp || typeof cached.timestamp !== "number") {
      console.warn("[resultsCache] Invalid timestamp");
      return null;
    }

    // Check expiry
    if (isExpired(cached.timestamp)) {
      console.log("[resultsCache] Cache expired, removing");
      localStorage.removeItem(LINKS_RESULTS_KEY);
      return null;
    }

    console.log("[resultsCache] Successfully loaded link results");
    return cached;
  } catch (error) {
    console.warn("Failed to load link results from localStorage:", error);
    return null;
  }
}

// ── Clear results ─────────────────────────────────────────────────────────────

export function clearScanResults(mode: "manual" | "sitemap"): void {
  try {
    const key = getStorageKey(mode);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear scan results from localStorage:", error);
  }
}

export function clearLinkResults(): void {
  try {
    localStorage.removeItem(LINKS_RESULTS_KEY);
  } catch (error) {
    console.warn("Failed to clear link results from localStorage:", error);
  }
}

export function clearAllResults(): void {
  clearScanResults("manual");
  clearScanResults("sitemap");
  clearLinkResults();
}
