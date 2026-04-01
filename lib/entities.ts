// HTML entity decoding for SEO metadata.
//
// Rules:
//   - Decode only the five well-known named entities and decimal/hex numeric refs.
//   - Leave unrecognised entities (e.g. &sbs;) unchanged so character counts
//     reflect exactly what a browser would display.

const NAMED: Record<string, string> = {
  amp:  "&",
  quot: '"',
  apos: "'",
  "#39": "'",   // numeric alias for apostrophe often written as &#39;
  lt:   "<",
  gt:   ">",
  nbsp: "\u00a0",
};

/**
 * Decodes HTML entities in a string, matching browser behaviour.
 *
 * Handles:
 *   &amp;  &quot;  &#39;  &lt;  &gt;  &nbsp;
 *   &#NNN;   (decimal numeric character references)
 *   &#xHHH;  (hex numeric character references)
 *
 * Unknown named entities (e.g. &sbs;) are left as-is.
 */
export function decodeEntities(raw: string): string {
  return raw.replace(/&([a-zA-Z#][a-zA-Z0-9]*);/g, (match, entity: string) => {
    // Named entity lookup (case-sensitive per HTML spec for named refs)
    if (Object.prototype.hasOwnProperty.call(NAMED, entity)) {
      return NAMED[entity];
    }

    // Decimal numeric reference: &#NNN;
    if (entity.startsWith("#") && /^#\d+$/.test(entity)) {
      const cp = parseInt(entity.slice(1), 10);
      if (cp > 0 && cp <= 0x10ffff) return String.fromCodePoint(cp);
    }

    // Hex numeric reference: &#xHHH;
    if (/^#x[0-9a-fA-F]+$/.test(entity)) {
      const cp = parseInt(entity.slice(2), 16);
      if (cp > 0 && cp <= 0x10ffff) return String.fromCodePoint(cp);
    }

    // Unknown entity — leave unchanged
    return match;
  });
}
