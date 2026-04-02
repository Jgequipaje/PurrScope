// SEO metadata scanner — fetch-only, no Playwright.
// Playwright was removed for serverless/cloud deployment compatibility.

import { decodeEntities } from "./entities";
import type { ScanResult, ScanStatus } from "./types";

export const TITLE_MIN = 45;
export const TITLE_MAX = 61;
export const DESC_MIN  = 145;
export const DESC_MAX  = 161;
export const MAX_MANUAL_URLS  = 10;
export const MAX_SITEMAP_URLS = 1000;

const FETCH_TIMEOUT_MS = 12000;

const BLOCKED_SIGNALS = [
  "just a moment", "checking your browser", "please wait",
  "ddos protection", "cloudflare", "access denied", "403 forbidden",
  "sign in to continue", "log in to continue", "verify you are human",
  "enable javascript", "bot protection", "security check", "attention required",
];

function looksBlocked(title: string, bodySnippet: string): boolean {
  const haystack = `${title} ${bodySnippet}`.toLowerCase();
  return BLOCKED_SIGNALS.some((s) => haystack.includes(s));
}

function decode(value: string | null): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value).trim();
  return decoded || null;
}

function titleStatus(title: string | null, length: number): "Pass" | "Fail" {
  return title && length >= TITLE_MIN && length <= TITLE_MAX ? "Pass" : "Fail";
}

function descStatus(description: string | null, length: number): "Pass" | "Fail" {
  return description && length >= DESC_MIN && length <= DESC_MAX ? "Pass" : "Fail";
}

function deriveScanStatus(title: string | null, description: string | null, error?: string): ScanStatus {
  if (error) return "scan_error";
  if (!title && !description) return "missing";
  return "success";
}

function parseHtml(html: string): { title: string | null; description: string | null; bodySnippet: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") || null : null;
  const descMatch =
    html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() || null : null;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]{0,2000})/i);
  const bodySnippet = bodyMatch
    ? bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)
    : "";
  return { title, description, bodySnippet };
}

export async function scanUrls(urls: string[], signal?: AbortSignal, noCache = false): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const requestedUrl of urls) {
    if (signal?.aborted) break;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      signal?.addEventListener("abort", () => controller.abort(), { once: true });

      const res = await fetch(requestedUrl, {
        signal: controller.signal,
        cache: noCache ? "no-store" : "default",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PurrScope/1.0)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      clearTimeout(timer);

      if (!res.ok) {
        results.push({ url: requestedUrl, title: null, titleLength: 0, titleStatus: "Fail", description: null, descriptionLength: 0, descriptionStatus: "Fail", scanStatus: "scan_error", methodUsed: "fetch", error: `HTTP ${res.status}`, titleFound: false, descriptionFound: false, attempts: 1 });
        continue;
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html")) {
        results.push({ url: requestedUrl, title: null, titleLength: 0, titleStatus: "Fail", description: null, descriptionLength: 0, descriptionStatus: "Fail", scanStatus: "scan_error", methodUsed: "fetch", error: `Non-HTML (${ct})`, titleFound: false, descriptionFound: false, attempts: 1 });
        continue;
      }

      const html = await res.text();
      const { title: rawTitle, description: rawDesc, bodySnippet } = parseHtml(html);
      const finalUrl = res.url || requestedUrl;

      if (looksBlocked(rawTitle ?? "", bodySnippet)) {
        results.push({ url: requestedUrl, finalUrl, title: null, titleLength: 0, titleStatus: "Fail", description: null, descriptionLength: 0, descriptionStatus: "Fail", scanStatus: "Blocked (automation)", methodUsed: "fetch", titleFound: false, descriptionFound: false, attempts: 1 });
        continue;
      }

      const title = decode(rawTitle);
      const description = decode(rawDesc);
      const titleLength = title?.length ?? 0;
      const descriptionLength = description?.length ?? 0;

      results.push({
        url: requestedUrl, finalUrl,
        title, titleLength, titleStatus: titleStatus(title, titleLength),
        description, descriptionLength, descriptionStatus: descStatus(description, descriptionLength),
        scanStatus: deriveScanStatus(title, description),
        methodUsed: "fetch", titleFound: !!title, descriptionFound: !!description, attempts: 1,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "fetch error";
      results.push({ url: requestedUrl, title: null, titleLength: 0, titleStatus: "Fail", description: null, descriptionLength: 0, descriptionStatus: "Fail", scanStatus: "scan_error", methodUsed: "fetch", error, titleFound: false, descriptionFound: false, attempts: 1 });
    }
  }

  return results;
}