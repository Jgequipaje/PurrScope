"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { RiMoonLine, RiSunLine, RiExternalLinkLine } from "react-icons/ri";
import ModeTabs from "@/components/ModeTabs";
import ManualInput from "@/components/ManualInput";
import SitemapInput from "@/components/SitemapInput";
import SitemapDebug from "@/components/SitemapDebug";
import ScopeSelector from "@/components/ScopeSelector";
import ResultsTable from "@/components/ResultsTable";
import RecentSearches from "@/components/RecentSearches";
import Mascot, { type MascotState } from "@/components/Mascot";
import PageSelector from "@/components/PageSelector";
import LinkScopeSelector from "@/components/LinkScopeSelector";
import LinkResultsTable from "@/components/LinkResultsTable";
import { useTheme, tokens } from "@/lib/theme";
import { loadHistory, saveHistory, addHistoryEntry, clearHistory } from "@/lib/history";
import {
  saveScanResults,
  loadScanResults,
  saveLinkResults,
  loadLinkResults,
  clearScanResults,
  clearLinkResults,
} from "@/lib/resultsCache";
import { isValidUrl, normalizeUrlString, getBaseUrlForSitemapCrawl } from "@/lib/urlValidation";
import { extractDynamicGroups } from "@/lib/sitemapGroups";
import { computeClientFilter, isDPagesSitemap, isStaticSitemap } from "@/lib/filter";
import BenchmarkComparisonTable from "@/components/BenchmarkComparisonTable";
import { computeMetrics, createSnapshot } from "@/scan/benchmarkUtils";
import type { HistoryEntry } from "@/lib/history";
import type { TimerState } from "@/lib/duration";
import type {
  ScanResult,
  Mode,
  SitemapCrawlResult,
  ScanScope,
  LinkCheckResult,
  PageEntry,
} from "@/lib/types";
import type { ScanPipeline, PerformanceMode } from "@/scan/types";
import { DEFAULT_PERFORMANCE_MODE, PERFORMANCE_CONFIGS } from "@/scan/types";
import type { BenchmarkMetrics, BenchmarkRunMode, BenchmarkSnapshot } from "@/scan/benchmarkTypes";

const MAX_MANUAL_URLS = 10;

// ── Styled layout ─────────────────────────────────────────────────────────────

const Main = styled.main<{ $color: string }>`
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  color: ${(p) => p.$color};

  @media (min-width: 640px) {
    padding: 2.5rem 1.5rem;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 1.75rem;
`;

const HeaderText = styled.div``;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
`;

const PageSubtitle = styled.p<{ $color: string }>`
  color: ${(p) => p.$color};
  margin: 0;
`;

const ThemeToggle = styled.button<{ $border: string; $bg: string; $color: string }>`
  margin-top: 4px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: monospace;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  cursor: pointer;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  flex-shrink: 0;
  align-self: flex-start;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.7;
  }
  &:active {
    opacity: 0.5;
  }
`;

const ErrorBanner = styled.div<{ $bg: string; $color: string }>`
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 14px;
  word-break: break-word;
  overflow-wrap: break-word;
`;

const ErrorDetails = styled.details`
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.8;
  & summary {
    cursor: pointer;
    user-select: none;
    display: inline;
  }
  & p {
    margin: 6px 0 0;
    word-break: break-all;
    overflow-wrap: break-word;
    line-height: 1.5;
  }
`;

/** Turns a raw error message into a friendly one-liner + optional detail block. */
function FriendlyError({ message, bg, color }: { message: string; bg: string; color: string }) {
  const isNoSitemap = message.startsWith("No sitemap found");
  const friendly = isNoSitemap ? "No sitemap found for this URL." : message;
  const detail = isNoSitemap ? message : null;

  return (
    <ErrorBanner $bg={bg} $color={color}>
      {friendly}
      {detail && (
        <ErrorDetails>
          <summary>Show details</summary>
          <p>{detail}</p>
        </ErrorDetails>
      )}
    </ErrorBanner>
  );
}

// Summary bar shown between crawl and scan phases
const CrawlSummary = styled.div<{ $bg: string; $border: string; $color: string }>`
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: ${(p) => p.$color};
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const SummaryItem = styled.span<{ $accent: string }>`
  & strong {
    color: ${(p) => p.$accent};
  }
`;

const MascotArea = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;

  @media (min-width: 640px) {
    margin-bottom: 2rem;
  }
`;

// Post-scan completion banner
const ScanCompleteBanner = styled.div<{ $bg: string; $border: string; $color: string }>`
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ScanCompleteActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const SecondaryBtn = styled.button<{ $border: string; $color: string; $bg: string }>`
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  &:not(:disabled):hover {
    opacity: 0.75;
  }
`;

