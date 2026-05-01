// Link validation pipeline — concurrent link extraction and validation
// Follows the concurrent execution pattern from improvedProcess.ts
//
// Pipeline stages:
//   1. Extract links from pages (Playwright-based, concurrent)
//   2. Deduplicate links by URL
//   3. Validate links (HTTP HEAD requests, concurrent)
//   4. Detect issues (status, performance, SEO, accessibility)

import { extractLinksFromPages } from "@/lib/linkExtractor";
import { deduplicateLinks, detectIssues, type UniqueLink } from "@/lib/linkChecker";
import type {
  LinkValidationRequest,
  LinkValidationResponse,
  LinkCheckResult,
  LinkStatus,
} from "@/lib/types";

// Default configuration — can be overridden via request parameters
const DEFAULT_LINK_TIMEOUT_MS = 10000; // 10 seconds per link
const DEFAULT_PAGE_CONCURRENCY = 3; // concurrent page extractions
const DEFAULT_LINK_CONCURRENCY = 5; // concurrent link validations

/**
 * Creates an empty validation response (used for early returns on cancellation)
 */
function createEmptyResponse(startTime: number): LinkValidationResponse {
  return {
    links: [],
    summary: {
      total: 0,
      working: 0,
      broken: 0,
      warnings: 0,
    },
    duration: Date.now() - startTime,
  };
}

/**
 * Validates a single link via HTTP HEAD request
 * @param url - The link URL to validate
 * @param timeout - Request timeout in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @returns LinkCheckResult with validation details
 */
async function validateLink(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<Omit<LinkCheckResult, "linkType" | "foundOn" | "issues">> {
  if (signal?.aborted) {
    return {
      url,
      status: "unreachable",
      statusCode: null,
      responseTime: 0,
      redirectChain: [],
      error: "cancelled",
    };
  }

  const startTime = Date.now();
  const redirectChain: string[] = [];
  let finalUrl = url;
  let statusCode: number | null = null;
  let status: LinkStatus = "unreachable";
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Cleanup timer on external abort
    const abortHandler = () => controller.abort();
    signal?.addEventListener("abort", abortHandler, { once: true });

    // Perform HTTP HEAD request (faster than GET)
    // Use realistic browser headers to avoid bot detection
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual", // Handle redirects manually to track chain
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    clearTimeout(timer);
    signal?.removeEventListener("abort", abortHandler);

    statusCode = response.status;
    finalUrl = response.url || url;

    // Follow redirects manually to build redirect chain
    let currentUrl = url;
    let currentResponse = response;
    let redirectCount = 0;
    const maxRedirects = 10;

    while (
      currentResponse.status >= 300 &&
      currentResponse.status < 400 &&
      redirectCount < maxRedirects
    ) {
      const location = currentResponse.headers.get("location");
      if (!location) break;

      // Resolve relative redirect URLs
      const nextUrl = new URL(location, currentUrl).href;
      redirectChain.push(nextUrl);
      currentUrl = nextUrl;
      redirectCount++;

      // Fetch next URL in chain
      const nextTimer = setTimeout(() => controller.abort(), timeout);
      currentResponse = await fetch(currentUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      clearTimeout(nextTimer);

      statusCode = currentResponse.status;
      finalUrl = currentResponse.url || currentUrl;
    }

    // Classify status
    if (statusCode >= 200 && statusCode < 300) {
      status = "success";
    } else if (statusCode >= 300 && statusCode < 400) {
      status = "redirect";
    } else if (statusCode === 429) {
      status = "rate_limited"; // Too Many Requests - not a broken link
    } else if (statusCode === 403 || statusCode === 405 || statusCode === 999) {
      // 403 Forbidden - often anti-bot protection (Zillow, CHOA)
      // 405 Method Not Allowed - often blocks HEAD but allows GET (LinkedIn)
      // 999 - LinkedIn's custom "Request denied" code for automated tools
      status = "protected"; // Link may exist but blocks automated access
    } else if (statusCode >= 400 && statusCode < 500) {
      status = "client_error";
    } else if (statusCode >= 500) {
      status = "server_error";
    }

    const responseTime = Date.now() - startTime;

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain,
      finalUrl: redirectChain.length > 0 ? finalUrl : undefined,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Classify error type
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        status = "timeout";
        error = "Request timed out";
      } else if (err.message.includes("ENOTFOUND") || err.message.includes("DNS")) {
        status = "unreachable";
        error = "DNS resolution failed";
      } else if (err.message.includes("ECONNREFUSED")) {
        status = "unreachable";
        error = "Connection refused";
      } else if (err.message.includes("SSL") || err.message.includes("certificate")) {
        status = "unreachable";
        error = "SSL certificate error";
      } else {
        status = "unreachable";
        error = err.message;
      }
    } else {
      status = "unreachable";
      error = "Unknown network error";
    }

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain,
      error,
    };
  }
}

