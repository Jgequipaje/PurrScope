// Link deduplication and issue detection utility
// Handles grouping links by URL, filtering by scope, and detecting various link issues

import type { LinkType, LinkScope, LinkStatus, LinkIssue, LinkCheckResult } from "./types";
import type { ExtractedLink } from "./linkExtractor";

// Metadata for a unique link before validation
export type UniqueLink = {
  url: string;
  linkType: LinkType;
  foundOn: string[]; // source page URLs
  extractedLinks: ExtractedLink[]; // all instances of this link
};

/**
 * Deduplicates extracted links by URL and filters by link scope
 * @param extractedLinksMap - Map of page URL to extracted links from that page
 * @param linkScope - Filter scope (internal-only or all)
 * @param baseDomain - Base domain for internal/external classification
 * @returns Map of unique link URLs to their metadata
 */
export function deduplicateLinks(
  extractedLinksMap: Map<string, ExtractedLink[]>,
  linkScope: LinkScope,
  baseDomain: string
): Map<string, UniqueLink> {
  const uniqueLinks = new Map<string, UniqueLink>();

  // Iterate through all pages and their extracted links
  for (const [pageUrl, links] of extractedLinksMap.entries()) {
    for (const link of links) {
      // Filter by link scope
      if (linkScope === "internal" && link.linkType === "external") {
        continue; // Skip external links when scope is internal-only
      }

      // Check if we've seen this URL before
      const existing = uniqueLinks.get(link.url);

      if (existing) {
        // Add this source page if not already tracked
        if (!existing.foundOn.includes(pageUrl)) {
          existing.foundOn.push(pageUrl);
        }
        // Track this instance
        existing.extractedLinks.push(link);
      } else {
        // First time seeing this URL
        uniqueLinks.set(link.url, {
          url: link.url,
          linkType: link.linkType,
          foundOn: [pageUrl],
          extractedLinks: [link],
        });
      }
    }
  }

  return uniqueLinks;
}

/**
 * Detects issues with a validated link based on HTTP response and link attributes
 * @param linkResult - The validation result from HTTP request
 * @param uniqueLink - The unique link metadata with all instances
 * @returns Array of detected issues
 */