// Collapsible scope controls wrapper with smooth transition
const ScopeControlsWrap = styled.div<{ $visible: boolean }>`
  max-height: ${(p) => (p.$visible ? "600px" : "0")};
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  pointer-events: ${(p) => (p.$visible ? "auto" : "none")};
  transition:
    max-height 0.3s ease,
    opacity 0.25s ease;
`;

const RescanNote = styled.div<{ $color: string; $bg: string; $border: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  padding: 6px 12px;
  margin-bottom: 10px;
`;

const Footer = styled.footer`
  margin-top: 3rem;
  padding-bottom: 1.5rem;
  text-align: center;
  font-size: 11px;
  opacity: 0.45;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.8;
  }
`;

const FooterLink = styled.a`
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  &:hover {
    color: #7c3aed;
    text-decoration: underline;
  }
`;

export default function Home() {
  const { theme, toggle } = useTheme();
  const t = tokens[theme];
  const [mode, setMode] = useState<Mode>("manual");

  const [manualInput, setManualInput] = useState("");
  const [sitemapInput, setSitemapInput] = useState("");

  // ── Link checker state ─────────────────────────────────────────────────────
  const [linkSitemapInput, setLinkSitemapInput] = useState("");
  const [linkCrawlResult, setLinkCrawlResult] = useState<SitemapCrawlResult | null>(null);
  const [linkIsCrawling, setLinkIsCrawling] = useState(false);
  const [linkCrawlError, setLinkCrawlError] = useState<string | null>(null);

  // Page selection state
  const [selectedPageScope, setSelectedPageScope] = useState<"all" | "static" | "dynamic">("all");
  const [selectedDynamicGroups, setSelectedDynamicGroups] = useState<string[]>([]);

  // Link scope state
  const [selectedLinkScope, setSelectedLinkScope] = useState<"internal" | "all">("internal");

  // Link scan state
  const [linkScanResults, setLinkScanResults] = useState<LinkCheckResult[]>([]);
  const [linkScanInProgress, setLinkScanInProgress] = useState(false);
  const [linkScanError, setLinkScanError] = useState<string | null>(null);
  const [linkScanTimer, setLinkScanTimer] = useState<TimerState>({ duration: null, status: null });

  // AbortController refs for link checker
  const linkCrawlAbortRef = useRef<AbortController | null>(null);
  const linkScanAbortRef = useRef<AbortController | null>(null);
  const linkScanSessionRef = useRef(0);
  const linkScanStartRef = useRef<number | null>(null);

  // ── Phase 1: discovery state ───────────────────────────────────────────────
  // crawlResult is the source of truth for all discovered URLs.
  // It is only replaced when the user crawls a new URL — never on filter changes.
  const [crawlResult, setCrawlResult] = useState<SitemapCrawlResult | null>(null);

  // ── Phase 2: filter state ──────────────────────────────────────────────────
  // These drive liveFilter (derived via useMemo) without touching crawlResult.
  const [scope, setScope] = useState<ScanScope>("all");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scanLimit, setScanLimit] = useState<number | "">("");

  const [isCrawling, setIsCrawling] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pipelineUsed, setPipelineUsed] = useState<"previous" | "improved" | null>(null);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(DEFAULT_PERFORMANCE_MODE);
  const [benchmarkRunMode, setBenchmarkRunMode] = useState<BenchmarkRunMode>("cold");
  const [benchmarkSnapshot, setBenchmarkSnapshot] = useState<BenchmarkSnapshot | null>(null);

  // Benchmark state — stored per pipeline so both can accumulate independently
  const [benchPrevious, setBenchPrevious] = useState<BenchmarkMetrics | null>(null);
  const [benchImproved, setBenchImproved] = useState<BenchmarkMetrics | null>(null);
  const [prevResults, setPrevResults] = useState<ScanResult[]>([]);
  const [imprResults, setImprResults] = useState<ScanResult[]>([]);

  // Scan execution timer
  const [scanTimer, setScanTimer] = useState<TimerState>({ duration: null, status: null });
  const scanStartRef = useRef<number | null>(null);

  // Post-scan UI state — collapse setup controls after scan completes
  const [showScopeControls, setShowScopeControls] = useState(true);
  const [scopeChangedAfterScan, setScopeChangedAfterScan] = useState(false);

  // AbortController refs — one per cancellable operation
  const crawlAbortRef = useRef<AbortController | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  // Session counter — incremented on each new scan so stale responses are ignored
  const scanSessionRef = useRef(0);

  const isProcessing = isCrawling || isScanning || linkIsCrawling || linkScanInProgress;

  // ── Derived state ──────────────────────────────────────────────────────────
  // liveFilter is computed instantly from crawlResult + scope + selectedGroups.
  // No useEffect, no setState — changing scope or exclusions updates this in one render.
  const dynamicGroups = useMemo(
    () => extractDynamicGroups(crawlResult?.sitemapUrls ?? []),
    [crawlResult]
  );

  const liveFilter = useMemo(() => {
    if (!crawlResult) return null;
    return computeClientFilter(
      crawlResult.pageEntries,
      scope,
      scope === "dynamic" ? selectedGroups : []
    );
  }, [crawlResult, scope, selectedGroups]);

  const availableCount = liveFilter?.totalAfterFiltering ?? 0;

  // Clamp scanLimit when the filtered count shrinks (e.g. scope change)
  useEffect(() => {
    if (scanLimit !== "" && availableCount > 0 && scanLimit > availableCount) {
      setScanLimit(availableCount);
    } else if (availableCount === 0 && scanLimit !== "") {
      setScanLimit("");
    }
  }, [availableCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load history after mount to avoid SSR mismatch
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Load cached results when mode changes
  useEffect(() => {
    console.log("[useEffect] Mode changed to:", mode);

    if (mode === "manual" || mode === "sitemap") {
      const cached = loadScanResults(mode);
      if (cached) {
        console.log(
          `[useEffect] Restoring ${mode} scan results:`,
          cached.results.length,
          "results"
        );
        setResults(cached.results);
        setScanTimer(cached.timer);
      } else {
        console.log(`[useEffect] No cached ${mode} results, clearing state`);
        // No cached results - clear state
        setResults([]);
        setScanTimer({ duration: null, status: null });
      }
    } else if (mode === "links") {
      const cached = loadLinkResults();
      if (cached) {
        console.log("[useEffect] Restoring link results:", {
          resultsCount: cached.results.length,
          hasCrawlResult: !!cached.crawlResult,
          sitemapInput: cached.sitemapInput,
        });
        setLinkScanResults(cached.results);
        setLinkScanTimer(cached.timer);
        setLinkCrawlResult(cached.crawlResult);
        setLinkSitemapInput(cached.sitemapInput);
      } else {
        console.log("[useEffect] No cached link results, clearing state");
        // No cached results - clear state
        setLinkScanResults([]);
        setLinkScanTimer({ duration: null, status: null });
        setLinkCrawlResult(null);
        setLinkSitemapInput("");
      }
    }
  }, [mode]);

  function pushHistory(updated: HistoryEntry[]) {
    setHistory(updated);
    saveHistory(updated);
  }

  function handleModeChange(next: Mode) {
    if (isProcessing) return;
    setMode(next);
    // Clear crawl state on mode switch (but not link checker state - that's preserved in cache)
    setCrawlResult(null);
    setError(null);
    setLinkCrawlError(null);
    setLinkScanError(null);
    // Note: Don't clear results here - let useEffect load cached results
  }

  // Called only when the sitemap URL input changes — clears crawl + scan state
  // so stale results from a previous URL don't linger.
  function handleSitemapUrlChange() {
    setCrawlResult(null);
    setResults([]);
    setError(null);
    setBenchPrevious(null);
    setBenchImproved(null);
    setPrevResults([]);
    setImprResults([]);
    setPipelineUsed(null);
    setBenchmarkSnapshot(null);
    setSelectedGroups([]);
    setShowScopeControls(true);
    setScopeChangedAfterScan(false);
  }

  function resetBenchmark() {
    setBenchPrevious(null);
    setBenchImproved(null);
    setPrevResults([]);
    setImprResults([]);
    setPipelineUsed(null);
    setBenchmarkSnapshot(null);
  }

  // ── Manual scan ────────────────────────────────────────────────────────────

  async function handleManualScan() {
    const urls = manualInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, MAX_MANUAL_URLS);
    if (urls.length === 0) return;
    pushHistory(addHistoryEntry(history, "manual", manualInput.trim()));

    const abort = new AbortController();
    scanAbortRef.current = abort;
    const sessionId = ++scanSessionRef.current;
    scanStartRef.current = Date.now();
    setScanTimer({ duration: null, status: null });
    setIsScanning(true);
    setResults([]);
    setError(null);
    // Clear cached results when starting new scan
    clearScanResults("manual");
    try {
      const { results: data } = await callScanApi(
        urls,
        undefined,
        abort.signal,
        "/api/scan-improved",
        performanceMode
      );
      if (sessionId === scanSessionRef.current && !abort.signal.aborted) {
        setResults(data);
        const timer = {
          duration: Date.now() - (scanStartRef.current ?? Date.now()),
          status: "completed" as const,
        };
        setScanTimer(timer);
        // Save results to cache
        saveScanResults("manual", data, timer);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (sessionId === scanSessionRef.current)
          setScanTimer({
            duration: Date.now() - (scanStartRef.current ?? Date.now()),
            status: "cancelled",
          });
      } else if (sessionId === scanSessionRef.current) {
        setScanTimer({
          duration: Date.now() - (scanStartRef.current ?? Date.now()),
          status: "failed",
        });
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      if (sessionId === scanSessionRef.current) {
        setIsScanning(false);
        scanAbortRef.current = null;
      }
    }
  }

  function handleCancelScan() {
    scanAbortRef.current?.abort();
  }

  // ── Sitemap crawl (Phase 1) ────────────────────────────────────────────────
  // Fetches all URLs once and stores them in crawlResult.
  // Always crawls with scope="all" so the full dataset is available for client-side filtering.

  async function handleDiscover() {
    if (!sitemapInput) return;
    if (!isValidUrl(sitemapInput)) return;
    const crawlUrl = getBaseUrlForSitemapCrawl(sitemapInput) ?? normalizeUrlString(sitemapInput);
    pushHistory(addHistoryEntry(history, "url", crawlUrl));

    const abort = new AbortController();
    crawlAbortRef.current = abort;
    setIsCrawling(true);
    setCrawlResult(null);
    setResults([]);
    setError(null);
    setSelectedGroups([]);
    try {
      const res = await fetch("/api/sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Always fetch all URLs — scope filtering is done client-side from this result
        body: JSON.stringify({ url: crawlUrl, scope: "all", excludePatterns: [] }),
        signal: abort.signal,
      });
      const data: SitemapCrawlResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load sitemap.");
      setCrawlResult(data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setIsCrawling(false);
      crawlAbortRef.current = null;
    }
  }

  function handleCancelCrawl() {
    crawlAbortRef.current?.abort();
  }

  // ── Scan discovered pages (Phase 2) ───────────────────────────────────────
  // Uses liveFilter (derived from current scope + exclusions) as the URL list.
  // A benchmark snapshot is frozen at scan-start so both pipelines use identical inputs.

  async function handleScanDiscovered(pipeline: ScanPipeline = "improved") {
    if (!crawlResult || !liveFilter) return;

    const limit = scanLimit !== "" ? scanLimit : undefined;

    // Reuse the existing snapshot ONLY if it matches the current filter config —
    // this ensures benchmark comparisons use identical inputs across both pipelines.
    // If scope, exclusions, or limit changed, always create a fresh snapshot.
    const snapshotMatches =
      benchmarkSnapshot &&
      benchmarkSnapshot.scanScope === scope &&
      benchmarkSnapshot.scanLimit === (limit ?? null) &&
      JSON.stringify(benchmarkSnapshot.exclusions) === JSON.stringify(selectedGroups);

    const snapshot = snapshotMatches
      ? benchmarkSnapshot!
      : createSnapshot(liveFilter.includedUrls, scope, limit ?? null, selectedGroups);

    if (!snapshotMatches) setBenchmarkSnapshot(snapshot);

    const urlsToScan = snapshot.urls;

    const abort = new AbortController();
    scanAbortRef.current = abort;
    const sessionId = ++scanSessionRef.current;
    scanStartRef.current = Date.now();
    setScanTimer({ duration: null, status: null });
    setPipelineUsed(null);
    setIsScanning(true);
    setResults([]);
    setError(null);
    // Clear cached results when starting new scan
    clearScanResults("sitemap");
    try {
      const apiRoute = pipeline === "improved" ? "/api/scan-improved" : "/api/scan";
      const perfMode = pipeline === "improved" ? performanceMode : undefined;
      const { results: data, durationMs } = await callScanApi(
        urlsToScan,
        limit,
        abort.signal,
        apiRoute,
        perfMode,
        benchmarkRunMode
      );
      if (sessionId === scanSessionRef.current && !abort.signal.aborted) {
        setResults(data);
        setPipelineUsed(pipeline);
        const timer = {
          duration: Date.now() - (scanStartRef.current ?? Date.now()),
          status: "completed" as const,
        };
        setScanTimer(timer);
        // Save results to cache
        saveScanResults("sitemap", data, timer);
        setShowScopeControls(false);
        setScopeChangedAfterScan(false);

        const metrics = computeMetrics(
          pipeline,
          data,
          durationMs || Date.now() - (scanStartRef.current ?? Date.now()),
          {
            urlsQueued: snapshot.queueSize,
            scanScope: scope,
            scanLimit: limit ?? null,
            concurrency:
              pipeline === "improved" ? PERFORMANCE_CONFIGS[performanceMode].concurrency : null,
            browserReuse: true,
            performanceMode: pipeline === "improved" ? performanceMode : null,
            runMode: benchmarkRunMode,
          }
        );
        if (pipeline === "previous") {
          setBenchPrevious(metrics);
          setPrevResults(data);
        } else {
          setBenchImproved(metrics);
          setImprResults(data);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (sessionId === scanSessionRef.current)
          setScanTimer({
            duration: Date.now() - (scanStartRef.current ?? Date.now()),
            status: "cancelled",
          });
      } else if (sessionId === scanSessionRef.current) {
        setScanTimer({
          duration: Date.now() - (scanStartRef.current ?? Date.now()),
          status: "failed",
        });
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      if (sessionId === scanSessionRef.current) {
        setIsScanning(false);
        scanAbortRef.current = null;
      }
    }
  }

  function handleHistorySelect(entry: HistoryEntry) {
    if (isProcessing) return;
    if (entry.type === "url") {
      setMode("sitemap");
      setSitemapInput(entry.value);
    } else {
      setMode("manual");
      setManualInput(entry.value);
    }
    handleSitemapUrlChange();
  }

  function handleHistoryClear() {
    clearHistory();
    setHistory([]);
  }

  // ── Link checker handlers ──────────────────────────────────────────────────

  // Called when the link sitemap URL input changes — clears crawl + scan state
  function handleLinkSitemapUrlChange() {
    setLinkCrawlResult(null);
    setLinkScanResults([]);
    setLinkCrawlError(null);
    setLinkScanError(null);
    setSelectedPageScope("all");
    setSelectedDynamicGroups([]);
    setSelectedLinkScope("internal");
  }

  // Sitemap crawl handler for link checker (Task 9.2)
  async function handleLinkSitemapCrawl() {
    if (!linkSitemapInput) return;
    if (!isValidUrl(linkSitemapInput)) return;
    const crawlUrl =
      getBaseUrlForSitemapCrawl(linkSitemapInput) ?? normalizeUrlString(linkSitemapInput);
    pushHistory(addHistoryEntry(history, "url", crawlUrl));

    const abort = new AbortController();
    linkCrawlAbortRef.current = abort;
    setLinkIsCrawling(true);
    setLinkCrawlResult(null);
    setLinkScanResults([]);
    setLinkCrawlError(null);
    setLinkScanError(null);
    setSelectedDynamicGroups([]);

    try {
      const res = await fetch("/api/sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl, scope: "all", excludePatterns: [] }),
        signal: abort.signal,
      });
      const data: SitemapCrawlResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load sitemap.");
      setLinkCrawlResult(data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setLinkCrawlError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setLinkIsCrawling(false);
      linkCrawlAbortRef.current = null;
    }
  }

  function handleCancelLinkCrawl() {
    linkCrawlAbortRef.current?.abort();
  }

  // Derive dynamic groups from link crawl result
  const linkDynamicGroups = useMemo(
    () => extractDynamicGroups(linkCrawlResult?.sitemapUrls ?? []),
    [linkCrawlResult]
  );

  // Get selected pages based on scope and groups
  const selectedPagesForLinkScan = useMemo(() => {
    if (!linkCrawlResult) return [];

    const { pageUrls, pageEntries } = linkCrawlResult;

    // Early return for "all" scope - no filtering needed
    if (selectedPageScope === "all") {
      return pageUrls;
    }

    if (selectedPageScope === "static") {
      // Static pages are those from sitemap-static.xml
      return pageEntries
        .filter((entry) => isStaticSitemap(entry.sourceSitemap))
        .map((entry) => entry.url);
    }

    if (selectedPageScope === "dynamic") {
      if (selectedDynamicGroups.length === 0) {
        // All dynamic pages - those from *-dpages.xml sitemaps
        return pageEntries
          .filter((entry) => isDPagesSitemap(entry.sourceSitemap))
          .map((entry) => entry.url);
      }

      // Only pages from selected groups - match by sourceSitemap
      const selectedSitemapUrls = new Set(selectedDynamicGroups);
      return pageEntries
        .filter((entry) => selectedSitemapUrls.has(entry.sourceSitemap))
        .map((entry) => entry.url);
    }

    return [];
  }, [linkCrawlResult, selectedPageScope, selectedDynamicGroups, linkDynamicGroups]);

  // Link scan handler (Task 9.3)
  async function handleLinkScan() {
    if (!linkCrawlResult || selectedPagesForLinkScan.length === 0) return;

    const abort = new AbortController();
    linkScanAbortRef.current = abort;
    const sessionId = ++linkScanSessionRef.current;
    linkScanStartRef.current = Date.now();
    setLinkScanTimer({ duration: null, status: null });
    setLinkScanInProgress(true);
    setLinkScanResults([]);
    setLinkScanError(null);
    // Clear cached results when starting new scan
    clearLinkResults();

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: linkSitemapInput,
          pageUrls: selectedPagesForLinkScan,
          linkScope: selectedLinkScope,
          concurrency: 5,
          timeout: 10000,
        }),
        signal: abort.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Link validation failed.");

      if (sessionId === linkScanSessionRef.current && !abort.signal.aborted) {
        setLinkScanResults(data.links);
        const timer = {
          duration: Date.now() - (linkScanStartRef.current ?? Date.now()),
          status: "completed" as const,
        };
        setLinkScanTimer(timer);
        // Save results to cache (including crawl result and sitemap input)
        saveLinkResults(data.links, timer, linkCrawlResult, linkSitemapInput);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (sessionId === linkScanSessionRef.current)
          setLinkScanTimer({
            duration: Date.now() - (linkScanStartRef.current ?? Date.now()),
            status: "cancelled",
          });
      } else if (sessionId === linkScanSessionRef.current) {
        setLinkScanTimer({
          duration: Date.now() - (linkScanStartRef.current ?? Date.now()),
          status: "failed",
        });
        setLinkScanError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      if (sessionId === linkScanSessionRef.current) {
        setLinkScanInProgress(false);
        linkScanAbortRef.current = null;
      }
    }
  }

  // Scan cancellation handler (Task 9.4)
  function handleLinkScanCancel() {
    linkScanAbortRef.current?.abort();
  }

  async function callScanApi(
    urls: string[],
    limit?: number,
    signal?: AbortSignal,
    route = "/api/scan-improved",
    perfMode?: PerformanceMode,
    runMode?: BenchmarkRunMode
  ): Promise<{ results: ScanResult[]; durationMs: number }> {
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls,
        ...(limit !== undefined ? { limit } : {}),
        ...(perfMode !== undefined ? { performanceMode: perfMode } : {}),
        ...(runMode !== undefined ? { runMode } : {}),
      }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Scan failed.");
    return {
      results: data.results as ScanResult[],
      durationMs: typeof data.durationMs === "number" ? data.durationMs : 0,
    };
  }

  // Derive mascot state from current scan/results state
  const mascotState: MascotState =
    isScanning || isCrawling || linkIsCrawling || linkScanInProgress
      ? "scanning"
      : results.length > 0
        ? results.some(
            (r) =>
              r.titleStatus === "Fail" ||
              r.descriptionStatus === "Fail" ||
              r.scanStatus === "Blocked (automation)" ||
              r.error
          )
          ? "fail"
          : "pass"
        : linkScanResults.length > 0
          ? linkScanResults.some(
              (r) => r.status !== "success" || r.issues.some((i) => i.severity === "error")
            )
            ? "fail"
            : "pass"
          : "idle";

  return (
    <Main data-testid="main-page" $color={t.text}>
      <HeaderRow>
        <HeaderText>
          <PageTitle data-testid="page-title">PurrScope</PageTitle>
          <PageSubtitle data-testid="page-subtitle" $color={t.textMuted}>
            Automated SEO &amp; Compliance QA
          </PageSubtitle>
        </HeaderText>
        <ThemeToggle
          data-testid="theme-toggle"
          className="theme-toggle"
          onClick={toggle}
          title="Toggle light/dark mode"
          $border={t.border}
          $bg={t.bgMuted}
          $color={t.text}
        >
          {theme === "light" ? (
            <>
              <RiMoonLine size={14} /> Dark
            </>
          ) : (
            <>
              <RiSunLine size={14} /> Light
            </>
          )}
        </ThemeToggle>
      </HeaderRow>

      <MascotArea data-testid="mascot-area">
        <Mascot state={mascotState} size={110} />
      </MascotArea>

      <ModeTabs mode={mode} onChange={handleModeChange} disabled={isProcessing} />

      <RecentSearches
        entries={history}
        onSelect={handleHistorySelect}
        onClear={handleHistoryClear}
      />

      {mode === "manual" && (
        <ManualInput
          value={manualInput}
          onChange={setManualInput}
          onScan={handleManualScan}
          loading={isScanning}
          onCancel={handleCancelScan}
          isProcessing={isProcessing}
        />
      )}

      {mode === "sitemap" && (
        <>
          {/* Phase 1: URL input + crawl button only — no scope controls here */}
          <SitemapInput
            value={sitemapInput}
            onChange={setSitemapInput}
            onScan={handleDiscover}
            loading={isCrawling}
            onCancel={handleCancelCrawl}
            isScanning={isScanning}
            onInputChange={handleSitemapUrlChange}
          />

          {/* Phase 2: filter controls — only shown after a successful crawl.
              Scope and exclusion changes update liveFilter instantly via useMemo. */}
          {crawlResult && (
            <>
              {/* Post-scan completion banner — shown once results exist */}
              {results.length > 0 && !isScanning ? (
                <ScanCompleteBanner $bg={t.successBg} $border={t.passText} $color={t.successText}>
                  <span>Scan complete — review the results below.</span>
                  <ScanCompleteActions>
                    <SecondaryBtn
                      $border={t.border}
                      $color={t.textMuted}
                      $bg={t.bgMuted}
                      onClick={() => setShowScopeControls((v) => !v)}
                    >
                      {showScopeControls ? "Hide Scan Scope" : "Change Scan Scope"}
                    </SecondaryBtn>
                    <SecondaryBtn
                      $border={t.accent}
                      $color={t.accent}
                      $bg="transparent"
                      onClick={() => {
                        setShowScopeControls(true);
                        setScopeChangedAfterScan(false);
                        handleScanDiscovered("improved");
                      }}
                    >
                      Run New Scan
                    </SecondaryBtn>
                  </ScanCompleteActions>
                </ScanCompleteBanner>
              ) : (
                /* Pre-scan crawl summary */
                <CrawlSummary $bg={t.bgSubtle} $border={t.border} $color={t.textMuted}>
                  <SummaryItem $accent={t.infoText}>
                    <strong>{crawlResult.pageCount}</strong> pages discovered
                  </SummaryItem>
                  <SummaryItem $accent={t.passText}>
                    <strong>{availableCount}</strong> pages selected for scanning
                  </SummaryItem>
                </CrawlSummary>
              )}

              {/* Scope selector + dynamic exclusions — collapsible after scan */}
              <ScopeControlsWrap $visible={showScopeControls || results.length === 0}>
                {scopeChangedAfterScan && results.length > 0 && (
                  <RescanNote $color={t.warnText} $bg={t.warnBg} $border={t.border}>
                    Scope changed — run a new scan to update results.
                  </RescanNote>
                )}
                <ScopeSelector
                  scope={scope}
                  onScopeChange={(s) => {
                    setScope(s);
                    if (s !== "dynamic") setSelectedGroups([]);
                    if (results.length > 0) setScopeChangedAfterScan(true);
                  }}
                  dynamicGroups={dynamicGroups}
                  selectedGroups={selectedGroups}
                  onSelectedGroupsChange={(g) => {
                    setSelectedGroups(g);
                    if (results.length > 0) setScopeChangedAfterScan(true);
                  }}
                  disabled={isProcessing}
                />
              </ScopeControlsWrap>
            </>
          )}
        </>
      )}

      {mode === "links" && (
        <>
          {/* Phase 1: URL input + crawl button */}
          <SitemapInput
            value={linkSitemapInput}
            onChange={setLinkSitemapInput}
            onScan={handleLinkSitemapCrawl}
            loading={linkIsCrawling}
            onCancel={handleCancelLinkCrawl}
            isScanning={linkScanInProgress}
            onInputChange={handleLinkSitemapUrlChange}
          />

          {/* Phase 2: Page selection after successful crawl */}
          {linkCrawlResult && (
            <>
              {/* Crawl summary */}
              {linkScanResults.length === 0 && !linkScanInProgress && (
                <CrawlSummary $bg={t.bgSubtle} $border={t.border} $color={t.textMuted}>
                  <SummaryItem $accent={t.infoText}>
                    <strong>{linkCrawlResult.pageCount}</strong> pages discovered
                  </SummaryItem>
                  <SummaryItem $accent={t.passText}>
                    <strong>{selectedPagesForLinkScan.length}</strong> pages selected for scanning
                  </SummaryItem>
                </CrawlSummary>
              )}

              {/* Page selector */}
              {linkScanResults.length === 0 && !linkScanInProgress && (
                <PageSelector
                  pageEntries={linkCrawlResult.pageEntries}
                  dynamicGroups={linkDynamicGroups}
                  selectedScope={selectedPageScope}
                  selectedGroups={selectedDynamicGroups}
                  onScopeChange={setSelectedPageScope}
                  onGroupsChange={setSelectedDynamicGroups}
                  disabled={isProcessing}
                />
              )}

              {/* Link scope selector */}
              {linkScanResults.length === 0 &&
                !linkScanInProgress &&
                selectedPagesForLinkScan.length > 0 && (
                  <LinkScopeSelector
                    scope={selectedLinkScope}
                    onChange={setSelectedLinkScope}
                    disabled={isProcessing}
                  />
                )}

              {/* Scan button */}
              {linkScanResults.length === 0 &&
                !linkScanInProgress &&
                selectedPagesForLinkScan.length > 0 && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <SecondaryBtn
                      $border={t.accent}
                      $color={t.accent}
                      $bg="transparent"
                      onClick={handleLinkScan}
                      disabled={isProcessing}
                    >
                      Start Link Scan
                    </SecondaryBtn>
                  </div>
                )}

              {/* Progress indicator during scan (Task 9.5) */}
              {linkScanInProgress && (
                <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", color: t.textMuted, marginBottom: "8px" }}>
                    Scanning {selectedPagesForLinkScan.length} page
                    {selectedPagesForLinkScan.length !== 1 ? "s" : ""} for links...
                  </div>
                  <SecondaryBtn
                    $border={t.border}
                    $color={t.textMuted}
                    $bg={t.bgMuted}
                    onClick={handleLinkScanCancel}
                  >
                    Cancel Scan
                  </SecondaryBtn>
                </div>
              )}

              {/* Results table after scan completion */}
              {linkScanResults.length > 0 && (
                <>
                  <ScanCompleteBanner $bg={t.successBg} $border={t.passText} $color={t.successText}>
                    <span>Link scan complete — review the results below.</span>
                    <ScanCompleteActions>
                      <SecondaryBtn
                        $border={t.accent}
                        $color={t.accent}
                        $bg="transparent"
                        onClick={() => {
                          setLinkScanResults([]);
                          setLinkScanError(null);
                        }}
                      >
                        Run New Scan
                      </SecondaryBtn>
                    </ScanCompleteActions>
                  </ScanCompleteBanner>
                  <LinkResultsTable results={linkScanResults} scanTimer={linkScanTimer} />
                </>
              )}
            </>
          )}

          {/* Results table from cache (when crawl result is not available) */}
          {!linkCrawlResult && linkScanResults.length > 0 && (
            <>
              <ScanCompleteBanner $bg={t.successBg} $border={t.passText} $color={t.successText}>
                <span>Link scan complete — review the results below.</span>
                <ScanCompleteActions>
                  <SecondaryBtn
                    $border={t.accent}
                    $color={t.accent}
                    $bg="transparent"
                    onClick={() => {
                      setLinkScanResults([]);
                      setLinkScanError(null);
                      clearLinkResults();
                    }}
                  >
                    Run New Scan
                  </SecondaryBtn>
                </ScanCompleteActions>
              </ScanCompleteBanner>
              <LinkResultsTable results={linkScanResults} scanTimer={linkScanTimer} />
            </>
          )}
        </>
      )}

      {error && (
        <div data-testid="error-banner">
          <FriendlyError message={error} bg={t.failBg} color={t.failText} />
        </div>
      )}

      {linkCrawlError && mode === "links" && (
        <div data-testid="link-crawl-error-banner">
          <FriendlyError message={linkCrawlError} bg={t.failBg} color={t.failText} />
        </div>
      )}

      {linkScanError && mode === "links" && (
        <div data-testid="link-scan-error-banner">
          <FriendlyError message={linkScanError} bg={t.failBg} color={t.failText} />
        </div>
      )}

      {/* SitemapDebug — shown before scan, and when scope controls are expanded post-scan */}
      {mode === "sitemap" &&
        crawlResult &&
        liveFilter &&
        (results.length === 0 || showScopeControls) && (
          <SitemapDebug
            crawl={crawlResult}
            filter={liveFilter}
            onScan={() => handleScanDiscovered("previous")}
            onScanImproved={() => handleScanDiscovered("improved")}
            scanning={isScanning}
            onCancel={handleCancelScan}
            scanLimit={scanLimit}
            onScanLimitChange={setScanLimit}
            maxScanLimit={availableCount}
            pipelineUsed={pipelineUsed}
            performanceMode={performanceMode}
            onPerformanceModeChange={setPerformanceMode}
            benchmarkRunMode={benchmarkRunMode}
            onBenchmarkRunModeChange={setBenchmarkRunMode}
            onResetBenchmark={resetBenchmark}
            hasBenchmarkData={!!(benchPrevious || benchImproved)}
          />
        )}

      {/* SEO scan results table - only show for manual and sitemap modes */}
      {(mode === "manual" || mode === "sitemap") && results.length > 0 && (
        <ResultsTable results={results} scanTimer={scanTimer} />
      )}

      {/* Benchmark table hidden — set to true to re-enable */}
      {false && (benchPrevious || benchImproved) && (
        <BenchmarkComparisonTable
          previous={benchPrevious}
          improved={benchImproved}
          previousResults={prevResults}
          improvedResults={imprResults}
          onReset={resetBenchmark}
        />
      )}

      <Footer>
        Made{"  "}
        <FooterLink href="https://www.byjeff.dev/" target="_blank" rel="noreferrer">
          byjeff.dev <RiExternalLinkLine size={10} />
        </FooterLink>
      </Footer>
    </Main>
  );
}
