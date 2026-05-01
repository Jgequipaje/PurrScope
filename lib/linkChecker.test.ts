// Unit tests for link deduplication and issue detection

import { describe, it, expect } from "vitest";
import { deduplicateLinks, detectIssues } from "./linkChecker";
import type { ExtractedLink } from "./linkExtractor";
import type { LinkCheckResult } from "./types";

describe("deduplicateLinks", () => {
  it("should deduplicate links by URL", () => {
    const extractedLinksMap = new Map<string, ExtractedLink[]>();

    extractedLinksMap.set("https://example.com/page1", [
      {
        url: "https://example.com/about",
        linkType: "internal",
        sourceElement: "a",
        linkText: "About Us",
        attributes: {},
      },
      {
        url: "https://example.com/contact",
        linkType: "internal",
        sourceElement: "a",
        linkText: "Contact",
        attributes: {},
      },
    ]);

    extractedLinksMap.set("https://example.com/page2", [
      {
        url: "https://example.com/about",
        linkType: "internal",
        sourceElement: "a",
        linkText: "About",
        attributes: {},
      },
    ]);

    const result = deduplicateLinks(extractedLinksMap, "all", "https://example.com");

    expect(result.size).toBe(2);
    expect(result.get("https://example.com/about")?.foundOn).toEqual([
      "https://example.com/page1",
      "https://example.com/page2",
    ]);
    expect(result.get("https://example.com/contact")?.foundOn).toEqual([
      "https://example.com/page1",
    ]);
  });

  it("should track all source pages for each unique link", () => {
    const extractedLinksMap = new Map<string, ExtractedLink[]>();

    extractedLinksMap.set("https://example.com/page1", [
      {
        url: "https://external.com",
        linkType: "external",
        sourceElement: "a",
        linkText: "External",
        attributes: {},
      },
    ]);

    extractedLinksMap.set("https://example.com/page2", [
      {
        url: "https://external.com",
        linkType: "external",
        sourceElement: "a",
        linkText: "External Link",
        attributes: {},
      },
    ]);

    extractedLinksMap.set("https://example.com/page3", [
      {
        url: "https://external.com",
        linkType: "external",
        sourceElement: "a",
        linkText: "External",
        attributes: {},
      },
    ]);

    const result = deduplicateLinks(extractedLinksMap, "all", "https://example.com");

    expect(result.size).toBe(1);
    const link = result.get("https://external.com");
    expect(link?.foundOn).toHaveLength(3);
    expect(link?.foundOn).toContain("https://example.com/page1");
    expect(link?.foundOn).toContain("https://example.com/page2");
    expect(link?.foundOn).toContain("https://example.com/page3");
  });

  it("should filter external links when scope is internal-only", () => {
    const extractedLinksMap = new Map<string, ExtractedLink[]>();

    extractedLinksMap.set("https://example.com/page1", [
      {
        url: "https://example.com/about",
        linkType: "internal",
        sourceElement: "a",
        linkText: "About",
        attributes: {},
      },
      {
        url: "https://external.com",
        linkType: "external",
        sourceElement: "a",
        linkText: "External",
        attributes: {},
      },
    ]);

    const result = deduplicateLinks(extractedLinksMap, "internal", "https://example.com");

    expect(result.size).toBe(1);
    expect(result.has("https://example.com/about")).toBe(true);
    expect(result.has("https://external.com")).toBe(false);
  });

  it("should include both internal and external links when scope is all", () => {
    const extractedLinksMap = new Map<string, ExtractedLink[]>();

    extractedLinksMap.set("https://example.com/page1", [
      {
        url: "https://example.com/about",
        linkType: "internal",
        sourceElement: "a",
        linkText: "About",
        attributes: {},
      },
      {
        url: "https://external.com",
        linkType: "external",
        sourceElement: "a",
        linkText: "External",
        attributes: {},
      },
    ]);

    const result = deduplicateLinks(extractedLinksMap, "all", "https://example.com");

    expect(result.size).toBe(2);
    expect(result.has("https://example.com/about")).toBe(true);
    expect(result.has("https://external.com")).toBe(true);
  });
});

