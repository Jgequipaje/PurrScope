// POST /api/sitemap
// Accepts { url, scope, excludePatterns }
// 1. Discovers all page URLs via sitemap crawl
// 2. Runs the URL filter pipeline based on the selected scope
// 3. Returns SitemapCrawlResult including filter debug info

import { NextRequest, NextResponse } from "next/server";
import { resolveSitemapUrls } from "@/lib/sitemap";
import { filterUrls } from "@/lib/filter";
import type { ScanScope } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url: unknown = body?.url;
  const scope: ScanScope = body?.scope ?? "all";
  const excludePatterns: string[] = Array.isArray(body?.excludePatterns)
    ? body.excludePatterns
    : [];

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json(
      { error: "Please provide a valid URL starting with http:// or https://" },
      { status: 400 }
    );
  }

  try {
    // Step 1: crawl sitemaps and collect all page URLs
    const crawl = await resolveSitemapUrls(url);

    // Step 2: apply scope filter based on sourceSitemap
    const filter = filterUrls(crawl.pageEntries, scope, excludePatterns);

    return NextResponse.json({ ...crawl, filter });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
