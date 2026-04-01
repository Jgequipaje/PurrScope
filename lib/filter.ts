// URL filtering pipeline for scan scope selection.
//
// Three modes:
//   "all"     — include every discovered URL
//   "static"  — include only URLs from sitemap-static.xml
//   "dynamic" — include only URLs from sitemaps ending in -dpages.xml
//
// Filtering is based solely on sourceSitemap — no URL shape analysis.

import type { FilterResult, PageEntry, ScanScope } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the sitemap URL is a dynamic-pages sitemap (ends in -dpages.xml).
 */
function isDPagesSitemap(sitemapUrl: string): boolean {
  try {
    const path = new URL(sitemapUrl).pathname;
    return path.endsWith("-dpages.xml");
  } catch {
    return sitemapUrl.endsWith("-dpages.xml");
  }
}

/**
 * Returns true if the sitemap URL is the static sitemap (sitemap-static.xml).
 */
function isStaticSitemap(sitemapUrl: string): boolean {
  try {
    const path = new URL(sitemapUrl).pathname;
    return path.endsWith("sitemap-static.xml");
  } catch {
    return sitemapUrl.endsWith("sitemap-static.xml");
  }
}

/**
 * Checks whether a URL matches a glob-style exclude pattern.
 * Supports trailing wildcard only: "/blog/*" matches "/blog/anything".
 */
function matchesPattern(url: string, pattern: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return pathname === prefix || pathname.startsWith(prefix + "/");
    }
    return pathname === pattern;
  } catch {
    return false;
  }
}

// ─── Client-side live filter ──────────────────────────────────────────────────

/**
 * Computes a FilterResult purely on the client from the full pageEntries dataset.
 * Used for real-time filtering without re-crawling.
 *
 * @param entries         Full set of page entries from the crawl (never filtered at crawl time)
 * @param scope           Current scan scope selection
 * @param excludedGroups  Sitemap URLs of dynamic groups the user wants to exclude
 */
export function computeClientFilter(
  entries: PageEntry[],
  scope: ScanScope,
  excludedGroups: string[] = []
): FilterResult {
  return filterUrls(entries, scope, excludedGroups);
}

/**
 * Runs the URL filtering pipeline.
 *
 * Steps:
 *   1. Apply manual exclude patterns.
 *   2. Apply scope filter based on sourceSitemap:
 *      - "all":     include everything
 *      - "static":  include only URLs from sitemap-static.xml
 *      - "dynamic": include only URLs from *-dpages.xml sitemaps
 *
 * @param entries         Page URLs with their source sitemap
 * @param scope           Selected scan scope
 * @param excludePatterns Manual glob patterns to always exclude
 */
export function filterUrls(
  entries: PageEntry[],
  scope: ScanScope,
  excludePatterns: string[] = []
): FilterResult {
  const totalDiscovered = entries.length;
  const excluded: string[] = [];

  // ── Step 1: apply manual exclude patterns ──────────────────────────────────
  const afterPatternExclusion = entries.filter(({ url, sourceSitemap }) => {
    const blocked = excludePatterns.some((p) =>
      p.startsWith("http")
        ? sourceSitemap === p          // sitemap URL match (new)
        : matchesPattern(url, p)       // glob path match (existing)
    );
    if (blocked) excluded.push(url);
    return !blocked;
  });

  // ── Step 2: apply scope filter ─────────────────────────────────────────────
  const included: string[] = [];

  for (const { url, sourceSitemap } of afterPatternExclusion) {
    let keep = false;

    if (scope === "all") {
      keep = true;
    } else if (scope === "static") {
      keep = isStaticSitemap(sourceSitemap);
    } else if (scope === "dynamic") {
      keep = isDPagesSitemap(sourceSitemap);
    }

    if (keep) {
      included.push(url);
    } else {
      excluded.push(url);
    }
  }

  return {
    includedUrls: included,
    excludedUrls: excluded,
    collapsedMappings: {},
    groupedPathCounts: [],
    excludedPatterns: excludePatterns,
    totalDiscovered,
    totalAfterFiltering: included.length,
    totalCollapsed: 0,
  };
}
