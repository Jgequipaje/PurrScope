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

export type Mode = "manual" | "sitemap";
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
