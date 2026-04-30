#!/usr/bin/env tsx
/**
 * Benchmark Results Analyzer
 *
 * Generates additional analysis and data formats from benchmark results.
 * Useful for creating charts and visualizations.
 *
 * Usage:
 *   npx tsx benchmark/analyze-results.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface BenchmarkResult {
  site: string;
  siteUrl: string;
  expectedPages: number;
  actualPages: number;
  testType: "sitemap-crawl" | "scan";
  performanceMode?: string;
  concurrency?: number;
  duration: number;
  memory: { peak: number; average: number };
  throughput: number;
  successRate: number;
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

// ─── Load Results ─────────────────────────────────────────────────────────────

const resultsPath = join(process.cwd(), "benchmark", "results.json");
let suite: BenchmarkSuite;

try {
  const data = readFileSync(resultsPath, "utf-8");
  suite = JSON.parse(data);
} catch (error) {
  console.error("❌ Could not load results.json. Run benchmarks first:");
  console.error("   npm run benchmark");
  process.exit(1);
}

console.log("📊 Analyzing benchmark results...\n");

// ─── Analysis Functions ───────────────────────────────────────────────────────

function generateSitemapCrawlAnalysis() {
  console.log("═".repeat(60));
  console.log("Sitemap Crawl Performance Data");
  console.log("═".repeat(60));

  const crawlData = suite.results
    .filter((r) => r.testType === "sitemap-crawl")
    .map((r) => ({
      site: r.site,
      pages: r.actualPages,
      duration: r.duration,
      throughput: r.throughput,
      memoryPeak: r.memory.peak,
      memoryAvg: r.memory.average,
    }));

  console.log("\nJSON for Sitemap Crawl Chart:");
  console.log(JSON.stringify(crawlData, null, 2));

  writeFileSync(
    join(process.cwd(), "benchmark", "sitemap-crawl.json"),
    JSON.stringify(crawlData, null, 2)
  );
  console.log("\n✓ Saved to: benchmark/sitemap-crawl.json");
}

function generateScanPerformance() {
  console.log("\n" + "═".repeat(60));
  console.log("Scan Performance Data (for charts)");
  console.log("═".repeat(60));

  const scanData = suite.results
    .filter((r) => r.testType === "scan" && r.performanceMode === "balanced")
    .map((r) => ({
      site: r.site,
      pages: r.actualPages,
      duration: r.duration,
      throughput: r.throughput,
      successRate: r.successRate,
      memoryPeak: r.memory.peak,
    }));

  console.log("\nJSON for Scan Performance Chart:");
  console.log(JSON.stringify(scanData, null, 2));

  writeFileSync(
    join(process.cwd(), "benchmark", "scan-performance.json"),
    JSON.stringify(scanData, null, 2)
  );
  console.log("\n✓ Saved to: benchmark/scan-performance.json");
}

function generateWorkerScaling() {
  console.log("\n" + "═".repeat(60));
  console.log("Worker Scaling Data (for line chart)");
  console.log("═".repeat(60));

  const scalingData = suite.results
    .filter((r) => r.testType === "scan" && r.performanceMode)
    .map((r) => ({
      workers: r.concurrency,
      mode: r.performanceMode,
      duration: r.duration,
      throughput: r.throughput,
      memoryPeak: r.memory.peak,
      memoryAvg: r.memory.average,
    }))
    .sort((a, b) => (a.workers || 0) - (b.workers || 0));

  console.log("\nJSON for Line Chart:");
  console.log(JSON.stringify(scalingData, null, 2));

  writeFileSync(
    join(process.cwd(), "benchmark", "worker-scaling.json"),
    JSON.stringify(scalingData, null, 2)
  );
  console.log("\n✓ Saved to: benchmark/worker-scaling.json");
}

function generateMemoryAnalysis() {
  console.log("\n" + "═".repeat(60));
  console.log("Memory Efficiency Analysis");
  console.log("═".repeat(60));

  const memoryData = suite.results
    .filter((r) => r.testType === "scan")
    .map((r) => ({
      site: r.site,
      pages: r.actualPages,
      memoryPeak: r.memory.peak,
      memoryAvg: r.memory.average,
      memoryPerPage: (r.memory.peak / r.actualPages).toFixed(2),
      mode: r.performanceMode || "balanced",
    }));

  console.log("\nJSON for Memory Chart:");
  console.log(JSON.stringify(memoryData, null, 2));

  writeFileSync(
    join(process.cwd(), "benchmark", "memory-analysis.json"),
    JSON.stringify(memoryData, null, 2)
  );
  console.log("\n✓ Saved to: benchmark/memory-analysis.json");
}

function generateKeyMetrics() {
  console.log("\n" + "═".repeat(60));
  console.log("Key Metrics Summary");
  console.log("═".repeat(60));

  const crawlResults = suite.results.filter((r) => r.testType === "sitemap-crawl");
  const scanResults = suite.results.filter((r) => r.testType === "scan");

  const avgCrawlThroughput =
    crawlResults.length > 0
      ? crawlResults.reduce((sum, r) => sum + r.throughput, 0) / crawlResults.length
      : 0;

  const avgScanThroughput =
    scanResults.length > 0
      ? scanResults.reduce((sum, r) => sum + r.throughput, 0) / scanResults.length
      : 0;

  const maxScanThroughput =
    scanResults.length > 0 ? Math.max(...scanResults.map((r) => r.throughput)) : 0;

  const avgSuccessRate =
    scanResults.length > 0
      ? scanResults.reduce((sum, r) => sum + r.successRate, 0) / scanResults.length
      : 0;

  const totalPages = suite.results.reduce((sum, r) => sum + r.actualPages, 0);
  const totalErrors = suite.results.reduce((sum, r) => sum + r.errors, 0);

  // Memory efficiency (at largest scale)
  const largestScan = scanResults.reduce(
    (prev, curr) => (curr.actualPages > prev.actualPages ? curr : prev),
    scanResults[0] || { actualPages: 0, memory: { peak: 0 } }
  );

  const memoryPerPage =
    largestScan.actualPages > 0 ? largestScan.memory.peak / largestScan.actualPages : 0;

  const metrics = {
    avgCrawlThroughput: `${avgCrawlThroughput.toFixed(2)} pages/sec`,
    avgScanThroughput: `${avgScanThroughput.toFixed(2)} pages/sec`,
    maxScanThroughput: `${maxScanThroughput.toFixed(2)} pages/sec`,
    avgSuccessRate: `${avgSuccessRate.toFixed(1)}%`,
    memoryEfficiency: `${memoryPerPage.toFixed(2)} MB/page`,
    totalPages,
    totalErrors,
    errorRate: totalPages > 0 ? `${((totalErrors / totalPages) * 100).toFixed(2)}%` : "0%",
  };

  console.log("\nKey Metrics:");
  console.log(JSON.stringify(metrics, null, 2));

  console.log("\n📋 Portfolio-Ready Highlights:");
  console.log(`   🗺️  ${metrics.avgCrawlThroughput} sitemap crawl throughput`);
  console.log(`   📊 ${metrics.maxScanThroughput} peak scan throughput`);
  console.log(`   💾 ${metrics.memoryEfficiency} memory efficiency at scale`);
  console.log(`   ✅ ${metrics.avgSuccessRate} average success rate`);
  console.log(`   📈 ${totalPages} total pages processed`);

  writeFileSync(
    join(process.cwd(), "benchmark", "key-metrics.json"),
    JSON.stringify(metrics, null, 2)
  );
  console.log("\n✓ Saved to: benchmark/key-metrics.json");
}

function generateCSV() {
  console.log("\n" + "═".repeat(60));
  console.log("CSV Export");
  console.log("═".repeat(60));

  const headers = [
    "Site",
    "Pages",
    "Test Type",
    "Mode",
    "Workers",
    "Duration (s)",
    "Memory Peak (MB)",
    "Memory Avg (MB)",
    "Throughput (p/s)",
    "Success Rate (%)",
    "Errors",
  ];

  const rows = suite.results.map((r) => [
    r.site,
    r.actualPages,
    r.testType,
    r.performanceMode || "—",
    r.concurrency || "—",
    r.duration.toFixed(2),
    r.memory.peak,
    r.memory.average,
    r.throughput.toFixed(2),
    r.successRate.toFixed(1),
    r.errors,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  writeFileSync(join(process.cwd(), "benchmark", "results.csv"), csv);
  console.log("\n✓ Saved to: benchmark/results.csv");
}

// ─── Run All Analysis ─────────────────────────────────────────────────────────

generateSitemapCrawlAnalysis();
generateScanPerformance();
generateWorkerScaling();
generateMemoryAnalysis();
generateKeyMetrics();
generateCSV();

console.log("\n" + "═".repeat(60));
console.log("✅ Analysis Complete!");
console.log("═".repeat(60));
console.log("\nGenerated files:");
console.log("  • sitemap-crawl.json — for sitemap crawl charts");
console.log("  • scan-performance.json — for scan performance charts");
console.log("  • worker-scaling.json — for line charts");
console.log("  • memory-analysis.json — for memory charts");
console.log("  • key-metrics.json — for summary cards");
console.log("  • results.csv — for spreadsheet import");
console.log("\nUse these files to create visualizations in your portfolio!");
