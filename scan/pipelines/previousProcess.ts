// Previous (stable) scan pipeline.
//
// This is a thin wrapper around the original lib/scanner.ts scanUrls function.
// The underlying implementation is NOT modified — this file only adapts it to
// the shared ScanRunOptions / ScanRunResult interface.
//
// To remove this pipeline later:
//   1. Delete this file.
//   2. Remove the "previous" case from scan/scanRunner.ts.
//   3. Remove the "Use Previous Process" button from SitemapDebug.

import { scanUrls } from "@/lib/scanner";
import type { ScanRunOptions, ScanRunResult } from "@/scan/types";

export async function runPreviousProcess(options: ScanRunOptions): Promise<ScanRunResult> {
  const { urls, limit, signal, noCache = false } = options;
  const toScan = limit !== undefined ? urls.slice(0, limit) : urls;

  const startedAt = Date.now();
  const results = await scanUrls(toScan, signal, noCache);
  const finishedAt = Date.now();

  return {
    pipeline: "previous",
    results,
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    scannedCount: results.length,
  };
}
