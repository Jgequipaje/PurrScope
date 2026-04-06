"use client";

// SitemapDebug — shown after sitemap discovery, BEFORE scanning.
// Displays:
//   - Crawl summary: sitemaps processed, URLs discovered, URLs after filtering, URLs to scan
//   - Configurable scan limit input (optional — leave blank to scan all)
//   - FilterDebug panel (scope stats, included/excluded URLs, mappings)
//   - Collapsible list of processed sitemap files
//   - "Scan N Pages" button to proceed

import { useState } from "react";
import { RiCloseLine } from "react-icons/ri";
import FilterDebug from "@/components/FilterDebug";
import PerformanceModeSelector from "@/components/PerformanceModeSelector";
import { useTheme, tokens } from "@/lib/theme";
import type { SitemapCrawlResult, FilterResult } from "@/lib/types";
import type { PerformanceMode } from "@/scan/types";
import type { BenchmarkRunMode } from "@/scan/benchmarkTypes";

type Props = {
  crawl: SitemapCrawlResult;
  filter: FilterResult;
  onScan: () => void; // kept for benchmark comparison use
  onScanImproved: () => void;
  onCancel: () => void;
  scanning: boolean;
  scanLimit: number | "";
  onScanLimitChange: (v: number | "") => void;
  maxScanLimit: number;
  pipelineUsed?: "previous" | "improved" | null;
  performanceMode: PerformanceMode;
  onPerformanceModeChange: (mode: PerformanceMode) => void;
  benchmarkRunMode: BenchmarkRunMode;
  onBenchmarkRunModeChange: (mode: BenchmarkRunMode) => void;
  onResetBenchmark: () => void;
  hasBenchmarkData: boolean;
};

