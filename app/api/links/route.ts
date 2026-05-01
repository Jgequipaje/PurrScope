// POST /api/links
// Link validation API route — validates links across specified pages
// Accepts { siteUrl, pageUrls, linkScope, concurrency?, timeout? }

import { NextRequest, NextResponse } from "next/server";
import { runLinkValidation } from "@/scan/pipelines/linkValidationProcess";
import type { LinkValidationRequest, LinkScope } from "@/lib/types";

const VALID_LINK_SCOPES: LinkScope[] = ["internal", "all"];
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 10;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 30000;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Extract and validate request parameters
  const siteUrl: unknown = body?.siteUrl;
  const pageUrls: unknown = body?.pageUrls;
  const linkScope: unknown = body?.linkScope;
  const concurrency: unknown = body?.concurrency;
  const timeout: unknown = body?.timeout;

  // Validate siteUrl
  if (typeof siteUrl !== "string" || !siteUrl) {
    return NextResponse.json({ error: "Provide a valid site URL." }, { status: 400 });
  }

  if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "Site URL must start with http:// or https://" },
      { status: 400 }
    );
  }

  // Validate pageUrls
  if (!Array.isArray(pageUrls) || pageUrls.length === 0) {
    return NextResponse.json({ error: "Provide at least one page URL." }, { status: 400 });
  }

  for (const url of pageUrls) {
    if (typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json(
        { error: `Invalid page URL: "${url}". All URLs must start with http:// or https://` },
        { status: 400 }
      );
    }
  }

  // Validate linkScope
  if (typeof linkScope !== "string" || !VALID_LINK_SCOPES.includes(linkScope as LinkScope)) {
    return NextResponse.json(
      { error: `Invalid link scope: "${linkScope}". Must be "internal" or "all".` },
      { status: 400 }
    );
  }

  // Validate concurrency (optional)
  let validatedConcurrency: number | undefined;
  if (concurrency !== undefined) {
    if (typeof concurrency !== "number" || !Number.isInteger(concurrency)) {
      return NextResponse.json({ error: "Concurrency must be an integer." }, { status: 400 });
    }
    if (concurrency < MIN_CONCURRENCY || concurrency > MAX_CONCURRENCY) {
      return NextResponse.json(
        { error: `Concurrency must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}.` },
        { status: 400 }
      );
    }
    validatedConcurrency = concurrency;
  }

  // Validate timeout (optional)
  let validatedTimeout: number | undefined;
  if (timeout !== undefined) {
    if (typeof timeout !== "number" || !Number.isInteger(timeout)) {
      return NextResponse.json({ error: "Timeout must be an integer." }, { status: 400 });
    }
    if (timeout < MIN_TIMEOUT || timeout > MAX_TIMEOUT) {
      return NextResponse.json(
        { error: `Timeout must be between ${MIN_TIMEOUT}ms and ${MAX_TIMEOUT}ms.` },
        { status: 400 }
      );
    }
    validatedTimeout = timeout;
  }

  // Build validated request
  const request: LinkValidationRequest = {
    siteUrl: siteUrl as string,
    pageUrls: pageUrls as string[],
    linkScope: linkScope as LinkScope,
    concurrency: validatedConcurrency,
    timeout: validatedTimeout,
  };

  try {
    // Run link validation pipeline with AbortSignal support
    const response = await runLinkValidation(request, req.signal);

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Link validation failed: ${message}` }, { status: 500 });
  }
}
