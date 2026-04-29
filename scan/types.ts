// Shared types for the dual-pipeline scan architecture.
// Both pipelines must produce ScanResult[] (from lib/types.ts) so results
// are directly comparable. This file adds pipeline-level metadata only.

export type ScanPipeline = "previous" | "improved";

// ─── Performance Mode ─────────────────────────────────────────────────────────

export type PerformanceMode = "safe" | "balanced" | "fast";

export type PerformanceConfig = {
  concurrency: number;
  fetchTimeoutMs: number;
  pwNavTimeoutMs: number;
  pwStabilizeMs: number;
  delayBetweenTasksMs: number; // 0 = no delay
  label: string;
  description: string;
};

export const PERFORMANCE_CONFIGS: Record<PerformanceMode, PerformanceConfig> = {
  safe: {
    concurrency: 2,
    fetchTimeoutMs: 14000,
    pwNavTimeoutMs: 22000,
    pwStabilizeMs: 900,
    delayBetweenTasksMs: 300,
    label: "Safe",
    description: "Low resource usage — best for slower PCs",
  },
  balanced: {
    concurrency: 4,
    fetchTimeoutMs: 10000,
    pwNavTimeoutMs: 18000,
    pwStabilizeMs: 600,
    delayBetweenTasksMs: 0,
    label: "Balanced",
    description: "Good mix of speed and stability (default)",
  },
  fast: {
    concurrency: 6,
    fetchTimeoutMs: 7000,
    pwNavTimeoutMs: 14000,
    pwStabilizeMs: 400,
    delayBetweenTasksMs: 0,
    label: "Fast",
    description: "Higher throughput — best for powerful PCs",
  },
};

export const DEFAULT_PERFORMANCE_MODE: PerformanceMode = "balanced";

// Pipeline configuration constants — safe to import on the client
export const IMPROVED_CONCURRENCY = PERFORMANCE_CONFIGS.balanced.concurrency;

// ─── Scan run types ───────────────────────────────────────────────────────────

export type ScanRunOptions = {
  urls: string[];
  limit?: number;
  signal?: AbortSignal;
  performanceMode?: PerformanceMode;
  /** When true, fetch calls use cache: "no-store" to prevent HTTP cache warm-up contamination */
  noCache?: boolean;
};

export type ScanRunResult = {
  pipeline: ScanPipeline;
  results: import("@/lib/types").ScanResult[];
  startedAt: number; // Date.now()
  finishedAt: number; // Date.now()
  durationMs: number;
  scannedCount: number;
  performanceMode?: PerformanceMode;
};
