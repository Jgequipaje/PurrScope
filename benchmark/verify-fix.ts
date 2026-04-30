#!/usr/bin/env tsx
/**
 * Quick verification test for the rate limiting fix
 *
 * Tests one problematic site with the new delay settings to verify
 * we get consistent, high success rates.
 */

import { resolveSitemapUrls } from "@/lib/sitemap";
import { runScan } from "@/scan/scanRunner";
import type { PerformanceMode } from "@/scan/types";

const TEST_SITE = {
  name: "Cooley Gibson",
  url: "https://cooleygibsonrealestate.com/",
  expectedPages: 75,
};

async function testMode(siteName: string, urls: string[], mode: PerformanceMode): Promise<void> {
  console.log(`\n🔍 Testing ${mode} mode...`);

  const startTime = Date.now();
  const result = await runScan("improved", {
    urls,
    performanceMode: mode,
    noCache: true,
  });
  const duration = (Date.now() - startTime) / 1000;

  const successCount = result.results.filter(
    (r) => r.scanStatus === "success" || r.scanStatus === "Blocked (automation)"
  ).length;
  const successRate = (successCount / result.results.length) * 100;
  const throughput = result.results.length / duration;

  console.log(`   Duration: ${duration.toFixed(2)}s`);
  console.log(`   Throughput: ${throughput.toFixed(2)} pages/sec`);
  console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`   Errors: ${result.results.length - successCount}`);

  if (successRate >= 95) {
    console.log(`   ✅ PASS - Success rate is acceptable`);
  } else {
    console.log(`   ⚠️  WARN - Success rate below 95%`);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Rate Limiting Fix Verification                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log(`\nTesting: ${TEST_SITE.name}`);
  console.log(`Expected pages: ${TEST_SITE.expectedPages}`);

  // Get URLs
  console.log("\n📡 Crawling sitemap...");
  const crawlResult = await resolveSitemapUrls(TEST_SITE.url);
  console.log(`   ✓ Found ${crawlResult.pageCount} pages`);

  // Test all three modes
  await testMode(TEST_SITE.name, crawlResult.pageUrls, "safe");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testMode(TEST_SITE.name, crawlResult.pageUrls, "balanced");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testMode(TEST_SITE.name, crawlResult.pageUrls, "fast");

  console.log("\n" + "═".repeat(60));
  console.log("✅ Verification Complete!");
  console.log("═".repeat(60));
  console.log("\nIf all modes show 95%+ success rate, the fix is working.");
  console.log("You can now re-run the full benchmark suite with confidence.");
}

main().catch((error) => {
  console.error("\n❌ Verification failed:", error);
  process.exit(1);
});