/**
 * Validates a single link with retry logic for network errors
 * @param url - The link URL to validate
 * @param timeout - Request timeout in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @returns LinkCheckResult with validation details
 */
async function validateLinkWithRetry(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<Omit<LinkCheckResult, "linkType" | "foundOn" | "issues">> {
  const result = await validateLink(url, timeout, signal);

  // Retry with GET if HEAD returned 405 (Method Not Allowed), 403 (Forbidden), or 402 (Payment Required - often used for bot blocking)
  // Some servers block HEAD requests but allow GET
  if (
    (result.statusCode === 405 || result.statusCode === 403 || result.statusCode === 402) &&
    !signal?.aborted
  ) {
    const getResult = await validateLinkWithGet(url, timeout, signal);
    // Only use GET result if it's better than HEAD result
    if (
      getResult.status === "success" ||
      (getResult.statusCode && getResult.statusCode < (result.statusCode || 999))
    ) {
      return getResult;
    }

    // If GET also failed with 402/403, try Playwright as final fallback
    // These status codes often indicate bot detection, and Playwright can bypass it
    if ((getResult.statusCode === 402 || getResult.statusCode === 403) && !signal?.aborted) {
      const playwrightResult = await validateLinkWithPlaywright(url, timeout, signal);
      // Use Playwright result if it's better
      if (
        playwrightResult.status === "success" ||
        (playwrightResult.statusCode && playwrightResult.statusCode < (getResult.statusCode || 999))
      ) {
        return playwrightResult;
      }
    }
  }

  // Retry once on network errors (not 4xx/5xx)
  if (result.status === "unreachable" && !signal?.aborted && result.error !== "cancelled") {
    // Wait 1 second before retry
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!signal?.aborted) {
      const retryResult = await validateLink(url, timeout, signal);
      return retryResult;
    }
  }

  return result;
}

/**
 * Validates a link using GET request (fallback for servers that block HEAD)
 * @param url - The link URL to validate
 * @param timeout - Request timeout in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @returns Validation result
 */
async function validateLinkWithGet(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<Omit<LinkCheckResult, "linkType" | "foundOn" | "issues">> {
  if (signal?.aborted) {
    return {
      url,
      status: "unreachable",
      statusCode: null,
      responseTime: 0,
      redirectChain: [],
      error: "cancelled",
    };
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let status: LinkStatus = "unreachable";
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Cleanup timer on external abort
    const abortHandler = () => controller.abort();
    signal?.addEventListener("abort", abortHandler, { once: true });

    // Perform HTTP GET request with realistic browser headers
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow", // Follow redirects automatically for GET
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    clearTimeout(timer);
    signal?.removeEventListener("abort", abortHandler);

    statusCode = response.status;

    // Classify status
    if (statusCode >= 200 && statusCode < 300) {
      status = "success";
    } else if (statusCode >= 300 && statusCode < 400) {
      status = "redirect";
    } else if (statusCode === 429) {
      status = "rate_limited"; // Too Many Requests - not a broken link
    } else if (statusCode === 403 || statusCode === 405 || statusCode === 999) {
      // 403 Forbidden - often anti-bot protection (Zillow, CHOA)
      // 405 Method Not Allowed - often blocks HEAD but allows GET (LinkedIn)
      // 999 - LinkedIn's custom "Request denied" code for automated tools
      status = "protected"; // Link may exist but blocks automated access
    } else if (statusCode >= 400 && statusCode < 500) {
      status = "client_error";
    } else if (statusCode >= 500) {
      status = "server_error";
    }

    const responseTime = Date.now() - startTime;

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain: [], // GET with redirect:follow doesn't expose chain
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Classify error type
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        status = "timeout";
        error = "Request timed out";
      } else {
        status = "unreachable";
        error = err.message;
      }
    } else {
      status = "unreachable";
      error = "Unknown network error";
    }

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain: [],
      error,
    };
  }
}

/**
 * Validates a link using Playwright (final fallback for bot-protected sites)
 * @param url - The link URL to validate
 * @param timeout - Request timeout in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @returns Validation result
 */
