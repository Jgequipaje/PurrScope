#!/usr/bin/env tsx
/**
 * PurrScope Performance Benchmark Suite
 *
 * Tests the improved concurrent scan pipeline and sitemap crawling against
 * real-world websites with different worker configurations to generate
 * portfolio-ready metrics.
 *
 * Success/Error Classification:
 *   SUCCESS = We fetched the page and extracted data (even if SEO rules fail)
 *             - scanStatus "success" = got title/description (Pass or Fail is about SEO rules)
 *             - scanStatus "Blocked (automation)" = detected bot protection (still a fetch attempt)
 *   ERROR   = We couldn't fetch the data at all
 *             - scanStatus "scan_error" = network/fetch failure
 *             - scanStatus "missing" = fetched page but found NO title AND NO description
 *
 * Usage:
 *   npx tsx benchmark/run-benchmarks.ts
 *
 * Output:
 *   - Console: Real-time progress
 *   - benchmark/results.json: Complete benchmark data
 *   - benchmark/summary.md: Human-readable summary
 */

import { resolveSitemapUrls } from "@/lib/sitemap";
import { runScan } from "@/scan/scanRunner";
import type { PerformanceMode } from "@/scan/types";
import type { ScanStatus } from "@/lib/types";
import { writeFileSync } from "fs";
import { join } from "path";

// ─── Test Sites ───────────────────────────────────────────────────────────────

const TEST_SITES = [
  { name: "Rawspace", url: "https://rawspace.com/", expectedPages: 43 },
  { name: "Irwin Upstate", url: "https://irwinupstate.com/", expectedPages: 50 },
  { name: "Cooley Gibson", url: "https://cooleygibsonrealestate.com/", expectedPages: 70 },
  { name: "Selling Central PA", url: "https://sellingcentralpahomes.com/", expectedPages: 93 },
  { name: "Staci Mueller", url: "https://stacimueller.com/", expectedPages: 119 },
];

// ─── Benchmark Configuration ──────────────────────────────────────────────────

const PERFORMANCE_MODES: PerformanceMode[] = ["safe", "balanced", "fast"];

interface BenchmarkResult {
  site: string;
  siteUrl: string;
  expectedPages: number;
  actualPages: number;
  testType: "sitemap-crawl" | "scan";
  performanceMode?: PerformanceMode;
  concurrency?: number;
  duration: number; // seconds
  memory: {
    peak: number; // MB
    average: number; // MB
  };
  throughput: number; // pages/second
  successRate: number; // percentage
  errors: number;
  timestamp: string;
}