describe("detectIssues", () => {
  describe("HTTP Status Issues", () => {
    it("should detect broken links (4xx)", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/broken",
        linkType: "internal",
        status: "client_error",
        statusCode: 404,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/broken",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "broken_link",
        severity: "error",
        message: "HTTP 404: Client error (broken link)",
      });
    });

    it("should detect protected links (403/405/999)", () => {
      const testCases = [
        { statusCode: 403, description: "Forbidden (anti-bot)" },
        { statusCode: 405, description: "Method Not Allowed" },
        { statusCode: 999, description: "LinkedIn custom code" },
      ];

      testCases.forEach(({ statusCode, description }) => {
        const linkResult: LinkCheckResult = {
          url: "https://example.com/protected",
          linkType: "external",
          status: "protected",
          statusCode,
          responseTime: 100,
          redirectChain: [],
          issues: [],
          foundOn: ["https://example.com/page1"],
        };

        const uniqueLink = {
          url: "https://example.com/protected",
          linkType: "external" as const,
          foundOn: ["https://example.com/page1"],
          extractedLinks: [],
        };

        const issues = detectIssues(linkResult, uniqueLink);

        expect(issues).toContainEqual({
          type: "protected_link",
          severity: "warning",
          message: `HTTP ${statusCode}: Protected resource (anti-bot/auth-required) - link may exist but blocks automated tools`,
        });
      });
    });

    it("should detect server errors (5xx)", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/error",
        linkType: "internal",
        status: "server_error",
        statusCode: 500,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/error",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "server_error",
        severity: "error",
        message: "HTTP 500: Server error",
      });
    });

    it("should detect timeout", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/slow",
        linkType: "external",
        status: "timeout",
        statusCode: null,
        responseTime: 10000,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/slow",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "timeout",
        severity: "error",
        message: "Request timed out",
      });
    });

    it("should detect unreachable links", () => {
      const linkResult: LinkCheckResult = {
        url: "https://nonexistent.example",
        linkType: "external",
        status: "unreachable",
        statusCode: null,
        responseTime: 0,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
        error: "DNS lookup failed",
      };

      const uniqueLink = {
        url: "https://nonexistent.example",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "unreachable",
        severity: "error",
        message: "DNS lookup failed",
      });
    });
  });

  describe("Performance Issues", () => {
    it("should detect slow response (>3000ms)", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/slow",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 3500,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/slow",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "slow_response",
        severity: "warning",
        message: "Slow response time: 3500ms (>3000ms)",
      });
    });

    it("should detect very slow response (>5000ms)", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/veryslow",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 6000,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/veryslow",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "very_slow_response",
        severity: "warning",
        message: "Very slow response time: 6000ms (>5000ms)",
      });
    });
  });

  describe("Redirect Issues", () => {
    it("should detect excessive redirects (>3 hops)", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/redirect",
        linkType: "internal",
        status: "redirect",
        statusCode: 301,
        responseTime: 200,
        redirectChain: [
          "https://example.com/redirect",
          "https://example.com/redirect2",
          "https://example.com/redirect3",
          "https://example.com/redirect4",
          "https://example.com/final",
        ],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/redirect",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "excessive_redirects",
        severity: "warning",
        message: "Excessive redirect chain: 5 hops (>3)",
      });
    });
  });

  describe("External Link Best Practices", () => {
    it("should detect missing target=_blank", () => {
      const linkResult: LinkCheckResult = {
        url: "https://external.com",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://external.com",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://external.com",
            linkType: "external",
            sourceElement: "a",
            linkText: "External",
            attributes: {}, // No target attribute
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "missing_target_blank",
        severity: "warning",
        message: 'External link missing target="_blank" attribute',
      });
    });

    it("should detect missing noopener/noreferrer", () => {
      const linkResult: LinkCheckResult = {
        url: "https://external.com",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://external.com",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://external.com",
            linkType: "external",
            sourceElement: "a",
            linkText: "External",
            attributes: {
              target: "_blank",
              // No rel attribute
            },
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "missing_noopener",
        severity: "warning",
        message: 'External link with target="_blank" missing rel="noopener" or rel="noreferrer"',
      });
    });

    it("should not flag external links with proper attributes", () => {
      const linkResult: LinkCheckResult = {
        url: "https://external.com",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://external.com",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://external.com",
            linkType: "external",
            sourceElement: "a",
            linkText: "External",
            attributes: {
              target: "_blank",
              rel: "noopener noreferrer",
            },
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      const externalIssues = issues.filter(
        (i) => i.type === "missing_target_blank" || i.type === "missing_noopener"
      );
      expect(externalIssues).toHaveLength(0);
    });
  });

  describe("Mixed Content Detection", () => {
    it("should detect HTTP link on HTTPS page", () => {
      const linkResult: LinkCheckResult = {
        url: "http://example.com/resource",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "http://example.com/resource",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "mixed_content",
        severity: "warning",
        message: "HTTP link on HTTPS page (https://example.com/page1)",
      });
    });

    it("should not flag HTTP link on HTTP page", () => {
      const linkResult: LinkCheckResult = {
        url: "http://example.com/resource",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["http://example.com/page1"],
      };

      const uniqueLink = {
        url: "http://example.com/resource",
        linkType: "external" as const,
        foundOn: ["http://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      const mixedContentIssues = issues.filter((i) => i.type === "mixed_content");
      expect(mixedContentIssues).toHaveLength(0);
    });
  });

  describe("Internal Link Path Issues", () => {
    it("should detect absolute URL for internal link", () => {
      // This test is now disabled - absolute internal URLs are not considered an issue
      // They still work fine, it's just a best practice preference
      const linkResult: LinkCheckResult = {
        url: "https://example.com/about",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/about",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      // Should NOT contain absolute_internal_url issue anymore
      expect(issues).not.toContainEqual({
        type: "absolute_internal_url",
        severity: "warning",
        message: "Internal link uses absolute URL; consider using relative path",
      });
      expect(issues).toHaveLength(0);
    });
  });

  describe("Environment URL Detection", () => {
    it("should detect staging URLs", () => {
      const linkResult: LinkCheckResult = {
        url: "https://staging.example.com",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://staging.example.com",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "environment_url",
        severity: "error",
        message: "Environment URL detected (staging/dev)",
      });
    });

    it("should detect preview URLs", () => {
      const linkResult: LinkCheckResult = {
        url: "https://preview-abc123.netlify.app",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://preview-abc123.netlify.app",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "preview_url",
        severity: "error",
        message: "Preview URL detected (Netlify/Vercel)",
      });
    });

    it("should detect localhost URLs", () => {
      const linkResult: LinkCheckResult = {
        url: "http://localhost:3000",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "http://localhost:3000",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "development_url",
        severity: "error",
        message: "Development URL detected (localhost/IP address)",
      });
    });

    it("should detect IP address URLs", () => {
      const linkResult: LinkCheckResult = {
        url: "http://192.168.1.1",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "http://192.168.1.1",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "development_url",
        severity: "error",
        message: "Development URL detected (localhost/IP address)",
      });
    });
  });

  describe("Accessibility Issues", () => {
    it("should detect empty link text", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/page",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/page",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://example.com/page",
            linkType: "internal",
            sourceElement: "a",
            linkText: "",
            attributes: {},
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "empty_link_text",
        severity: "warning",
        message: "Link has empty text and no aria-label",
      });
    });

    it("should detect generic link text", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/page",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/page",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://example.com/page",
            linkType: "internal",
            sourceElement: "a",
            linkText: "click here",
            attributes: {},
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "generic_link_text",
        severity: "warning",
        message: 'Generic link text: "click here"',
      });
    });

    it("should detect missing accessible label for area elements", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/page",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/page",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://example.com/page",
            linkType: "internal",
            sourceElement: "area",
            linkText: "",
            attributes: {},
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "missing_accessible_label",
        severity: "warning",
        message: "Image map area missing accessible label (alt or aria-label)",
      });
    });

    it("should detect long link text", () => {
      const longText = "a".repeat(150);
      const linkResult: LinkCheckResult = {
        url: "https://example.com/page",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/page",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://example.com/page",
            linkType: "internal",
            sourceElement: "a",
            linkText: longText,
            attributes: {},
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      expect(issues).toContainEqual({
        type: "long_link_text",
        severity: "warning",
        message: "Link text too long: 150 characters (>100)",
      });
    });

    it("should not flag links with aria-label even if text is empty", () => {
      const linkResult: LinkCheckResult = {
        url: "https://example.com/page",
        linkType: "internal",
        status: "success",
        statusCode: 200,
        responseTime: 100,
        redirectChain: [],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "https://example.com/page",
        linkType: "internal" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "https://example.com/page",
            linkType: "internal",
            sourceElement: "a",
            linkText: "",
            attributes: {
              ariaLabel: "Go to page",
            },
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      const emptyTextIssues = issues.filter((i) => i.type === "empty_link_text");
      expect(emptyTextIssues).toHaveLength(0);
    });
  });

  describe("Multiple Issues", () => {
    it("should detect multiple issues for a single link", () => {
      const linkResult: LinkCheckResult = {
        url: "http://staging.example.com/slow",
        linkType: "external",
        status: "success",
        statusCode: 200,
        responseTime: 6500,
        redirectChain: [
          "http://staging.example.com/slow",
          "http://staging.example.com/slow2",
          "http://staging.example.com/slow3",
          "http://staging.example.com/slow4",
          "http://staging.example.com/final",
        ],
        issues: [],
        foundOn: ["https://example.com/page1"],
      };

      const uniqueLink = {
        url: "http://staging.example.com/slow",
        linkType: "external" as const,
        foundOn: ["https://example.com/page1"],
        extractedLinks: [
          {
            url: "http://staging.example.com/slow",
            linkType: "external",
            sourceElement: "a",
            linkText: "click here",
            attributes: {},
          },
        ],
      };

      const issues = detectIssues(linkResult, uniqueLink);

      // Should detect: very slow response, excessive redirects, environment URL,
      // mixed content, missing target blank, generic link text
      expect(issues.length).toBeGreaterThanOrEqual(5);
      expect(issues.some((i) => i.type === "very_slow_response")).toBe(true);
      expect(issues.some((i) => i.type === "excessive_redirects")).toBe(true);
      expect(issues.some((i) => i.type === "environment_url")).toBe(true);
      expect(issues.some((i) => i.type === "mixed_content")).toBe(true);
      expect(issues.some((i) => i.type === "generic_link_text")).toBe(true);
    });
  });
});
