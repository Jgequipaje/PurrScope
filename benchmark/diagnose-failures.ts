#!/usr/bin/env tsx
/**
 * Diagnostic Script for Benchmark Failures
 *
 * Investigates why certain sites have high error rates during benchmarks.
 * Tests a sample of URLs from each problematic site to identify patterns.
 */

import { resolveSitemapUrls } from "@/lib/sitemap";
import { runScan } from "@/scan/scanRunner";

// Sites with high error rates from benchmark
const PROBLEMATIC_SITES = [
  { name: "Cooley Gibson", url: "https://cooleygibsonrealestate.com/", errorRate: 94.7 },
  { name: "Selling Central PA", url: "https://sellingcentralpahomes.com/", errorRate: 92.5 },
  { name: "Irwin Upstate", url: "https://irwinupstate.com/", errorRate: 48 },
];

interface DiagnosticResult {
  site: string;
  totalPages: number;
  sampleSize: number;
  results: {
    success: number;
    missing: number;
    scan_error: number;
    blocked: number;
  };
  errorDetails: Array<{
    url: string;
    status: string;
    error?: string;
    titleFound: boolean;
    descriptionFound: boolean;
  }>;
}

async function diagnoseSite(siteName: string, siteUrl: string): Promise<DiagnosticResult> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Diagnosing: ${siteName}`);
  console.log("═".repeat(60));

  // Step 1: Get all URLs from sitemap
  console.log("\n📡 Crawling sitemap...");
  const crawlResult = await resolveSitemapUrls(siteUrl);
  console.log(`   ✓ Found ${crawlResult.pageCount} pages`);

  // Step 2: Test a sample of URLs (first 10 for speed)
  const sampleSize = Math.min(10, crawlResult.pageUrls.length);
  const sampleUrls = crawlResult.pageUrls.slice(0, sampleSize);

  console.log(`\n🔍 Testing ${sampleSize} sample URLs...`);

  const scanResult = await runScan("improved", {
    urls: sampleUrls,
    performanceMode: "balanced",
    noCache: true,
  });

  // Step 3: Categorize results
  const results = {
    success: 0,
    missing: 0,
    scan_error: 0,
    blocked: 0,
  };

  const errorDetails: Array<{
    url: string;
    status: string;
    error?: string;
    titleFound: boolean;
    descriptionFound: boolean;
  }> = [];

  for (const result of scanResult.results) {
    if (result.scanStatus === "success") {
      results.success++;
    } else if (result.scanStatus === "missing") {
      results.missing++;
      errorDetails.push({
        url: result.url,
        status: result.scanStatus,
        error: result.error,
        titleFound: result.titleFound ?? false,
        descriptionFound: result.descriptionFound ?? false,
      });
    } else if (result.scanStatus === "scan_error") {
      results.scan_error++;
      errorDetails.push({
        url: result.url,
        status: result.scanStatus,
        error: result.error,
        titleFound: result.titleFound ?? false,
        descriptionFound: result.descriptionFound ?? false,
      });
    } else if (result.scanStatus === "Blocked (automation)") {
      results.blocked++;
      errorDetails.push({
        url: result.url,
        status: result.scanStatus,
        error: result.error,
        titleFound: result.titleFound ?? false,
        descriptionFound: result.descriptionFound ?? false,
      });
    }
  }

  // Step 4: Print summary
  console.log("\n📊 Results:");
  console.log(
    `   ✅ Success: ${results.success}/${sampleSize} (${((results.success / sampleSize) * 100).toFixed(1)}%)`
  );
  console.log(`   ❌ Scan Error: ${results.scan_error}/${sampleSize}`);
  console.log(`   ⚠️  Missing Data: ${results.missing}/${sampleSize}`);
  console.log(`   🚫 Blocked: ${results.blocked}/${sampleSize}`);

  if (errorDetails.length > 0) {
    console.log("\n🔍 Error Details:");
    for (const detail of errorDetails.slice(0, 5)) {
      console.log(`\n   URL: ${detail.url}`);
      console.log(`   Status: ${detail.status}`);
      if (detail.error) console.log(`   Error: ${detail.error}`);
      console.log(`   Title Found: ${detail.titleFound}`);
      console.log(`   Description Found: ${detail.descriptionFound}`);
    }
    if (errorDetails.length > 5) {
      console.log(`\n   ... and ${errorDetails.length - 5} more errors`);
    }
  }

  return {
    site: siteName,
    totalPages: crawlResult.pageCount,
    sampleSize,
    results,
    errorDetails,
  };
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Benchmark Failure Diagnostic Tool                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const diagnostics: DiagnosticResult[] = [];

  for (const site of PROBLEMATIC_SITES) {
    try {
      const result = await diagnoseSite(site.name, site.url);
      diagnostics.push(result);

      // Wait between sites to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`\n❌ Failed to diagnose ${site.name}:`, error);
    }
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("Summary");
  console.log("═".repeat(60));

  for (const diag of diagnostics) {
    const successRate = (diag.results.success / diag.sampleSize) * 100;
    console.log(`\n${diag.site}:`);
    console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`  Primary Issue: ${getPrimaryIssue(diag.results)}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log("Recommendations");
  console.log("═".repeat(60));

  const hasBlockedIssues = diagnostics.some((d) => d.results.blocked > 0);
  const hasMissingIssues = diagnostics.some((d) => d.results.missing > 0);
  const hasScanErrors = diagnostics.some((d) => d.results.scan_error > 0);

  if (hasBlockedIssues) {
    console.log("\n🚫 Bot Detection Issues:");
    console.log("   - Sites are detecting automation and blocking requests");
    console.log("   - Consider: Better user-agent, request delays, or Playwright fallback");
  }

  if (hasMissingIssues) {
    console.log("\n⚠️  Missing Data Issues:");
    console.log("   - Pages loaded but no title/description found");
    console.log("   - Likely: JS-rendered content (need Playwright) or unusual HTML structure");
  }

  if (hasScanErrors) {
    console.log("\n❌ Scan Error Issues:");
    console.log("   - Network failures, timeouts, or HTTP errors");
    console.log("   - Consider: Retry logic, longer timeouts, or rate limiting");
  }

  console.log("\n✅ Next Steps:");
  console.log("   1. Review error details above");
  console.log("   2. Test individual failing URLs manually");
  console.log("   3. Implement recommended fixes");
  console.log("   4. Re-run benchmarks to verify improvements");
}

function getPrimaryIssue(results: DiagnosticResult["results"]): string {
  const total = results.scan_error + results.missing + results.blocked;
  if (total === 0) return "None";

  const max = Math.max(results.scan_error, results.missing, results.blocked);
  if (max === results.blocked) return "Bot Detection";
  if (max === results.missing) return "Missing Data (likely JS-rendered)";
  return "Network/Scan Errors";
}

main().catch((error) => {
  console.error("\n❌ Diagnostic failed:", error);
  process.exit(1);
});
