import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterUrls } from "./filter";
import type { PageEntry } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Arbitrary for a valid https URL string */
const arbHttpsUrl = fc.webUrl({ validSchemes: ["https"] });

/** Arbitrary for a PageEntry with a given sourceSitemap */
function arbEntry(sitemapArb: fc.Arbitrary<string>): fc.Arbitrary<PageEntry> {
  return fc.record({
    url: arbHttpsUrl,
    sourceSitemap: sitemapArb,
  });
}

/** Arbitrary for a dpages sitemap URL */
const arbDPagesSitemapUrl = fc
  .tuple(fc.webUrl({ validSchemes: ["https"] }), fc.stringMatching(/^[a-z]{3,10}$/))
  .map(([base, slug]) => {
    const u = new URL(base);
    u.pathname = `/sitemap-${slug}-dpages.xml`;
    return u.toString();
  });

// ─── Property 8: Filter excludes by sourceSitemap ────────────────────────────
// Feature: dynamic-sitemap-exclusion, Property 8: Filter excludes by sourceSitemap

describe("filterUrls — Property 8: Filter excludes by sourceSitemap", () => {
  it("excludes all entries whose sourceSitemap is in excludePatterns (http URLs), includes all others", () => {
    // Validates: Requirements 4.3
    fc.assert(
      fc.property(
        // A set of dpages sitemap URLs to use as exclude patterns
        fc.array(arbDPagesSitemapUrl, { minLength: 1, maxLength: 5 }),
        // A list of page entries — some from excluded sitemaps, some not
        fc.array(
          fc.oneof(
            // entry from one of the excluded sitemaps
            arbDPagesSitemapUrl.chain((sm) =>
              fc.record({ url: arbHttpsUrl, sourceSitemap: fc.constant(sm) })
            ),
            // entry from a non-excluded sitemap
            arbEntry(
              fc.webUrl({ validSchemes: ["https"] }).map((u) => {
                const parsed = new URL(u);
                parsed.pathname = "/sitemap-static.xml";
                return parsed.toString();
              })
            )
          ),
          { minLength: 0, maxLength: 20 }
        ),
        (excludePatterns, entries) => {
          const result = filterUrls(entries, "all", excludePatterns);

          for (const entry of entries) {
            if (excludePatterns.includes(entry.sourceSitemap)) {
              expect(result.excludedUrls).toContain(entry.url);
              expect(result.includedUrls).not.toContain(entry.url);
            } else {
              expect(result.includedUrls).toContain(entry.url);
              expect(result.excludedUrls).not.toContain(entry.url);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Combined filter applies patterns before scope ────────────────
// Feature: dynamic-sitemap-exclusion, Property 9: Combined filter applies patterns before scope

describe("filterUrls — Property 9: Combined filter applies patterns before scope", () => {
  it("result equals first removing excludePattern entries then applying scope filter", () => {
    // Validates: Requirements 5.3
    const arbScope = fc.constantFrom("all", "static", "dynamic") as fc.Arbitrary<
      "all" | "static" | "dynamic"
    >;

    const arbSitemapUrl = fc.oneof(
      // static sitemap
      fc.webUrl({ validSchemes: ["https"] }).map((u) => {
        const p = new URL(u);
        p.pathname = "/sitemap-static.xml";
        return p.toString();
      }),
      // dpages sitemap
      arbDPagesSitemapUrl,
      // other sitemap
      fc.webUrl({ validSchemes: ["https"] }).map((u) => {
        const p = new URL(u);
        p.pathname = "/sitemap-other.xml";
        return p.toString();
      })
    );

    fc.assert(
      fc.property(
        fc.array(arbEntry(arbSitemapUrl), { minLength: 0, maxLength: 20 }),
        arbScope,
        fc.array(arbDPagesSitemapUrl, { minLength: 0, maxLength: 3 }),
        (entries, scope, excludePatterns) => {
          // Combined result
          const combined = filterUrls(entries, scope, excludePatterns);

          // Manual two-step: first exclude, then scope
          const afterExclude = entries.filter(
            ({ sourceSitemap }) => !excludePatterns.includes(sourceSitemap)
          );
          const afterScope = afterExclude.filter(({ sourceSitemap }) => {
            if (scope === "all") return true;
            if (scope === "static") return sourceSitemap.endsWith("sitemap-static.xml");
            if (scope === "dynamic") return sourceSitemap.endsWith("-dpages.xml");
            return false;
          });

          const expectedIncluded = afterScope.map((e) => e.url).sort();
          const actualIncluded = [...combined.includedUrls].sort();

          expect(actualIncluded).toEqual(expectedIncluded);
        }
      ),
      { numRuns: 100 }
    );
  });
});
