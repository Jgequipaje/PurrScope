// Pure utility for deriving dynamic sitemap groups from crawl results.
// No React, no side effects.

export type DynamicGroup = {
  label: string; // e.g. "Blog"
  sitemapUrl: string; // e.g. "https://example.com/sitemap-blog-dpages.xml"
};

/**
 * Converts a DPages sitemap URL to a human-readable label.
 *
 * Algorithm:
 * 1. Take the last path segment (filename) from the URL.
 * 2. Strip the `sitemap-` prefix (if present).
 * 3. Strip the `-dpages.xml` suffix.
 * 4. Title-case the remaining segment.
 * 5. If the result is empty, fall back to the filename minus `.xml`.
 *
 * Examples:
 *   "https://example.com/sitemap-blog-dpages.xml"          → "Blog"
 *   "https://example.com/sitemap-neighborhoods-dpages.xml" → "Neighborhoods"
 *   "https://example.com/sitemap-properties-dpages.xml"    → "Properties"
 */
export function labelFromDPagesSitemapUrl(url: string): string {
  // Step 1: extract the filename (last path segment)
  const filename = url.split("/").pop() ?? url;

  // Step 2 & 3: strip sitemap- prefix and -dpages.xml suffix
  let segment = filename;
  if (segment.startsWith("sitemap-")) {
    segment = segment.slice("sitemap-".length);
  }
  if (segment.endsWith("-dpages.xml")) {
    segment = segment.slice(0, segment.length - "-dpages.xml".length);
  } else if (segment.endsWith(".xml")) {
    // suffix wasn't -dpages.xml — strip .xml for the fallback path
    segment = segment.slice(0, segment.length - ".xml".length);
  }

  // Step 4: title-case the segment
  const titled = segment
    .split("-")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join("-");

  // Step 5: if empty, fall back to filename minus .xml
  if (titled.length === 0) {
    return filename.endsWith(".xml")
      ? filename.slice(0, filename.length - ".xml".length)
      : filename;
  }

  return titled;
}

/**
 * Derives the list of DynamicGroups from a list of sitemap URLs.
 * Filters to those whose filename ends in `-dpages.xml` and maps each
 * to a DynamicGroup with a human-readable label.
 */
export function extractDynamicGroups(sitemapUrls: string[]): DynamicGroup[] {
  return sitemapUrls
    .filter((url) => {
      const filename = url.split("/").pop() ?? "";
      return filename.endsWith("-dpages.xml");
    })
    .map((url) => ({
      label: labelFromDPagesSitemapUrl(url),
      sitemapUrl: url,
    }));
}
