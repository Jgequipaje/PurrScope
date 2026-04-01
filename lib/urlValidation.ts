// URL validation helpers shared across the app.
//
// Uses the URL constructor as the source of truth — same engine browsers use.
// Only http:// and https:// are accepted; other schemes (ftp, data, etc.) are rejected.

/**
 * Returns true if the string is a well-formed http/https URL.
 * Handles: empty input, whitespace-only, missing protocol, malformed hosts.
 */
export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns a normalised form of a valid URL (lowercase scheme+host, no trailing slash).
 * Returns the original trimmed string if parsing fails.
 */
export function normalizeUrlString(value: string): string {
  const trimmed = value.trim();
  try {
    const u = new URL(trimmed);
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return trimmed;
  }
}

/**
 * Returns a short human-readable hint explaining why a URL is invalid.
 * Returns null when the URL is valid (no hint needed).
 */
export function urlValidationHint(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // empty — no hint, just keep button disabled silently
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "Only http:// and https:// URLs are supported.";
    }
    return null;
  } catch {
    // Likely missing protocol
    if (!trimmed.startsWith("http")) {
      return "Add a protocol — e.g. https://example.com";
    }
    return "That doesn't look like a valid URL.";
  }
}

/**
 * Derives the site origin (scheme + host only) from any valid URL.
 * Strips path, query string, and hash — returns just the root with trailing slash.
 *
 * Used by sitemap crawl so a pasted page URL is automatically reduced to the
 * site root before sitemap discovery begins.
 *
 * Examples:
 *   https://example.com/properties        → https://example.com/
 *   https://example.com/about?ref=1#team  → https://example.com/
 *   http://example.com/test/page          → http://example.com/
 *
 * Returns null if the value is not a valid http/https URL.
 */
export function getBaseUrlForSitemapCrawl(value: string): string | null {
  const trimmed = value.trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}/`;
  } catch {
    return null;
  }
}
