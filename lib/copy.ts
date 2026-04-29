// Utility for building the plain-text "Copy Results" output.

import type { ScanResult } from "./types";

/**
 * Converts an array of scan results into a human-readable plain-text summary.
 * Format:
 *   ✅ /path — All good
 *   ❌ /path — Title too short (40 chars)
 *   ❌ /path — Error: <message>
 */
export function buildCopyText(results: ScanResult[]): string {
  return results
    .map((r) => {
      const path = (() => {
        try {
          return new URL(r.url).pathname || "/";
        } catch {
          return r.url;
        }
      })();

      if (r.error) return `❌ ${path} — Error: ${r.error}`;

      const issues: string[] = [];

      if (!r.title) {
        issues.push("Title missing");
      } else if (r.titleStatus === "Fail") {
        issues.push(
          `Title ${r.titleLength < 45 ? "too short" : "too long"} (${r.titleLength} chars)`
        );
      }

      if (!r.description) {
        issues.push("Description missing");
      } else if (r.descriptionStatus === "Fail") {
        issues.push(
          `Description ${r.descriptionLength < 145 ? "too short" : "too long"} (${r.descriptionLength} chars)`
        );
      }

      return issues.length === 0
        ? `✅ ${path} — All good`
        : issues.map((i) => `❌ ${path} — ${i}`).join("\n");
    })
    .join("\n");
}