export function detectIssues(linkResult: LinkCheckResult, uniqueLink: UniqueLink): LinkIssue[] {
  const issues: LinkIssue[] = [];

  // HTTP Status Issues (Requirements 6.1-6.7)
  if (linkResult.status === "rate_limited") {
    // HTTP 429 - Rate limited, not a broken link
    issues.push({
      type: "rate_limited",
      severity: "warning",
      message: `HTTP 429: Rate limited (too many requests) - link works but server is throttling`,
    });
  } else if (linkResult.status === "protected") {
    // HTTP 403/405/999 - Anti-bot protection or authentication required
    // Link may exist but blocks automated access
    issues.push({
      type: "protected_link",
      severity: "warning",
      message: `HTTP ${linkResult.statusCode}: Protected resource (anti-bot/auth-required) - link may exist but blocks automated tools`,
    });
  } else if (linkResult.status === "client_error") {
    issues.push({
      type: "broken_link",
      severity: "error",
      message: `HTTP ${linkResult.statusCode}: Client error (broken link)`,
    });
  } else if (linkResult.status === "server_error") {
    issues.push({
      type: "server_error",
      severity: "error",
      message: `HTTP ${linkResult.statusCode}: Server error`,
    });
  } else if (linkResult.status === "timeout") {
    issues.push({
      type: "timeout",
      severity: "error",
      message: "Request timed out",
    });
  } else if (linkResult.status === "unreachable") {
    issues.push({
      type: "unreachable",
      severity: "error",
      message: linkResult.error || "Link is unreachable (DNS or network error)",
    });
  }

  // Performance Issues (Requirements 8.3-8.4)
  // Changed to warnings - slow links still work, just performance issue
  if (linkResult.responseTime > 5000) {
    issues.push({
      type: "very_slow_response",
      severity: "warning",
      message: `Very slow response time: ${linkResult.responseTime}ms (>5000ms)`,
    });
  } else if (linkResult.responseTime > 3000) {
    issues.push({
      type: "slow_response",
      severity: "warning",
      message: `Slow response time: ${linkResult.responseTime}ms (>3000ms)`,
    });
  }

  // Redirect Issues (Requirement 7.4)
  if (linkResult.redirectChain.length > 3) {
    issues.push({
      type: "excessive_redirects",
      severity: "warning",
      message: `Excessive redirect chain: ${linkResult.redirectChain.length} hops (>3)`,
    });
  }

  // External Link Best Practices (Requirements 9.1-9.3)
  if (linkResult.linkType === "external") {
    // Check all instances of this link for attribute issues
    for (const extractedLink of uniqueLink.extractedLinks) {
      const { target, rel } = extractedLink.attributes;

      // Missing target="_blank" warning
      if (!target || target !== "_blank") {
        issues.push({
          type: "missing_target_blank",
          severity: "warning",
          message: 'External link missing target="_blank" attribute',
        });
        break; // Only report once per unique URL
      }

      // Missing noopener/noreferrer warning (only if target="_blank" exists)
      if (target === "_blank") {
        const hasNoopener = rel?.includes("noopener");
        const hasNoreferrer = rel?.includes("noreferrer");

        if (!hasNoopener && !hasNoreferrer) {
          issues.push({
            type: "missing_noopener",
            severity: "warning",
            message:
              'External link with target="_blank" missing rel="noopener" or rel="noreferrer"',
          });
          break; // Only report once per unique URL
        }
      }
    }
  }

  // Mixed Content Detection (Requirements 10.1-10.2)
  for (const sourcePage of uniqueLink.foundOn) {
    try {
      const sourceUrl = new URL(sourcePage);
      const linkUrl = new URL(linkResult.url);

      if (sourceUrl.protocol === "https:" && linkUrl.protocol === "http:") {
        issues.push({
          type: "mixed_content",
          severity: "warning",
          message: `HTTP link on HTTPS page (${sourcePage})`,
        });
        break; // Only report once per unique URL
      }
    } catch {
      // Skip if URL parsing fails
    }
  }

  // Internal Link Path Issues (Requirements 11.1-11.2)
  // Changed to info/skip - absolute internal URLs still work fine
  // This is more of a best practice than a real issue
  if (linkResult.linkType === "internal") {
    try {
      const linkUrl = new URL(linkResult.url);
      // If it has a protocol and host, it's an absolute URL
      // Commenting out - this is not a real issue for link checking
      // if (linkUrl.protocol && linkUrl.host) {
      //   issues.push({
      //     type: "absolute_internal_url",
      //     severity: "warning",
      //     message: "Internal link uses absolute URL; consider using relative path",
      //   });
      // }
    } catch {
      // Skip if URL parsing fails
    }
  }

  // Environment URL Detection (Requirements 12.1-12.3)
  const urlLower = linkResult.url.toLowerCase();

  // Staging/dev patterns
  if (
    urlLower.includes(".staging.") ||
    urlLower.includes(".dev.") ||
    urlLower.includes("staging.")
  ) {
    issues.push({
      type: "environment_url",
      severity: "error",
      message: "Environment URL detected (staging/dev)",
    });
  }

  // Preview/deployment platforms
  if (
    urlLower.includes("preview.") ||
    urlLower.includes(".netlify.app") ||
    urlLower.includes(".vercel.app")
  ) {
    issues.push({
      type: "preview_url",
      severity: "error",
      message: "Preview URL detected (Netlify/Vercel)",
    });
  }

  // Development/localhost patterns
  if (
    urlLower.includes("localhost") ||
    urlLower.includes("127.0.0.1") ||
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(urlLower) // IP address pattern
  ) {
    issues.push({
      type: "development_url",
      severity: "error",
      message: "Development URL detected (localhost/IP address)",
    });
  }

  // Accessibility Issues (Requirements 13.1-13.4)
  // Changed empty link text to warning - it still works, just bad for accessibility
  // Track which accessibility issues we've already reported
  let hasReportedEmptyText = false;
  let hasReportedGenericText = false;
  let hasReportedMissingLabel = false;
  let hasReportedLongText = false;

  for (const extractedLink of uniqueLink.extractedLinks) {
    const text = extractedLink.linkText?.trim() || "";
    const ariaLabel = extractedLink.attributes.ariaLabel;

    // Empty link text (warning - still works, just bad UX)
    if (!hasReportedEmptyText && !text && !ariaLabel) {
      issues.push({
        type: "empty_link_text",
        severity: "warning",
        message: "Link has empty text and no aria-label",
      });
      hasReportedEmptyText = true;
    }

    // Generic link text (warning)
    const genericTexts = ["click here", "read more", "here", "link", "more"];
    if (!hasReportedGenericText && text && genericTexts.includes(text.toLowerCase())) {
      issues.push({
        type: "generic_link_text",
        severity: "warning",
        message: `Generic link text: "${text}"`,
      });
      hasReportedGenericText = true;
    }

    // Missing accessible label for icon/image-only links (warning)
    if (!hasReportedMissingLabel && extractedLink.sourceElement === "area" && !text && !ariaLabel) {
      issues.push({
        type: "missing_accessible_label",
        severity: "warning",
        message: "Image map area missing accessible label (alt or aria-label)",
      });
      hasReportedMissingLabel = true;
    }

    // Long link text (warning)
    if (!hasReportedLongText && text.length > 100) {
      issues.push({
        type: "long_link_text",
        severity: "warning",
        message: `Link text too long: ${text.length} characters (>100)`,
      });
      hasReportedLongText = true;
    }
  }

  return issues;
}
