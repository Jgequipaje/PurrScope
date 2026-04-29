// POST /api/scan-improved
// Same contract as /api/scan but uses the improved concurrent pipeline.
// Accepts { urls: string[], limit?: number }

import { NextRequest, NextResponse } from "next/server";
import { runImprovedProcess } from "@/scan/pipelines/improvedProcess";
import type { PerformanceMode } from "@/scan/types";
import { PERFORMANCE_CONFIGS, DEFAULT_PERFORMANCE_MODE } from "@/scan/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const urls: unknown = body?.urls;
  const limit: number | undefined = typeof body?.limit === "number" ? body.limit : undefined;
  const performanceMode: PerformanceMode =
    body?.performanceMode in PERFORMANCE_CONFIGS ? body.performanceMode : DEFAULT_PERFORMANCE_MODE;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Provide at least one URL." }, { status: 400 });
  }
  if ((urls as string[]).length > 500) {
    return NextResponse.json(
      { error: "Too many URLs. Maximum is 500 per request." },
      { status: 400 }
    );
  }

  for (const url of urls as string[]) {
    if (!url.startsWith("http")) {
      return NextResponse.json(
        { error: `Invalid URL: "${url}". All URLs must start with http:// or https://` },
        { status: 400 }
      );
    }
  }

  try {
    const noCache = body?.runMode === "cold";
    const run = await runImprovedProcess({
      urls: urls as string[],
      limit,
      signal: req.signal,
      performanceMode,
      noCache,
    });
    return NextResponse.json({
      results: run.results,
      scanned: run.scannedCount,
      pipeline: run.pipeline,
      durationMs: run.durationMs,
      performanceMode: run.performanceMode,
      runMode: body?.runMode ?? "warm",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Scanner failed: ${message}` }, { status: 500 });
  }
}
