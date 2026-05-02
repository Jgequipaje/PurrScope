// Shared types used across the app (API routes, components, helpers)

export type Status = "Pass" | "Fail";

// Overall page scan status
export type ScanStatus = "success" | "missing" | "scan_error" | "Blocked (automation)";

export type ScanResult = {
  url: string;
  title: string | null;
  titleLength: number;
  titleStatus: Status;
  description: string | null;
  descriptionLength: number;
  descriptionStatus: Status;
  scanStatus: ScanStatus;
  methodUsed: "fetch" | "playwright";
  error?: string;
  // Debug fields populated by the scanner
  finalUrl?: string; // actual URL after redirects
  titleFound?: boolean;
  descriptionFound?: boolean;
  attempts?: number; // how many extraction attempts were made
};

export type Mode = "manual" | "sitemap" | "links";
export type ResultFilter = "all" | "failed";

// The three scan scope options shown in the UI dropdown
export type ScanScope = "all" | "static" | "dynamic";

// Per-base-path grouping info used in debug output
export type PathGroup = {
  basePath: string; // e.g. "/blog"
  count: number; // how many URLs share this base path
  isDynamic: boolean; // true when count > DYNAMIC_THRESHOLD
};

// A discovered page URL with its source sitemap file
export type PageEntry = {
  url: string;
  sourceSitemap: string; // e.g. "https://example.com/sitemap-dpages.xml"
};

// Result of running the URL filter pipeline
export type FilterResult = {
  includedUrls: string[]; // final URLs to scan
  excludedUrls: string[]; // URLs removed by the filter
  collapsedMappings: Record<string, string>; // kept for backward compat, always empty
  groupedPathCounts: PathGroup[];
  excludedPatterns: string[]; // e.g. ["/blog/*", "/properties/*"]
  totalDiscovered: number;
  totalAfterFiltering: number;
  totalCollapsed: number;
};

// Full result returned by the sitemap crawler + filter pipeline
export type SitemapCrawlResult = {
  pageUrls: string[]; // flat list for backward compat
  pageEntries: PageEntry[]; // urls with their source sitemap
  sitemapUrls: string[];
  pageCount: number;
  sitemapCount: number;
  filter: FilterResult;
};

// ============================================================================
// Link Checker Types
// ============================================================================

// Type of link found on a page
export type LinkType = "internal" | "external" | "canonical";

// Scope of links to validate
export type LinkScope = "internal" | "all";

// HTTP status classification for link validation
export type LinkStatus =
  | "success" // 2xx
  | "redirect" // 3xx
  | "client_error" // 4xx (except 403, 405, 429)
  | "protected" // 403/405/999 - likely anti-bot or auth-required (link may exist)
  | "server_error" // 5xx
  | "rate_limited" // 429 - Too Many Requests
  | "timeout"
  | "unreachable";

// Severity level for link issues
export type LinkIssueSeverity = "error" | "warning";

// A detected issue with a link
export type LinkIssue = {
  type: string; // e.g., "broken_link", "slow_response", "missing_noopener"
  severity: LinkIssueSeverity;
  message: string;
};

// Result of validating a single link
export type LinkCheckResult = {
  url: string;
  linkType: LinkType;
  status: LinkStatus;
  statusCode: number | null;
  responseTime: number; // milliseconds
  redirectChain: string[]; // empty if no redirects
  issues: LinkIssue[];
  foundOn: string[]; // source page URLs where this link was found
  finalUrl?: string; // after following redirects
  error?: string;
};

// Request body for link validation API
export type LinkValidationRequest = {
  siteUrl: string;
  pageUrls: string[]; // pages to scan for links
  linkScope: LinkScope;
  concurrency?: number; // default 5
  timeout?: number; // default 10000ms
};

// Response from link validation API
export type LinkValidationResponse = {
  links: LinkCheckResult[];
  summary: {
    total: number;
    working: number; // renamed from "passed" - links that are accessible
    broken: number; // renamed from "failed" - links that don't work
    warnings: number; // working links with issues (slow, missing attributes, etc.)
  };
  duration: number; // milliseconds
};
