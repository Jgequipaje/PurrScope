// Benchmark types for dual-pipeline comparison.
//
// To remove the benchmark feature later:
//   1. Delete this file, scan/benchmarkUtils.ts, and components/BenchmarkComparisonTable.tsx
//   2. Remove benchmarkMetrics state from app/page.tsx
//   3. Remove <BenchmarkComparisonTable> from the render

import type { ScanPipeline, PerformanceMode } from "@/scan/types";
import type { ScanScope } from "@/lib/types";

// ── Run mode ──────────────────────────────────────────────────────────────────

/** Cold = no prior cache benefit. Warm = allows HTTP/browser cache reuse. */
export type BenchmarkRunMode = "cold" | "warm";

// ── Input snapshot ────────────────────────────────────────────────────────────

/**
 * Frozen snapshot of the scan inputs captured before either pipeline runs.
 * Both pipelines MUST use the exact same snapshot for a fair comparison.
 */
export type BenchmarkSnapshot = {
  urls: string[]; // exact ordered URL list (post-filter, post-limit)
  scanScope: ScanScope;
  scanLimit: number | null;
  queueSize: number;
  exclusions: string[]; // selected dynamic group sitemap URLs
  capturedAt: number; // Date.now() when snapshot was taken
};

// ── Per-run metrics ───────────────────────────────────────────────────────────

export type BenchmarkMetrics = {
  pipeline: ScanPipeline;
  performanceMode: PerformanceMode | null; // null for previous process
  runMode: BenchmarkRunMode;
  // Timing — measured by the shared timing wrapper, not the pipeline itself
  totalDurationMs: number;
  avgTimePerPageMs: number;
  // Counts
  urlsQueued: number;
  urlsScanned: number;
  successCount: number;
  failedCount: number;
  blockedCount: number;
  errorCount: number;
  fetchCount: number; // pages resolved via fetch alone
  playwrightCount: number; // pages that needed Playwright fallback
  // Scan config snapshot (for tying runs to the same setup)
  scanScope: string;
  scanLimit: number | null; // null = no limit (scan all)
  queueSize: number;
  // Pipeline notes
  concurrency: number | null; // null = sequential (previous process)
  browserReuse: boolean;
  cacheMode: "no-store" | "default"; // HTTP fetch cache behaviour
  // Timestamp
  ranAt: number; // Date.now()
};

export type ConsistencyReport = {
  totalCompared: number;
  titleMatch: number;
  titleMismatch: number;
  descriptionMatch: number;
  descriptionMismatch: number;
  statusMatch: number;
  statusMismatch: number;
  matchRate: number; // 0–1, overall field agreement
};