export default function SitemapDebug({ crawl, filter, onScan, onScanImproved, onCancel, scanning, scanLimit, onScanLimitChange, maxScanLimit, pipelineUsed, performanceMode, onPerformanceModeChange, benchmarkRunMode, onBenchmarkRunModeChange, onResetBenchmark, hasBenchmarkData }: Props) {
  const [sitemapsOpen, setSitemapsOpen] = useState(false);
  const { theme } = useTheme();
  const t = tokens[theme];

  // How many pages will actually be scanned given the current limit
  const willScan = scanLimit !== "" && scanLimit > 0
    ? Math.min(scanLimit, filter.totalAfterFiltering)
    : filter.totalAfterFiltering;

  return (
    <div style={{
      border: `1px solid ${t.infoBorder}`, borderRadius: 10,
      marginBottom: "1.5rem", overflow: "hidden",
      fontSize: 13, background: t.bg,
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "12px 16px", background: t.infoBg,
        borderBottom: `1px solid ${t.infoBorder}`,
      }}>
        {/* Top row: title + scan buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: t.infoText }}>
            Discovery Results
            {pipelineUsed && (
              <span style={{ fontWeight: 400, fontSize: 12, color: t.textMuted, marginLeft: 10 }}>
                scanned via {pipelineUsed === "previous" ? "standard pipeline" : "optimized pipeline"}
              </span>
            )}
          </span>
          {scanning ? (
            <button
              onClick={onCancel}
              style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "monospace",
                background: "transparent", color: "#f0f0f0",
                border: "1px solid #f0f0f0", borderRadius: 0,
                cursor: "pointer", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 5,
                alignSelf: "flex-start",
              }}
            >
              <RiCloseLine size={14} /> Cancel Scan
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <button
                onClick={onScanImproved}
                disabled={willScan === 0}
                title="Scan pages using the improved concurrent pipeline"
                style={{
                  padding: "14px 22px", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  fontFamily: "monospace",
                  background: willScan === 0 ? "#555" : "#e8441a",
                  color: willScan === 0 ? "#999" : "#0d0d0d",
                  border: "none", borderRadius: 0,
                  cursor: willScan === 0 ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: willScan === 0 ? 0.65 : 1,
                  width: "100%",
                }}
              >
                Start Scan {willScan > 0 ? `— ${willScan} Pages` : ""}
              </button>
              <PerformanceModeSelector
                value={performanceMode}
                onChange={onPerformanceModeChange}
                disabled={scanning}
              />
              {/* Benchmark run mode + reset */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, whiteSpace: "nowrap" }}>
                  Run mode:
                </span>
                {(["cold", "warm"] as BenchmarkRunMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { if (!scanning) onBenchmarkRunModeChange(m); }}
                    style={{
                      padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      borderRadius: 5, border: `1px solid ${t.border}`,
                      background: benchmarkRunMode === m ? t.btnActive : t.btnIdle,
                      color: benchmarkRunMode === m ? t.btnActiveTxt : t.btnIdleTxt,
                      cursor: scanning ? "not-allowed" : "pointer",
                      opacity: scanning ? 0.55 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {m === "cold" ? "Cold" : "Warm"}
                  </button>
                ))}
                {hasBenchmarkData && (
                  <button
                    type="button"
                    onClick={() => { if (!scanning) onResetBenchmark(); }}
                    disabled={scanning}
                    style={{
                      padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      borderRadius: 5, border: `1px solid ${t.failText}`,
                      background: "transparent", color: t.failText,
                      cursor: scanning ? "not-allowed" : "pointer",
                      opacity: scanning ? 0.55 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    Reset Benchmark
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Debug counts row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8, marginBottom: 12,
        }}>
          {[
            { label: "URLs Discovered", value: crawl.pageCount, color: t.infoText },
            { label: "Pages Selected for Scan", value: filter.totalAfterFiltering, color: t.passText },
            { label: "Ready to Scan",  value: willScan, color: t.link },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: t.bg, borderRadius: 6, padding: "8px 12px",
              border: `1px solid ${t.infoBorder}`, textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Configurable scan limit */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: "nowrap" }}>
            Scan limit:
          </label>
          <input
            type="number"
            min={1}
            max={maxScanLimit}
            placeholder={`All ${filter.totalAfterFiltering} pages`}
            value={scanLimit}
            disabled={scanning || maxScanLimit === 0}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { onScanLimitChange(""); return; }
              const parsed = parseInt(v, 10);
              if (isNaN(parsed)) return;
              onScanLimitChange(Math.min(Math.max(1, parsed), maxScanLimit));
            }}
            style={{
              width: 140, padding: "4px 8px", fontSize: 13,
              border: `1px solid ${t.infoBorder}`, borderRadius: 6,
              background: t.bg, color: t.text,
              opacity: (scanning || maxScanLimit === 0) ? 0.55 : 1,
              cursor: (scanning || maxScanLimit === 0) ? "not-allowed" : "text",
            }}
          />
          {scanLimit !== "" && (
            <button
              onClick={() => onScanLimitChange("")}
              disabled={scanning}
              style={{
                fontSize: 12, color: t.textMuted, background: "none",
                border: "none", cursor: scanning ? "not-allowed" : "pointer",
                textDecoration: "underline",
                opacity: scanning ? 0.45 : 1,
                fontFamily: "inherit",
              }}
            >
              clear (scan all)
            </button>
          )}
          <span style={{ fontSize: 12, color: t.textFaint }}>
            {maxScanLimit === 0
              ? "No pages available to scan."
              : `Leave blank to scan all ${filter.totalAfterFiltering} selected pages.`}
          </span>
        </div>
      </div>

      {/* ── Filter debug panel ── */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontWeight: 600, color: t.text, marginBottom: 4 }}>Filter Results</div>
        <FilterDebug filter={filter} />
      </div>

      {/* ── Processed sitemap files (collapsible) ── */}
      <div>
        <button
          onClick={() => setSitemapsOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "9px 16px",
            background: t.bgSubtle, border: "none", cursor: "pointer",
            fontWeight: 600, color: t.text,
            borderBottom: sitemapsOpen ? `1px solid ${t.border}` : "none",
            fontFamily: "inherit",
          }}
        >
          <span>Sitemap files processed ({crawl.sitemapCount})</span>
          <span style={{ fontSize: 11, color: t.textFaint }}>
            {sitemapsOpen ? "▲ hide" : "▼ show"}
          </span>
        </button>

        {sitemapsOpen && (
          <ul style={{ margin: 0, padding: "10px 16px 10px 2.2rem", lineHeight: 1.9, background: t.bg }}>
            {crawl.sitemapUrls.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer"
                  style={{ color: t.link, wordBreak: "break-all", textDecoration: "none" }}>
                  {u}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
