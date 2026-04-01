// POST /api/scan
// Accepts { urls: string[], limit?: number }
//
// - `limit` is optional. When provided, the URL list is capped to that number.
//   Manual mode passes MAX_MANUAL_URLS; sitemap mode passes the full filtered list
//   with an optional user-configured cap.
// - No hardcoded truncation — the caller decides the limit.

import { NextRequest, NextResponse } from "next/server";
import { scanUrls, MAX_MANUAL_URLS } from "@/lib/scanner";

export type { ScanResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const urls: unknown = body?.urls;
  // Optional cap — if not provided, scan all URLs in the list
  const limit: number | undefined = typeof body?.limit === "number" ? body.limit : undefined;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Provide at least one URL." }, { status: 400 });
  }

  // Apply limit only when explicitly passed
  const toScan: string[] = limit !== undefined
    ? (urls as string[]).slice(0, limit)
    : (urls as string[]);

  for (const url of toScan) {
    if (!url.startsWith("http")) {
      return NextResponse.json(
        { error: `Invalid URL: "${url}". All URLs must start with http:// or https://` },
        { status: 400 }
      );
    }
  }

  try {
    const noCache = body?.runMode === "cold";
    const startedAt = Date.now();
    const results = await scanUrls(toScan, req.signal, noCache);
    const durationMs = Date.now() - startedAt;
    return NextResponse.json({ results, scanned: results.length, durationMs, runMode: body?.runMode ?? "warm" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Scanner failed: ${message}` }, { status: 500 });
  }
}