interface BenchmarkSuite {
  environment: {
    os: string;
    nodeVersion: string;
    timestamp: string;
  };
  results: BenchmarkResult[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatMemoryUsage = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

function getSystemInfo() {
  return {
    os: `${process.platform} ${process.arch}`,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };
}

// ─── Benchmark Runner ─────────────────────────────────────────────────────────

async function runScanBenchmark(
  siteName: string,
  siteUrl: string,
  expectedPages: number,
  urls: string[],
  performanceMode?: PerformanceMode
): Promise<BenchmarkResult> {
  console.log(`\n🔍 Testing Scan: ${siteName} (${urls.length} pages)`);
  console.log(`   Mode: ${performanceMode || "balanced"}`);

  // Memory tracking
  const memoryStats: number[] = [];
  const memInterval = setInterval(() => {
    memoryStats.push(process.memoryUsage().heapUsed);
  }, 100);

  // Run scan with improved pipeline
  const startTime = Date.now();
  const result = await runScan("improved", {
    urls,
    performanceMode,
    noCache: true, // Prevent cache contamination
  });
  const endTime = Date.now();

  clearInterval(memInterval);

  // Calculate metrics
  const duration = (endTime - startTime) / 1000;
  const peakMemory = formatMemoryUsage(Math.max(...memoryStats));
  const avgMemory = formatMemoryUsage(memoryStats.reduce((a, b) => a + b, 0) / memoryStats.length);
  const throughput = urls.length / duration;

  // Success = we fetched the data (even if SEO title/desc fail the rules)
  // - "success" = got title/description (Pass or Fail is about SEO rules, not fetch success)
  // - "Blocked (automation)" = detected bot protection (still a successful fetch attempt)
  const isSuccessfulFetch = (status: ScanStatus) =>
    status === "success" || status === "Blocked (automation)";

  // Error = we couldn't fetch ANY data
  // - "scan_error" = network/fetch failure
  // - "missing" = fetched page but found NO title AND NO description
  const isFetchError = (status: ScanStatus) => status === "scan_error" || status === "missing";

  const successCount = result.results.filter((r) => isSuccessfulFetch(r.scanStatus)).length;
  const successRate = (successCount / result.results.length) * 100;
  const errors = result.results.filter((r) => isFetchError(r.scanStatus)).length;

  console.log(`   ✓ Duration: ${duration.toFixed(2)}s`);
  console.log(`   ✓ Throughput: ${throughput.toFixed(2)} pages/sec`);
  console.log(`   ✓ Memory: ${peakMemory} MB (peak), ${avgMemory} MB (avg)`);
  console.log(`   ✓ Success: ${successRate.toFixed(1)}% (${errors} errors)`);

  return {
    site: siteName,
    siteUrl,
    expectedPages,
    actualPages: urls.length,
    testType: "scan",
    performanceMode,
    concurrency: performanceMode ? getConcurrency(performanceMode) : undefined,
    duration,
    memory: {
      peak: peakMemory,
      average: avgMemory,
    },
    throughput,
    successRate,
    errors,
    timestamp: new Date().toISOString(),
  };
}

async function runSitemapCrawlBenchmark(
  siteName: string,
  siteUrl: string,
  expectedPages: number
): Promise<{ result: BenchmarkResult; urls: string[] }> {
  console.log(`\n🗺️  Testing Sitemap Crawl: ${siteName}`);

  // Memory tracking
  const memoryStats: number[] = [];
  const memInterval = setInterval(() => {
    memoryStats.push(process.memoryUsage().heapUsed);
  }, 100);

  // Run sitemap crawl
  const startTime = Date.now();
  const crawlResult = await resolveSitemapUrls(siteUrl);
  const endTime = Date.now();

  clearInterval(memInterval);

  // Calculate metrics
  const duration = (endTime - startTime) / 1000;
  const peakMemory = formatMemoryUsage(Math.max(...memoryStats));
  const avgMemory = formatMemoryUsage(memoryStats.reduce((a, b) => a + b, 0) / memoryStats.length);
  const throughput = crawlResult.pageCount / duration;

  console.log(`   ✓ Duration: ${duration.toFixed(2)}s`);
  console.log(`   ✓ Throughput: ${throughput.toFixed(2)} pages/sec`);
  console.log(`   ✓ Memory: ${peakMemory} MB (peak), ${avgMemory} MB (avg)`);
  console.log(`   ✓ Pages found: ${crawlResult.pageCount}`);
  console.log(`   ✓ Sitemaps crawled: ${crawlResult.sitemapCount}`);

  return {
    result: {
      site: siteName,
      siteUrl,
      expectedPages,
      actualPages: crawlResult.pageCount,
      testType: "sitemap-crawl",
      duration,
      memory: {
        peak: peakMemory,
        average: avgMemory,
      },
      throughput,
      successRate: 100, // Sitemap crawl doesn't have failures in the same way
      errors: 0,
      timestamp: new Date().toISOString(),
    },
    urls: crawlResult.pageUrls,
  };
}

function getConcurrency(mode: PerformanceMode): number {
  const map = { safe: 2, balanced: 4, fast: 6 };
  return map[mode];
}

// ─── Main Benchmark Suite ─────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         PurrScope Performance Benchmark Suite              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const suite: BenchmarkSuite = {
    environment: getSystemInfo(),
    results: [],
  };

  console.log("\n📊 Environment:");
  console.log(`   OS: ${suite.environment.os}`);
  console.log(`   Node: ${suite.environment.nodeVersion}`);
  console.log(`   Time: ${suite.environment.timestamp}`);

  // ─── Phase 1: Benchmark Sitemap Crawling ────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("Phase 1: Sitemap Crawl Performance");
  console.log("═".repeat(60));

  const siteData: Array<{ name: string; url: string; expectedPages: number; urls: string[] }> = [];

