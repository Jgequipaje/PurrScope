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
import type { SitemapCrawlResult, FilterResult } from "@/lib/types";
import type { PerformanceMode } from "@/scan/types";
import type { BenchmarkRunMode } from "@/scan/benchmarkTypes";

type Props = {
  crawl: SitemapCrawlResult;
  filter: FilterResult;
  onScan: () => void;
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

  // How many pages will actually be scanned given the current limit
  const willScan = scanLimit !== "" && scanLimit > 0
    ? Math.min(scanLimit, filter.totalAfterFiltering)
    : filter.totalAfterFiltering;

  return (
    <div style={{
      border: "1px solid #bfdbfe", borderRadius: 10,
      marginBottom: "1.5rem", overflow: "hidden",
      fontSize: 13, background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "12px 16px", background: "#eff6ff",
        borderBottom: "1px solid #bfdbfe",
      }}>
        {/* Top row: title + scan buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1e40af" }}>
            Sitemap Debug Preview
            {pipelineUsed && (
              <span style={{ fontWeight: 400, fontSize: 12, color: "#6b7280", marginLeft: 10 }}>
                Pipeline used: {pipelineUsed === "previous" ? "Previous Process" : "Improved Process"}
              </span>
            )}
          </span>
          {scanning ? (
            <button
              onClick={onCancel}
              style={{
                padding: "6px 14px", fontSize: 13, fontWeight: 600,
                background: "transparent", color: "#b91c1c",
                border: "1px solid #b91c1c", borderRadius: 6,
                cursor: "pointer", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              <RiCloseLine size={14} /> Cancel Scan
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onScan}
                  disabled={willScan === 0}
                  title="Use the original stable scan pipeline"
                  style={{
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                    background: willScan === 0 ? "#9ca3af" : "#4b5563",
                    color: "#fff", border: "none", borderRadius: 6,
                    cursor: willScan === 0 ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    opacity: willScan === 0 ? 0.65 : 1,
                  }}
                >
                  Previous Process
                </button>
                <button
                  onClick={onScanImproved}
                  disabled={willScan === 0}
                  title="Use the new optimized concurrent scan pipeline"
                  style={{
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                    background: willScan === 0 ? "#9ca3af" : "#2563eb",
                    color: "#fff", border: "none", borderRadius: 6,
                    cursor: willScan === 0 ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    opacity: willScan === 0 ? 0.65 : 1,
                  }}
                >
                  Improved Process
                </button>
              </div>
              <PerformanceModeSelector
                value={performanceMode}
                onChange={onPerformanceModeChange}
                disabled={scanning}
              />
              {/* Benchmark run mode + reset */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                  Run mode:
                </span>
                {(["cold", "warm"] as BenchmarkRunMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { if (!scanning) onBenchmarkRunModeChange(m); }}
                    style={{
                      padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      borderRadius: 5, border: "1px solid #d1d5db",
                      background: benchmarkRunMode === m ? "#374151" : "#f3f4f6",
                      color: benchmarkRunMode === m ? "#fff" : "#374151",
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
                      borderRadius: 5, border: "1px solid #fca5a5",
                      background: "transparent", color: "#b91c1c",
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
            { label: "URLs Discovered", value: crawl.pageCount, color: "#1e40af" },
            { label: "After Filtering", value: filter.totalAfterFiltering, color: "#15803d" },
            { label: "Will Be Scanned", value: willScan, color: "#7c3aed" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: 6, padding: "8px 12px",
              border: "1px solid #bfdbfe", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Configurable scan limit */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
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
              // Clamp between 1 and maxScanLimit
              onScanLimitChange(Math.min(Math.max(1, parsed), maxScanLimit));
            }}
            style={{
              width: 140, padding: "4px 8px", fontSize: 13,
              border: "1px solid #bfdbfe", borderRadius: 6,
              opacity: (scanning || maxScanLimit === 0) ? 0.55 : 1,
              cursor: (scanning || maxScanLimit === 0) ? "not-allowed" : "text",
            }}
          />
          {scanLimit !== "" && (
            <button
              onClick={() => onScanLimitChange("")}
              disabled={scanning}
              style={{
                fontSize: 12, color: "#6b7280", background: "none",
                border: "none", cursor: scanning ? "not-allowed" : "pointer",
                textDecoration: "underline",
                opacity: scanning ? 0.45 : 1,
              }}
            >
              clear (scan all)
            </button>
          )}
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            {maxScanLimit === 0
              ? "No pages available to scan."
              : `Leave blank to scan all ${filter.totalAfterFiltering} filtered pages.`}
          </span>
        </div>
      </div>

      {/* ── Filter debug panel ── */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>Filter Results</div>
        <FilterDebug filter={filter} />
      </div>

      {/* ── Processed sitemap files (collapsible) ── */}
      <div>
        <button
          onClick={() => setSitemapsOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "9px 16px",
            background: "#f9fafb", border: "none", cursor: "pointer",
            fontWeight: 600, color: "#374151",
            borderBottom: sitemapsOpen ? "1px solid #e5e7eb" : "none",
          }}
        >
          <span>Sitemap files processed ({crawl.sitemapCount})</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {sitemapsOpen ? "▲ hide" : "▼ show"}
          </span>
        </button>

        {sitemapsOpen && (
          <ul style={{ margin: 0, padding: "10px 16px 10px 2.2rem", lineHeight: 1.9, background: "#fff" }}>
            {crawl.sitemapUrls.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer"
                  style={{ color: "#6b7280", wordBreak: "break-all", textDecoration: "none" }}>
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
