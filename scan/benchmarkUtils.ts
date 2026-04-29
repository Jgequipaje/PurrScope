// Benchmark utility functions — pure, no React, no side effects.
//
// To remove the benchmark feature later, delete this file along with
// benchmarkTypes.ts and components/BenchmarkComparisonTable.tsx.

import type { ScanResult } from "@/lib/types";
import type { ScanPipeline, PerformanceMode } from "@/scan/types";
import type { ScanScope } from "@/lib/types";
import type {
  BenchmarkMetrics,
  BenchmarkRunMode,
  BenchmarkSnapshot,
  ConsistencyReport,
} from "@/scan/benchmarkTypes";

// ── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * Creates an immutable benchmark input snapshot.
 * Both pipelines must use the same snapshot for a fair comparison.
 */
export function createSnapshot(
  urls: string[],
  scope: ScanScope,
  limit: number | null,
  exclusions: string[]
): BenchmarkSnapshot {
  return {
    urls: [...urls], // defensive copy — freeze the list
    scanScope: scope,
    scanLimit: limit,
    queueSize: urls.length,
    exclusions: [...exclusions],
    capturedAt: Date.now(),
  };
}

// ── Metrics ───────────────────────────────────────────────────────────────────

/**
 * Derives BenchmarkMetrics from a completed scan run.
 * durationMs must come from the shared timing wrapper, not the pipeline.
 */
export function computeMetrics(
  pipeline: ScanPipeline,
  results: ScanResult[],
  durationMs: number,
  opts: {
    urlsQueued: number;
    scanScope: string;
    scanLimit: number | null;
    concurrency: number | null;
    browserReuse: boolean;
    performanceMode?: PerformanceMode | null;
    runMode: BenchmarkRunMode;
  }
): BenchmarkMetrics {
  const successCount = results.filter((r) => r.scanStatus === "success").length;
  const blockedCount = results.filter((r) => r.scanStatus === "Blocked (automation)").length;
  const errorCount = results.filter((r) => r.scanStatus === "scan_error").length;
  const failedCount = results.filter(
    (r) => r.titleStatus === "Fail" || r.descriptionStatus === "Fail"
  ).length;
  const fetchCount = results.filter((r) => r.methodUsed === "fetch").length;
  const playwrightCount = results.filter((r) => r.methodUsed === "playwright").length;

  const urlsScanned = results.length;
  const avgTimePerPageMs = urlsScanned > 0 ? Math.round(durationMs / urlsScanned) : 0;

  return {
    pipeline,
    performanceMode: opts.performanceMode ?? null,
    runMode: opts.runMode,
    totalDurationMs: durationMs,
    avgTimePerPageMs,
    urlsQueued: opts.urlsQueued,
    urlsScanned,
    successCount,
    failedCount,
    blockedCount,
    errorCount,
    fetchCount,
    playwrightCount,
    scanScope: opts.scanScope,
    scanLimit: opts.scanLimit,
    queueSize: opts.urlsQueued,
    concurrency: opts.concurrency,
    browserReuse: opts.browserReuse,
    cacheMode: opts.runMode === "cold" ? "no-store" : "default",
    ranAt: Date.now(),
  };
}

/**
 * Compares two result sets for the same URLs.
 * Matches by URL — only URLs present in both sets are compared.
 */
export function compareResults(a: ScanResult[], b: ScanResult[]): ConsistencyReport {
  const mapB = new Map(b.map((r) => [r.url, r]));
  const compared = a.filter((r) => mapB.has(r.url));

  if (compared.length === 0) {
    return {
      totalCompared: 0,
      titleMatch: 0,
      titleMismatch: 0,
      descriptionMatch: 0,
      descriptionMismatch: 0,
      statusMatch: 0,
      statusMismatch: 0,
      matchRate: 0,
    };
  }

  let titleMatch = 0,
    titleMismatch = 0;
  let descriptionMatch = 0,
    descriptionMismatch = 0;
  let statusMatch = 0,
    statusMismatch = 0;

  for (const ra of compared) {
    const rb = mapB.get(ra.url)!;

    ra.title === rb.title ? titleMatch++ : titleMismatch++;
    ra.description === rb.description ? descriptionMatch++ : descriptionMismatch++;
    ra.scanStatus === rb.scanStatus ? statusMatch++ : statusMismatch++;
  }

  const totalFields = compared.length * 3;
  const matchedFields = titleMatch + descriptionMatch + statusMatch;
  const matchRate = totalFields > 0 ? matchedFields / totalFields : 0;

  return {
    totalCompared: compared.length,
    titleMatch,
    titleMismatch,
    descriptionMatch,
    descriptionMismatch,
    statusMatch,
    statusMismatch,
    matchRate,
  };
}

/**
 * Formats a duration in ms to a readable string: "1.2s" or "1m 05s"
 */
export function fmtDuration(ms: number): string {
  if (ms <= 0) return "0.0s";
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
}

/**
 * Returns "faster" | "slower" | "same" for a vs b on a given ms metric.
 * Lower is better.
 */
export function compareSpeed(a: number, b: number): "faster" | "slower" | "same" {
  const diff = a - b;
  if (Math.abs(diff) < 200) return "same"; // < 200ms difference = negligible
  return diff < 0 ? "faster" : "slower";
}

/**
 * Returns true when both runs used the same mode and same snapshot size.
 * Used to show/hide the fairness warning in the UI.
 */
export function isFairComparison(a: BenchmarkMetrics, b: BenchmarkMetrics): boolean {
  return (
    a.runMode === b.runMode &&
    a.queueSize === b.queueSize &&
    a.scanScope === b.scanScope &&
    a.scanLimit === b.scanLimit
  );
}