  for (const site of TEST_SITES) {
    try {
      console.log(`\n📡 Crawling sitemap: ${site.name} (${site.url})`);
      const { result, urls } = await runSitemapCrawlBenchmark(
        site.name,
        site.url,
        site.expectedPages
      );
      suite.results.push(result);

      siteData.push({
        name: site.name,
        url: site.url,
        expectedPages: site.expectedPages,
        urls,
      });

      console.log(`   ✅ Successfully crawled ${site.name}`);

      // Wait between tests to let system stabilize
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed to crawl ${site.name}:`, error);
      console.error(`   Continuing with remaining sites...`);
    }
  }

  console.log(
    `\n📊 Sitemap crawl complete: ${siteData.length}/${TEST_SITES.length} sites successful`
  );

  if (siteData.length === 0) {
    console.error("\n❌ No sites could be crawled. Exiting.");
    process.exit(1);
  }

  // ─── Phase 2: Scan Performance (Balanced Mode) ──────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("Phase 2: Scan Performance (Balanced Mode)");
  console.log("═".repeat(60));

  for (const site of siteData) {
    try {
      console.log(`\n🔍 Scanning ${site.name} (${site.urls.length} pages)...`);
      const scanResult = await runScanBenchmark(
        site.name,
        site.url,
        site.expectedPages,
        site.urls,
        "balanced"
      );
      suite.results.push(scanResult);
      console.log(`   ✅ Successfully scanned ${site.name}`);

      // Longer wait between sites to avoid cumulative rate limiting
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
    } catch (error) {
      console.error(`   ❌ Failed to scan ${site.name}:`, error);
      console.error(`   Continuing with remaining sites...`);
    }
  }

  // ─── Phase 3: Worker Scaling Analysis ───────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("Phase 3: Worker Scaling Analysis");
  console.log("═".repeat(60));

  // Use the largest site for scaling tests
  const largestSite = siteData.reduce((prev, curr) =>
    curr.urls.length > prev.urls.length ? curr : prev
  );

  console.log(`\nUsing ${largestSite.name} (${largestSite.urls.length} pages) for scaling tests`);

  for (const mode of PERFORMANCE_MODES) {
    try {
      console.log(`\n🔧 Testing ${mode} mode on ${largestSite.name}...`);
      const result = await runScanBenchmark(
        largestSite.name,
        largestSite.url,
        largestSite.expectedPages,
        largestSite.urls,
        mode
      );
      suite.results.push(result);
      console.log(`   ✅ Successfully tested ${mode} mode`);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed to test ${mode} mode:`, error);
      console.error(`   Continuing with remaining modes...`);
    }
  }

  // ─── Save Results ────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("Saving Results");
  console.log("═".repeat(60));

  const resultsPath = join(process.cwd(), "benchmark", "results.json");
  writeFileSync(resultsPath, JSON.stringify(suite, null, 2));
  console.log(`\n✓ Results saved to: ${resultsPath}`);

  // ─── Generate Summary ────────────────────────────────────────────────────────

  const summary = generateSummary(suite);
  const summaryPath = join(process.cwd(), "benchmark", "summary.md");
  writeFileSync(summaryPath, summary);
  console.log(`✓ Summary saved to: ${summaryPath}`);

  console.log("\n" + "═".repeat(60));
  console.log("✅ Benchmark Complete!");
  console.log("═".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Review benchmark/results.json for raw data");
  console.log("  2. Review benchmark/summary.md for formatted results");
  console.log("  3. Use the data to create charts for your portfolio");
}

// ─── Summary Generator ────────────────────────────────────────────────────────

