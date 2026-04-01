// Unified scan runner — selects the pipeline and returns a consistent result.
//
// UI code only calls this function. To switch permanently to one pipeline:
//   - Remove the other pipeline file
//   - Remove the ScanPipeline type union member
//   - Remove the corresponding button from SitemapDebug
//   - Simplify this function to call the remaining pipeline directly

import { runPreviousProcess } from "@/scan/pipelines/previousProcess";
import { runImprovedProcess } from "@/scan/pipelines/improvedProcess";
import type { ScanPipeline, ScanRunOptions, ScanRunResult } from "@/scan/types";

export async function runScan(
  pipeline: ScanPipeline,
  options: ScanRunOptions
): Promise<ScanRunResult> {
  switch (pipeline) {
    case "previous": return runPreviousProcess(options);
    case "improved": return runImprovedProcess(options);
  }
}
