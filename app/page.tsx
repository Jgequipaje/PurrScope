"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { RiMoonLine, RiSunLine } from "react-icons/ri";
import ModeTabs from "@/components/ModeTabs";
import ManualInput from "@/components/ManualInput";
import SitemapInput from "@/components/SitemapInput";
import SitemapDebug from "@/components/SitemapDebug";
import ScopeSelector from "@/components/ScopeSelector";
import ResultsTable from "@/components/ResultsTable";
import RecentSearches from "@/components/RecentSearches";
import { useTheme, tokens } from "@/lib/theme";
import { loadHistory, saveHistory, addHistoryEntry, clearHistory } from "@/lib/history";
import { isValidUrl, normalizeUrlString, getBaseUrlForSitemapCrawl } from "@/lib/urlValidation";
import { extractDynamicGroups } from "@/lib/sitemapGroups";
import { computeClientFilter } from "@/lib/filter";
import BenchmarkComparisonTable from "@/components/BenchmarkComparisonTable";
import { computeMetrics, createSnapshot } from "@/scan/benchmarkUtils";
import type { HistoryEntry } from "@/lib/history";
import type { TimerState } from "@/lib/duration";
import type { ScanResult, Mode, SitemapCrawlResult, ScanScope } from "@/lib/types";
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
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${(p) => p.$border};
  cursor: pointer;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  flex-shrink: 0;
  align-self: flex-start;
  white-space: nowrap;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  &:hover { opacity: 0.8; }
  &:active { opacity: 0.65; }
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
  & strong { color: ${(p) => p.$accent}; }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggle } = useTheme();
  const t = tokens[theme];
  const [mode, setMode] = useState<Mode>("manual");

  const [manualInput, setManualInput] = useState("");
  const [sitemapInput, setSitemapInput] = useState("");

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

  // AbortController refs — one per cancellable operation
  const crawlAbortRef = useRef<AbortController | null>(null);
  const scanAbortRef  = useRef<AbortController | null>(null);
  // Session counter — incremented on each new scan so stale responses are ignored
  const scanSessionRef = useRef(0);

  const isProcessing = isCrawling || isScanning;

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
  useEffect(() => { setHistory(loadHistory()); }, []);

  function pushHistory(updated: HistoryEntry[]) {
    setHistory(updated);
    saveHistory(updated);
  }

  function handleModeChange(next: Mode) {
    if (isProcessing) return;
    setMode(next);
    // Only clear crawl state on mode switch, not on filter changes
    setCrawlResult(null);
    setResults([]);
    setError(null);
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
    const urls = manualInput.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, MAX_MANUAL_URLS);
    if (urls.length === 0) return;
    pushHistory(addHistoryEntry(history, "manual", manualInput.trim()));

    const abort = new AbortController();
    scanAbortRef.current = abort;
    const sessionId = ++scanSessionRef.current;
    scanStartRef.current = Date.now();
    setScanTimer({ duration: null, status: null });
    setIsScanning(true); setResults([]); setError(null);
    try {
      const { results: data } = await callScanApi(urls, undefined, abort.signal, "/api/scan-improved", performanceMode);
      if (sessionId === scanSessionRef.current && !abort.signal.aborted) {
        setResults(data);
        setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "completed" });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (sessionId === scanSessionRef.current)
          setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "cancelled" });
      } else if (sessionId === scanSessionRef.current) {
        setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "failed" });
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
    setIsCrawling(true); setCrawlResult(null); setResults([]); setError(null);
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
    const snapshotMatches = benchmarkSnapshot
      && benchmarkSnapshot.scanScope === scope
      && benchmarkSnapshot.scanLimit === (limit ?? null)
      && JSON.stringify(benchmarkSnapshot.exclusions) === JSON.stringify(selectedGroups);

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
    setIsScanning(true); setResults([]); setError(null);
    try {
      const apiRoute = pipeline === "improved" ? "/api/scan-improved" : "/api/scan";
      const perfMode = pipeline === "improved" ? performanceMode : undefined;
      const { results: data, durationMs } = await callScanApi(urlsToScan, limit, abort.signal, apiRoute, perfMode, benchmarkRunMode);
      if (sessionId === scanSessionRef.current && !abort.signal.aborted) {
        setResults(data);
        setPipelineUsed(pipeline);
        setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "completed" });

        const metrics = computeMetrics(pipeline, data, durationMs || (Date.now() - (scanStartRef.current ?? Date.now())), {
          urlsQueued: snapshot.queueSize,
          scanScope: scope,
          scanLimit: limit ?? null,
          concurrency: pipeline === "improved" ? PERFORMANCE_CONFIGS[performanceMode].concurrency : null,
          browserReuse: true,
          performanceMode: pipeline === "improved" ? performanceMode : null,
          runMode: benchmarkRunMode,
        });
        if (pipeline === "previous") { setBenchPrevious(metrics); setPrevResults(data); }
        else { setBenchImproved(metrics); setImprResults(data); }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (sessionId === scanSessionRef.current)
          setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "cancelled" });
      } else if (sessionId === scanSessionRef.current) {
        setScanTimer({ duration: Date.now() - (scanStartRef.current ?? Date.now()), status: "failed" });
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
    if (entry.type === "url") { setMode("sitemap"); setSitemapInput(entry.value); }
    else { setMode("manual"); setManualInput(entry.value); }
    handleSitemapUrlChange();
  }

  function handleHistoryClear() {
    clearHistory();
    setHistory([]);
  }

  async function callScanApi(
    urls: string[], limit?: number, signal?: AbortSignal, route = "/api/scan-improved", perfMode?: PerformanceMode, runMode?: BenchmarkRunMode
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

  return (
    <Main $color={t.text}>
      <HeaderRow>
        <HeaderText>
          <PageTitle>PurrScope</PageTitle>
          <PageSubtitle $color={t.textMuted}>
            Automated SEO &amp; Compliance QA
          </PageSubtitle>
        </HeaderText>
        <ThemeToggle onClick={toggle} title="Toggle light/dark mode" $border={t.border} $bg={t.bgMuted} $color={t.text}>
          {theme === "light" ? <><RiMoonLine size={14} /> Dark</> : <><RiSunLine size={14} /> Light</>}
        </ThemeToggle>
      </HeaderRow>

      <ModeTabs mode={mode} onChange={handleModeChange} disabled={isProcessing} />

      <RecentSearches entries={history} onSelect={handleHistorySelect} onClear={handleHistoryClear} />

      {mode === "manual" && (
        <ManualInput value={manualInput} onChange={setManualInput} onScan={handleManualScan} loading={isScanning} onCancel={handleCancelScan} isProcessing={isProcessing} />
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
              {/* Crawl summary — persists across scope/exclusion changes */}
              <CrawlSummary $bg={t.bgSubtle} $border={t.border} $color={t.textMuted}>
                <SummaryItem $accent={t.infoText}>
                  <strong>{crawlResult.pageCount}</strong> pages discovered
                </SummaryItem>
                <SummaryItem $accent={t.passText}>
                  <strong>{availableCount}</strong> pages selected for scanning
                </SummaryItem>
              </CrawlSummary>

              {/* Scope selector + dynamic exclusions — purely client-side filtering */}
              <ScopeSelector
                scope={scope}
                onScopeChange={(s) => { setScope(s); if (s !== "dynamic") setSelectedGroups([]); }}
                dynamicGroups={dynamicGroups}
                selectedGroups={selectedGroups}
                onSelectedGroupsChange={setSelectedGroups}
                disabled={isProcessing}
              />
            </>
          )}
        </>
      )}

      {error && <FriendlyError message={error} bg={t.failBg} color={t.failText} />}

      {/* SitemapDebug stays visible as long as crawlResult exists — filter changes don't hide it */}
      {mode === "sitemap" && crawlResult && liveFilter && (
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

      {results.length > 0 && <ResultsTable results={results} scanTimer={scanTimer} />}

      {(benchPrevious || benchImproved) && (
        <BenchmarkComparisonTable
          previous={benchPrevious}
          improved={benchImproved}
          previousResults={prevResults}
          improvedResults={imprResults}
          onReset={resetBenchmark}
        />
      )}
    </Main>
  );
}