async function validateLinkWithPlaywright(
  url: string,
  timeout: number,
  signal?: AbortSignal
): Promise<Omit<LinkCheckResult, "linkType" | "foundOn" | "issues">> {
  if (signal?.aborted) {
    return {
      url,
      status: "unreachable",
      statusCode: null,
      responseTime: 0,
      redirectChain: [],
      error: "cancelled",
    };
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let status: LinkStatus = "unreachable";
  let error: string | undefined;

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Navigate to the URL and wait for network idle
    const response = await page.goto(url, {
      timeout,
      waitUntil: "domcontentloaded", // Don't wait for all resources, just DOM
    });

    statusCode = response?.status() || null;

    // Classify status
    if (statusCode && statusCode >= 200 && statusCode < 300) {
      status = "success";
    } else if (statusCode && statusCode >= 300 && statusCode < 400) {
      status = "redirect";
    } else if (statusCode === 429) {
      status = "rate_limited"; // Too Many Requests - not a broken link
    } else if (statusCode === 403 || statusCode === 405 || statusCode === 999) {
      // 403 Forbidden - often anti-bot protection (Zillow, CHOA)
      // 405 Method Not Allowed - often blocks HEAD but allows GET (LinkedIn)
      // 999 - LinkedIn's custom "Request denied" code for automated tools
      status = "protected"; // Link may exist but blocks automated access
    } else if (statusCode && statusCode >= 400 && statusCode < 500) {
      status = "client_error";
    } else if (statusCode && statusCode >= 500) {
      status = "server_error";
    }

    const responseTime = Date.now() - startTime;

    await browser.close();

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain: [],
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Classify error type
    if (err instanceof Error) {
      if (err.message.includes("Timeout") || err.message.includes("timeout")) {
        status = "timeout";
        error = "Request timed out";
      } else {
        status = "unreachable";
        error = err.message;
      }
    } else {
      status = "unreachable";
      error = "Unknown error";
    }

    return {
      url,
      status,
      statusCode,
      responseTime,
      redirectChain: [],
      error,
    };
  }
}

/**
 * Validates multiple links concurrently
 * @param links - Map of unique links to validate
 * @param timeout - Request timeout per link in milliseconds
 * @param concurrency - Number of concurrent validations
 * @param signal - Optional AbortSignal for cancellation
 * @returns Array of LinkCheckResult with validation details
 */
async function validateLinks(
  links: Map<string, UniqueLink>,
  timeout: number,
  concurrency: number,
  signal?: AbortSignal
): Promise<LinkCheckResult[]> {
  const linkArray = Array.from(links.values());
  const results: LinkCheckResult[] = [];
  let index = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) break;

      const i = index++;
      if (i >= linkArray.length) break;

      const uniqueLink = linkArray[i];
      const validationResult = await validateLinkWithRetry(uniqueLink.url, timeout, signal);

      // Combine validation result with link metadata
      const linkResult: LinkCheckResult = {
        ...validationResult,
        linkType: uniqueLink.linkType,
        foundOn: uniqueLink.foundOn,
        issues: [], // Will be populated by detectIssues
      };

      // Detect issues
      const issues = detectIssues(linkResult, uniqueLink);
      linkResult.issues = issues;

      results.push(linkResult);
    }
  }

  // Run workers concurrently
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results;
}

/**
 * Main orchestrator function for link validation pipeline
 * @param request - Link validation request with pages to scan and configuration
 * @param signal - Optional AbortSignal for cancellation
 * @returns LinkValidationResponse with results, summary, and duration
 */
export async function runLinkValidation(
  request: LinkValidationRequest,
  signal?: AbortSignal
): Promise<LinkValidationResponse> {
  const startTime = Date.now();

  const {
    siteUrl,
    pageUrls,
    linkScope,
    concurrency = DEFAULT_LINK_CONCURRENCY,
    timeout = DEFAULT_LINK_TIMEOUT_MS,
  } = request;

  // Extract base domain for internal/external classification
  const baseDomain = siteUrl;

  // Stage 1: Extract links from pages (concurrent)
  const extractedLinksMap = await extractLinksFromPages(pageUrls, DEFAULT_PAGE_CONCURRENCY, signal);

  if (signal?.aborted) {
    return createEmptyResponse(startTime);
  }

  // Stage 2: Deduplicate links by URL and filter by scope
  const uniqueLinks = deduplicateLinks(extractedLinksMap, linkScope, baseDomain);

  if (signal?.aborted) {
    return createEmptyResponse(startTime);
  }

  // Stage 3: Validate links (concurrent)
  const results = await validateLinks(uniqueLinks, timeout, concurrency, signal);

  // Calculate summary
  const total = results.length;
  let working = 0;
  let broken = 0;
  let warnings = 0;

  for (const result of results) {
    const hasErrors = result.issues.some((issue) => issue.severity === "error");
    const hasWarnings = result.issues.some((issue) => issue.severity === "warning");

    // WORKING = Link works (HTTP 200-299 or rate limited)
    // Even if it has warnings, it's still accessible
    if (result.status === "success" || result.status === "rate_limited") {
      working++;
      // Track if this working link has warnings for UI display
      if (hasWarnings || result.status === "rate_limited") {
        warnings++;
      }
    } else if (result.status === "protected") {
      // PROTECTED = Link may exist but blocks automated tools (403/405/999)
      // Count as warning - not truly broken, but needs manual verification
      working++; // Count as working since link likely exists
      warnings++; // But flag as warning for manual review
    } else {
      // BROKEN = Actually broken (404, 500, timeout, unreachable)
      broken++;
    }
  }

  const duration = Date.now() - startTime;

  return {
    links: results,
    summary: {
      total,
      working,
      broken,
      warnings,
    },
    duration,
  };
}