function generateSummary(suite: BenchmarkSuite): string {
  let md = "# PurrScope Performance Benchmarks\n\n";

  md += "## Test Environment\n\n";
  md += `- **OS**: ${suite.environment.os}\n`;
  md += `- **Node.js**: ${suite.environment.nodeVersion}\n`;
  md += `- **Date**: ${new Date(suite.environment.timestamp).toLocaleString()}\n\n`;

  // Sitemap Crawl Performance
  md += "## Sitemap Crawl Performance\n\n";
  md += "Time to discover and parse all page URLs from sitemaps:\n\n";
  md += "| Site | Pages Found | Duration | Throughput | Memory (Peak) |\n";
  md += "|------|-------------|----------|------------|---------------|\n";

  const crawlResults = suite.results.filter((r) => r.testType === "sitemap-crawl");
  for (const result of crawlResults) {
    md += `| ${result.site} | ${result.actualPages} | ${result.duration.toFixed(2)}s | ${result.throughput.toFixed(2)} p/s | ${result.memory.peak} MB |\n`;
  }

  // Scan Performance
  md += "\n## Scan Performance (Balanced Mode)\n\n";
  md += "Time to scan all pages and extract SEO data:\n\n";
  md += "| Site | Pages | Duration | Throughput | Success Rate | Memory (Peak) |\n";
  md += "|------|-------|----------|------------|--------------|---------------|\n";

  const scanResults = suite.results.filter(
    (r) => r.testType === "scan" && r.performanceMode === "balanced"
  );
  for (const result of scanResults) {
    md += `| ${result.site} | ${result.actualPages} | ${result.duration.toFixed(1)}s | ${result.throughput.toFixed(2)} p/s | ${result.successRate.toFixed(1)}% | ${result.memory.peak} MB |\n`;
  }

  // Worker Scaling
  md += "\n## Worker Scaling Analysis\n\n";
  const scalingResults = suite.results.filter(
    (r) => r.testType === "scan" && r.performanceMode && r.performanceMode !== "balanced"
  );

  if (scalingResults.length > 0) {
    const site = scalingResults[0].site;
    const balancedResult = suite.results.find(
      (r) => r.testType === "scan" && r.site === site && r.performanceMode === "balanced"
    );

    md += `Testing ${site} (${scalingResults[0].actualPages} pages) with different worker counts:\n\n`;
    md += "| Mode | Workers | Time | Memory (Peak) | Throughput | Success Rate |\n";
    md += "|------|---------|------|---------------|------------|---------------|\n";

    // Include balanced mode in the table
    if (balancedResult) {
      md += `| ${balancedResult.performanceMode} | ${balancedResult.concurrency} | ${balancedResult.duration.toFixed(1)}s | ${balancedResult.memory.peak} MB | ${balancedResult.throughput.toFixed(2)} p/s | ${balancedResult.successRate.toFixed(1)}% |\n`;
    }

    for (const result of scalingResults) {
      if (result.site === site) {
        md += `| ${result.performanceMode} | ${result.concurrency} | ${result.duration.toFixed(1)}s | ${result.memory.peak} MB | ${result.throughput.toFixed(2)} p/s | ${result.successRate.toFixed(1)}% |\n`;
      }
    }
  }

  // Detailed Results
  md += "\n## Detailed Results\n\n";
  md +=
    "| Site | Test Type | Mode | Duration | Memory (Peak) | Memory (Avg) | Throughput | Errors |\n";
  md +=
    "|------|-----------|------|----------|---------------|--------------|------------|--------|\n";

  for (const result of suite.results) {
    const mode = result.performanceMode || "—";
    md += `| ${result.site} | ${result.testType} | ${mode} | ${result.duration.toFixed(2)}s | ${result.memory.peak} MB | ${result.memory.average} MB | ${result.throughput.toFixed(2)} p/s | ${result.errors} |\n`;
  }

  // Key Findings
  md += "\n## Key Findings\n\n";

  const crawlResults2 = suite.results.filter((r) => r.testType === "sitemap-crawl");
  const scanResults2 = suite.results.filter((r) => r.testType === "scan");

  const avgCrawlThroughput =
    crawlResults2.length > 0
      ? crawlResults2.reduce((sum, r) => sum + r.throughput, 0) / crawlResults2.length
      : 0;

  const avgScanThroughput =
    scanResults2.length > 0
      ? scanResults2.reduce((sum, r) => sum + r.throughput, 0) / scanResults2.length
      : 0;

  const avgSuccessRate =
    scanResults2.length > 0
      ? scanResults2.reduce((sum, r) => sum + r.successRate, 0) / scanResults2.length
      : 0;

  const totalPages = suite.results.reduce((sum, r) => sum + r.actualPages, 0);
  const totalErrors = suite.results.reduce((sum, r) => sum + r.errors, 0);

  md += `- **Average Sitemap Crawl Throughput**: ${avgCrawlThroughput.toFixed(2)} pages/second\n`;
  md += `- **Average Scan Throughput**: ${avgScanThroughput.toFixed(2)} pages/second\n`;
  md += `- **Average Success Rate**: ${avgSuccessRate.toFixed(1)}%\n`;
  md += `- **Total Pages Processed**: ${totalPages}\n`;
  md += `- **Total Errors**: ${totalErrors}\n`;

  return md;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch((error) => {
  console.error("\n❌ Benchmark failed:", error);
  process.exit(1);
});
