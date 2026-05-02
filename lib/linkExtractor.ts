// Link extraction utility — extracts links from HTML pages using Playwright
// Extracts <a>, <area>, and <link rel="canonical"> elements with full attributes

import { chromium, type Browser, type Page } from "@playwright/test";
import type { LinkType } from "./types";

const PAGE_TIMEOUT_MS = 12000;

// Extracted link with metadata before deduplication
export type ExtractedLink = {
  url: string; // normalized absolute URL
  linkType: LinkType;
  sourceElement: "a" | "area" | "link";
  linkText: string | null; // text content of the link (for <a> and <area>)
  attributes: {
    target?: string; // e.g., "_blank"
    rel?: string; // e.g., "noopener noreferrer"
    ariaLabel?: string; // accessibility label
  };
};

/**
 * Determines if a URL should be skipped during extraction
 */
function shouldSkipUrl(href: string): boolean {
  if (!href || href.trim() === "") return true;

  const trimmed = href.trim().toLowerCase();

  // Skip anchor-only links
  if (trimmed === "#" || trimmed.startsWith("#")) return true;

  // Skip javascript: protocol
  if (trimmed.startsWith("javascript:")) return true;

  // Skip mailto: protocol
  if (trimmed.startsWith("mailto:")) return true;

  // Skip tel: protocol
  if (trimmed.startsWith("tel:")) return true;

  return false;
}

/**
 * Normalizes a URL to absolute format using the page URL as base
 */
function normalizeUrl(href: string, baseUrl: string): string {
  try {
    const url = new URL(href, baseUrl);
    return url.href;
  } catch {
    // If URL construction fails, return the original href
    return href;
  }
}

/**
 * Determines the link type based on the URL and base domain
 */
function determineLinkType(
  url: string,
  baseDomain: string,
  sourceElement: "a" | "area" | "link"
): LinkType {
  // Canonical links are always classified as "canonical"
  if (sourceElement === "link") {
    return "canonical";
  }

  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseDomain);

    // Compare hostnames (domain + subdomain)
    if (urlObj.hostname === baseObj.hostname) {
      return "internal";
    }

    return "external";
  } catch {
    // If URL parsing fails, assume external
    return "external";
  }
}

/**
 * Extracts links from a single page using Playwright
 * @param pageUrl - The URL of the page to extract links from
 * @param signal - Optional AbortSignal for cancellation
 * @returns Array of extracted links with metadata
 */
export async function extractLinksFromPage(
  pageUrl: string,
  signal?: AbortSignal
): Promise<ExtractedLink[]> {
  if (signal?.aborted) {
    return [];
  }

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (compatible; PurrScope/1.0)",
      viewport: { width: 1280, height: 720 },
    });

    page = await context.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);

    // Navigate to page
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT_MS,
    });

    // Check for cancellation
    if (signal?.aborted) {
      await browser.close();
      return [];
    }

    // Extract all links using page.evaluate to run in browser context
    const extractedLinks = await page.evaluate(
      ({ pageUrl: currentPageUrl }) => {
        const links: Array<{
          href: string;
          sourceElement: "a" | "area" | "link";
          linkText: string | null;
          target?: string;
          rel?: string;
          ariaLabel?: string;
        }> = [];

        // Extract <a> tags
        const aTags = document.querySelectorAll("a[href]");
        aTags.forEach((a) => {
          const href = a.getAttribute("href");
          if (href) {
            links.push({
              href,
              sourceElement: "a",
              linkText: a.textContent?.trim() || null,
              target: a.getAttribute("target") || undefined,
              rel: a.getAttribute("rel") || undefined,
              ariaLabel: a.getAttribute("aria-label") || undefined,
            });
          }
        });

        // Extract <area> tags (image maps)
        const areaTags = document.querySelectorAll("area[href]");
        areaTags.forEach((area) => {
          const href = area.getAttribute("href");
          if (href) {
            links.push({
              href,
              sourceElement: "area",
              linkText: area.getAttribute("alt") || null,
              target: area.getAttribute("target") || undefined,
              rel: area.getAttribute("rel") || undefined,
              ariaLabel: area.getAttribute("aria-label") || undefined,
            });
          }
        });

        // Extract <link rel="canonical"> tags
        const canonicalTags = document.querySelectorAll('link[rel="canonical"][href]');
        canonicalTags.forEach((link) => {
          const href = link.getAttribute("href");
          if (href) {
            links.push({
              href,
              sourceElement: "link",
              linkText: null,
              rel: "canonical",
            });
          }
        });

        return links;
      },
      { pageUrl }
    );

    // Close browser
    await browser.close();

    // Process extracted links: normalize, filter, and classify
    const baseDomain = pageUrl;
    const processedLinks: ExtractedLink[] = [];

    for (const link of extractedLinks) {
      // Skip unwanted URLs
      if (shouldSkipUrl(link.href)) {
        continue;
      }

      // Normalize to absolute URL
      const normalizedUrl = normalizeUrl(link.href, pageUrl);

      // Determine link type
      const linkType = determineLinkType(normalizedUrl, baseDomain, link.sourceElement);

      processedLinks.push({
        url: normalizedUrl,
        linkType,
        sourceElement: link.sourceElement,
        linkText: link.linkText,
        attributes: {
          target: link.target,
          rel: link.rel,
          ariaLabel: link.ariaLabel,
        },
      });
    }

    return processedLinks;
  } catch (err) {
    // Clean up browser on error
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore cleanup errors
      }
    }

    // Log error but return empty array to allow pipeline to continue
    console.error(`Link extraction failed for ${pageUrl}:`, err);
    return [];
  }
}

/**
 * Extracts links from multiple pages concurrently
 * @param pageUrls - Array of page URLs to extract links from
 * @param concurrency - Number of concurrent page extractions (default 3)
 * @param signal - Optional AbortSignal for cancellation
 * @returns Array of all extracted links from all pages
 */
export async function extractLinksFromPages(
  pageUrls: string[],
  concurrency = 3,
  signal?: AbortSignal
): Promise<Map<string, ExtractedLink[]>> {
  const results = new Map<string, ExtractedLink[]>();
  let index = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) break;

      const i = index++;
      if (i >= pageUrls.length) break;

      const pageUrl = pageUrls[i];
      const links = await extractLinksFromPage(pageUrl, signal);
      results.set(pageUrl, links);
    }
  }

  // Run workers concurrently
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results;
}
