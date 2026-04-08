// Sitemap discovery and parsing logic.
//
// Handles:
//   - Multiple candidate sitemap paths (/sitemap.xml, /sitemap_index.xml)
//   - sitemapindex documents (lists of child sitemaps) — recursed fully
//   - urlset documents (lists of page URLs) — collected directly
//   - XML namespaces (e.g. <ns:loc>, xmlns= on root elements)
//   - Loop detection via a visited Set
//   - Per-sitemap error isolation (one failure doesn't stop the crawl)
//
// Note: Next.js fetch() automatically decompresses gzip responses, so no
// manual decompression is needed here.
//
// Runs server-side only (Next.js API route).

import { MAX_SITEMAP_URLS } from "./scanner";
import type { PageEntry, SitemapCrawlResult } from "./types";

// Candidate paths tried in order when the user provides a base URL
const SITEMAP_CANDIDATES = ["/sitemap.xml", "/sitemap_index.xml"];

// ─── Fetching ────────────────────────────────────────────────────────────────

/**
 * Fetches a sitemap URL and returns its raw XML text.
 * Next.js fetch handles gzip decompression automatically.
 * Returns null on any network or HTTP error.
 */
export async function fetchSitemap(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SEOChecker/1.0" },
      // Disable Next.js fetch caching so we always get fresh sitemap data
      cache: "no-store",
    });

    if (!res.ok) {
      console.log(`[sitemap] MISS ${url} (HTTP ${res.status})`);
      return null;
    }

    console.log(`[sitemap] FETCH ${url}`);
    return await res.text();
  } catch (err) {
    console.log(`[sitemap] ERROR ${url} — ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ─── XML type detection ───────────────────────────────────────────────────────

/**
 * Returns true if the XML is a sitemapindex (lists child sitemaps, not pages).
 * Matches plain and namespace-prefixed root elements, e.g. <ns:sitemapindex>.
 */
export function isSitemapIndex(xml: string): boolean {
  return /<[a-zA-Z0-9_]*:?sitemapindex[\s>]/.test(xml);
}

/**
 * Returns true if the XML is a urlset (lists page URLs).
 * Matches plain and namespace-prefixed root elements, e.g. <ns:urlset>.
 */
export function isUrlSet(xml: string): boolean {
  return /<[a-zA-Z0-9_]*:?urlset[\s>]/.test(xml);
}

// ─── URL extraction ───────────────────────────────────────────────────────────

/**
 * Extracts child sitemap URLs from a sitemapindex document.
 * Only matches <loc> tags that are inside <sitemap> blocks,
 * so page URLs in a urlset are never accidentally treated as sitemap files.
 */
export function extractSitemapLocs(xml: string): string[] {
  // Match each <sitemap>...</sitemap> block (namespace-prefix tolerant)
  const blocks = xml.match(/<[a-zA-Z0-9_]*:?sitemap[\s>][\s\S]*?<\/[a-zA-Z0-9_]*:?sitemap>/g) ?? [];
  const urls: string[] = [];

  for (const block of blocks) {
    const loc = block.match(/<[a-zA-Z0-9_]*:?loc>([\s\S]*?)<\/[a-zA-Z0-9_]*:?loc>/);
    if (loc) urls.push(normalizeUrl(loc[1]));
  }

  console.log(`[sitemap] Found ${urls.length} nested sitemap URLs`);
  return urls;
}

/**
 * Extracts page URLs from a urlset document.
 * Only matches <loc> tags that are inside <url> blocks.
 */
export function extractUrlLocs(xml: string): string[] {
  // Match each <url>...</url> block (namespace-prefix tolerant)
  const blocks = xml.match(/<[a-zA-Z0-9_]*:?url[\s>][\s\S]*?<\/[a-zA-Z0-9_]*:?url>/g) ?? [];
  const urls: string[] = [];

  for (const block of blocks) {
    const loc = block.match(/<[a-zA-Z0-9_]*:?loc>([\s\S]*?)<\/[a-zA-Z0-9_]*:?loc>/);
    if (loc) urls.push(normalizeUrl(loc[1]));
  }

  console.log(`[sitemap] Found ${urls.length} page URLs`);
  return urls;
}

// ─── URL normalisation ────────────────────────────────────────────────────────

/**
 * Normalises a URL string for consistent deduplication:
 * - Trims whitespace and decodes &amp;
 * - Lowercases scheme and host
 * - Preserves path, query, and hash as-is
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/&amp;/g, "&");
  try {
    const u = new URL(trimmed);
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return trimmed;
  }
}

// ─── Recursive crawler ───────────────────────────────────────────────────────

/**
 * Recursively crawls a sitemap URL and collects all page URLs into `state`.
 *
 * Algorithm:
 *   1. Skip if already visited (loop guard).
 *   2. Fetch the XML — skip silently on failure.
 *   3. sitemapindex → extract child sitemap URLs → recurse into each.
 *   4. urlset       → extract page URLs → add to state.pageUrls.
 *   5. Unknown format → log and skip.
 *
 * `state` is shared across all recursive calls so the dedup set and
 * page cap are enforced globally across the entire crawl tree.
 */
async function crawlSitemap(
  sitemapUrl: string,
  state: {
    pageUrls: string[];
    pageEntries: PageEntry[];
    pageUrlSet: Set<string>;
    sitemapUrls: string[];
    visitedSitemaps: Set<string>;
  }
): Promise<void> {
  if (state.visitedSitemaps.has(sitemapUrl)) {
    console.log(`[sitemap] SKIP (already visited) ${sitemapUrl}`);
    return;
  }
  state.visitedSitemaps.add(sitemapUrl);
  state.sitemapUrls.push(sitemapUrl);

  const xml = await fetchSitemap(sitemapUrl);
  if (!xml) return;

  if (isSitemapIndex(xml)) {
    console.log(`[sitemap] TYPE sitemapindex — ${sitemapUrl}`);
    const childUrls = extractSitemapLocs(xml);
    for (const childUrl of childUrls) {
      await crawlSitemap(childUrl, state);
    }
  } else if (isUrlSet(xml)) {
    console.log(`[sitemap] TYPE urlset — ${sitemapUrl}`);
    const locs = extractUrlLocs(xml);
    for (const loc of locs) {
      if (state.pageUrls.length >= MAX_SITEMAP_URLS) break;
      if (!state.pageUrlSet.has(loc)) {
        state.pageUrlSet.add(loc);
        state.pageUrls.push(loc);
        state.pageEntries.push({ url: loc, sourceSitemap: sitemapUrl });
      }
    }
  } else {
    console.log(`[sitemap] UNKNOWN format — ${sitemapUrl}`);
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Resolves all page URLs from a base URL or direct sitemap URL.
 *
 * - If input ends in .xml/.xml.gz, uses it directly as the root sitemap.
 * - Otherwise tries SITEMAP_CANDIDATES in order, using the first that responds.
 * - Recursively crawls the full sitemap tree.
 * - Returns a SitemapCrawlResult with page URLs, sitemap URLs, and counts.
 *
 * Throws a user-friendly error if no sitemap is reachable or no pages found.
 */
export async function resolveSitemapUrls(input: string): Promise<SitemapCrawlResult> {
  const base = input.replace(/\/$/, "");
  let rootUrl = "";

  if (base.endsWith(".xml") || base.endsWith(".xml.gz")) {
    rootUrl = base;
    console.log(`[sitemap] Using provided sitemap URL: ${rootUrl}`);
  } else {
    for (const candidate of SITEMAP_CANDIDATES) {
      const url = `${base}${candidate}`;
      console.log(`[sitemap] Trying candidate: ${url}`);
      const xml = await fetchSitemap(url);
      if (xml) {
        rootUrl = url;
        console.log(`[sitemap] Found sitemap at: ${rootUrl}`);
        break;
      }
    }

    if (!rootUrl) {
      throw new Error(
        `No sitemap found at ${base}. Tried: ${SITEMAP_CANDIDATES.map((c) => base + c).join(", ")}`
      );
    }
  }

  const state = {
    pageUrls: [] as string[],
    pageEntries: [] as PageEntry[],
    pageUrlSet: new Set<string>(),
    sitemapUrls: [] as string[],
    visitedSitemaps: new Set<string>(),
  };

  await crawlSitemap(rootUrl, state);

  console.log(`[sitemap] Crawl complete — ${state.sitemapUrls.length} sitemaps, ${state.pageUrls.length} pages`);

  if (state.pageUrls.length === 0) {
    throw new Error("Sitemap was found but contained no page URLs.");
  }

  return {
    pageUrls: state.pageUrls,
    pageEntries: state.pageEntries,
    sitemapUrls: state.sitemapUrls,
    pageCount: state.pageUrls.length,
    sitemapCount: state.sitemapUrls.length,
    filter: {
      includedUrls: state.pageUrls,
      excludedUrls: [],
      collapsedMappings: {},
      groupedPathCounts: [],
      excludedPatterns: [],
      totalDiscovered: state.pageUrls.length,
      totalAfterFiltering: state.pageUrls.length,
      totalCollapsed: 0,
    },
  };
}
