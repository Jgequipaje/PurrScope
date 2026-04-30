#!/usr/bin/env tsx
/**
 * Check what specific errors Irwin Upstate and Cooley Gibson are getting
 */

import { resolveSitemapUrls } from "@/lib/sitemap";
import { runScan } from "@/scan/scanRunner";

async function checkSite(name: string, url: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Checking: ${name}`);
  console.log("═".repeat(60));

  // Get URLs
  const crawl = await resolveSitemapUrls(url);
  console.log(`Found ${crawl.pageCount} pages`);

  // Scan with balanced mode
  console.log("\nScanning with balanced mode...");
  const result = await runScan("improved", {
    urls: crawl.pageUrls,
    performanceMode: "balanced",
    noCache: true,
  });

  // Analyze errors
  const errorTypes: Record<string, number> = {};
  const errorExamples: Record<string, string[]> = {};

  for (const r of result.results) {
    if (r.scanStatus !== "success") {
      const key = r.error || r.scanStatus;
      errorTypes[key] = (errorTypes[key] || 0) + 1;

      if (!errorExamples[key]) {
        errorExamples[key] = [];
      }
      if (errorExamples[key].length < 3) {
        errorExamples[key].push(r.url);
      }
    }
  }

  console.log("\n📊 Error Breakdown:");
  for (const [error, count] of Object.entries(errorTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`\n  ${error}: ${count} occurrences`);
    console.log(`  Examples:`);
    for (const url of errorExamples[error]) {
      console.log(`    - ${url}`);
    }
  }

  const successCount = result.results.filter((r) => r.scanStatus === "success").length;
  console.log(
    `\n✅ Success: ${successCount}/${result.results.length} (${((successCount / result.results.length) * 100).toFixed(1)}%)`
  );
}

async function main() {
  await checkSite("Irwin Upstate", "https://irwinupstate.com/");
  await new Promise((r) => setTimeout(r, 5000)); // 5 second cooldown
  await checkSite("Cooley Gibson", "https://cooleygibsonrealestate.com/");
}

main().catch(console.error);
