"use client";

import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { RiMoonLine, RiSunLine } from "react-icons/ri";
import ModeTabs from "@/components/ModeTabs";
import ManualInput from "@/components/ManualInput";
import SitemapInput from "@/components/SitemapInput";
import SitemapDebug from "@/components/SitemapDebug";
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
  padding: 2.5rem 1.5rem;
  color: ${(p) => p.$color};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggle } = useTheme();
  const t = tokens[theme];
  const [mode, setMode] = useState<Mode>("manual");

  const [manualInput, setManualInput] = useState("");
  const [sitemapInput, setSitemapInput] = useState("");
  const [scope, setScope] = useState<ScanScope>("all");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scanLimit, setScanLimit] = useState<number | "">("");
  const [crawlResult, setCrawlResult] = useState<SitemapCrawlResult | null>(null);

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

  // True whenever any async process is running — used to lock mode tabs + crawl button
  const isProcessing = isCrawling || isScanning;

  // Load history after mount to avoid SSR mismatch
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);

  function pushHistory(updated: HistoryEntry[]) {
    setHistory(updated);
    saveHistory(updated);
  }

  function handleModeChange(next: Mode) {
    // Block mode switching while any process is running
    if (isProcessing) return;
    setMode(next);
    setCrawlResult(null);
    setResults([]);
    setError(null);
  }

  function clearPreview() {
    setCrawlResult(null);
    setResults([]);
    setError(null);
    setBenchPrevious(null);
    setBenchImproved(null);
    setPrevResults([]);
    setImprResults([]);
    setPipelineUsed(null);
    setBenchmarkSnapshot(null);
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
      const { results: data } = await callScanApi(urls, undefined, abort.signal);
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

  // ── Sitemap crawl ──────────────────────────────────────────────────────────

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
        // Always crawl without exclusions — filtering is done client-side
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

  // ── Scan discovered pages ──────────────────────────────────────────────────

  async function handleScanDiscovered(pipeline: ScanPipeline = "previous") {
    if (!crawlResult) return;

    // Compute the live filter at scan time — reflects current scope + exclusions
    const liveFilter = computeClientFilter(crawlResult.pageEntries, scope, selectedGroups);
    const limit = scanLimit !== "" ? scanLimit : undefined;

    // Create or reuse the benchmark snapshot — both pipelines must use the same input
    const snapshot = benchmarkSnapshot ?? createSnapshot(
      liveFilter.includedUrls,
      scope,
      limit ?? null,
      selectedGroups
    );
    if (!benchmarkSnapshot) setBenchmarkSnapshot(snapshot);

    // Always use the frozen snapshot URLs so both pipelines scan identical inputs
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

        // Record benchmark metrics for this pipeline run
        const metrics = computeMetrics(pipeline, data, durationMs || (Date.now() - (scanStartRef.current ?? Date.now())), {
          urlsQueued: snapshot.queueSize,
          scanScope: scope,
          scanLimit: limit ?? null,
          concurrency: pipeline === "improved" ? PERFORMANCE_CONFIGS[performanceMode].concurrency : null,
          browserReuse: true,
          performanceMode: pipeline === "improved" ? performanceMode : null,
          runMode: benchmarkRunMode,
        });
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
    clearPreview();
  }

  function handleHistoryClear() {
    clearHistory();
    setHistory([]);
  }

  async function callScanApi(
    urls: string[], limit?: number, signal?: AbortSignal, route = "/api/scan", perfMode?: PerformanceMode, runMode?: BenchmarkRunMode
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

  const dynamicGroups = extractDynamicGroups(crawlResult?.sitemapUrls ?? []);
  const liveFilter = crawlResult
    ? computeClientFilter(crawlResult.pageEntries, scope, scope === "dynamic" ? selectedGroups : [])
    : null;

  // Clamp scanLimit whenever the available URL count shrinks
  const availableCount = liveFilter?.totalAfterFiltering ?? 0;
  useEffect(() => {
    if (scanLimit !== "" && availableCount > 0 && scanLimit > availableCount) {
      setScanLimit(availableCount);
    } else if (availableCount === 0 && scanLimit !== "") {
      setScanLimit("");
    }
  }, [availableCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Main $color={t.text}>
      <HeaderRow>
        <HeaderText>
          <PageTitle>SEO Metadata Checker</PageTitle>
          <PageSubtitle $color={t.textMuted}>
            Discover pages via sitemap and scan title + meta description for SEO issues.
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
        <SitemapInput
          value={sitemapInput} onChange={setSitemapInput} onScan={handleDiscover} loading={isCrawling}
          onCancel={handleCancelCrawl}
          isScanning={isScanning}
          scope={scope} onScopeChange={(s) => { setScope(s); if (s !== "dynamic") setSelectedGroups([]); }}
          dynamicGroups={dynamicGroups}
          selectedGroups={selectedGroups}
          onSelectedGroupsChange={setSelectedGroups}
          onInputChange={clearPreview}
        />
      )}

      {error && <ErrorBanner $bg={t.failBg} $color={t.failText}>{error}</ErrorBanner>}

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
