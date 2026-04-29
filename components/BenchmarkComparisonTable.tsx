"use client";

// BenchmarkComparisonTable — side-by-side pipeline comparison.
// To remove: delete this file, scan/benchmarkUtils.ts, scan/benchmarkTypes.ts,
// and remove benchmark state + <BenchmarkComparisonTable> from app/page.tsx.

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import type { Tokens } from "@/lib/theme";
import { fmtDuration, compareSpeed, compareResults, isFairComparison } from "@/scan/benchmarkUtils";
import type { BenchmarkMetrics } from "@/scan/benchmarkTypes";
import type { ScanResult } from "@/lib/types";

type Props = {
  previous?: BenchmarkMetrics | null;
  improved?: BenchmarkMetrics | null;
  previousResults?: ScanResult[];
  improvedResults?: ScanResult[];
  onReset?: () => void;
};

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div<{ $border: string; $bg: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  font-size: 13px;
`;

const Header = styled.div<{ $bg: string; $border: string }>`
  padding: 12px 16px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.span<{ $color: string }>`
  font-weight: 700;
  font-size: 14px;
  color: ${(p) => p.$color};
`;

const ResetBtn = styled.button<{ $border: string; $color: string }>`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  background: transparent;
  color: ${(p) => p.$color};
  cursor: pointer;
  font-family: inherit;
  &:hover {
    opacity: 0.8;
  }
`;

const WarningBanner = styled.div<{ $bg: string; $border: string; $color: string }>`
  padding: 8px 16px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  font-size: 12px;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th<{ $bg: string; $border: string; $color: string; $align?: string }>`
  padding: 9px 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  text-align: ${(p) => p.$align ?? "left"};
  white-space: nowrap;
`;

const Td = styled.td<{
  $border: string;
  $color: string;
  $align?: string;
  $highlight?: boolean;
  $highlightBg?: string;
}>`
  padding: 9px 14px;
  border-bottom: 1px solid ${(p) => p.$border};
  color: ${(p) => p.$color};
  text-align: ${(p) => p.$align ?? "left"};
  background: ${(p) => (p.$highlight && p.$highlightBg ? p.$highlightBg : "transparent")};
  font-weight: ${(p) => (p.$highlight ? 600 : 400)};
`;

const MetricLabel = styled.td<{ $border: string; $color: string; $bg: string }>`
  padding: 9px 14px;
  border-bottom: 1px solid ${(p) => p.$border};
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  font-weight: 500;
  white-space: nowrap;
`;

const Badge = styled.span<{ $bg: string; $color: string }>`
  display: inline-block;
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  margin-left: 6px;
`;

const SectionHeader = styled.tr<{ $bg: string }>`
  background: ${(p) => p.$bg};
`;

const SectionTd = styled.td<{ $color: string; $border: string }>`
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${(p) => p.$color};
  border-bottom: 1px solid ${(p) => p.$border};
`;

const ConsistencyWrap = styled.div<{ $border: string; $bg: string }>`
  padding: 12px 16px;
  border-top: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
`;

const ConsistencyTitle = styled.div<{ $color: string }>`
  font-weight: 600;
  font-size: 13px;
  color: ${(p) => p.$color};
  margin-bottom: 8px;
`;

const ConsistencyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const ConsistencyCell = styled.div<{ $border: string; $bg: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  padding: 8px 10px;
  background: ${(p) => p.$bg};
  text-align: center;
`;

const ConsistencyValue = styled.div<{ $color: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${(p) => p.$color};
`;

const ConsistencyLabel = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
`;

const NotesWrap = styled.div<{ $border: string; $bg: string }>`
  padding: 10px 16px;
  border-top: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
`;

const NoteItem = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin-bottom: 3px;
  &:last-child {
    margin-bottom: 0;
  }
  &::before {
    content: "ℹ ";
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

function winnerBadge(aVal: number, bVal: number, lowerIsBetter: boolean, t: Tokens) {
  if (aVal === bVal) return null;
  const aWins = lowerIsBetter ? aVal < bVal : aVal > bVal;
  return aWins
    ? {
        a: (
          <Badge $bg={t.passBg} $color={t.passText}>
            faster
          </Badge>
        ),
        b: null,
      }
    : {
        a: null,
        b: (
          <Badge $bg={t.passBg} $color={t.passText}>
            faster
          </Badge>
        ),
      };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BenchmarkComparisonTable({
  previous,
  improved,
  previousResults,
  improvedResults,
  onReset,
}: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const hasPrev = !!previous;
  const hasImpr = !!improved;
  const hasBoth = hasPrev && hasImpr;

  if (!hasPrev && !hasImpr) return null;

  const fair = hasBoth ? isFairComparison(previous!, improved!) : true;

  const consistency =
    hasBoth && previousResults && improvedResults
      ? compareResults(previousResults, improvedResults)
      : null;

  const durationWinner = hasBoth
    ? winnerBadge(previous!.totalDurationMs, improved!.totalDurationMs, true, t)
    : null;
  const avgWinner = hasBoth
    ? winnerBadge(previous!.avgTimePerPageMs, improved!.avgTimePerPageMs, true, t)
    : null;

  // Auto-generated notes
  const notes: string[] = [];
  if (improved) {
    const modeLabel = improved.performanceMode ?? "balanced";
    notes.push(
      `Improved Process ran in ${modeLabel} mode · ${improved.concurrency ?? 1} worker${(improved.concurrency ?? 1) > 1 ? "s" : ""} · cache: ${improved.cacheMode}.`
    );
    if (improved.playwrightCount > improved.urlsScanned * 0.5)
      notes.push(
        "Improved Process had heavy Playwright fallback — may be slower on lower-end PCs."
      );
  }
  if (previous) notes.push(`Previous Process · sequential · cache: ${previous.cacheMode}.`);
  if (hasBoth && previous!.runMode !== improved!.runMode)
    notes.push("Run modes differ — cold vs warm cache — timing comparison may not be fair.");
  if (hasBoth && previous!.playwrightCount < improved!.playwrightCount)
    notes.push(
      "Previous Process had fewer Playwright fallbacks — may be more stable on blocked pages."
    );
  if (hasBoth && consistency && consistency.matchRate < 0.9)
    notes.push(
      `Result consistency is ${Math.round(consistency.matchRate * 100)}% — pipelines disagree on some pages.`
    );

  type Row = { label: string; prev: string | number; impr: string | number };

  const timingRows: Row[] = [
    {
      label: "Total Duration",
      prev: previous ? fmtDuration(previous.totalDurationMs) : "—",
      impr: improved ? fmtDuration(improved.totalDurationMs) : "—",
    },
    {
      label: "Avg Time / Page",
      prev: previous ? fmtDuration(previous.avgTimePerPageMs) : "—",
      impr: improved ? fmtDuration(improved.avgTimePerPageMs) : "—",
    },
  ];

  const countRows: Row[] = [
    { label: "URLs Queued", prev: previous?.urlsQueued ?? "—", impr: improved?.urlsQueued ?? "—" },
    {
      label: "URLs Scanned",
      prev: previous?.urlsScanned ?? "—",
      impr: improved?.urlsScanned ?? "—",
    },
    {
      label: "Successful",
      prev: previous?.successCount ?? "—",
      impr: improved?.successCount ?? "—",
    },
    { label: "Failed SEO", prev: previous?.failedCount ?? "—", impr: improved?.failedCount ?? "—" },
    {
      label: "Blocked Pages",
      prev: previous?.blockedCount ?? "—",
      impr: improved?.blockedCount ?? "—",
    },
    { label: "Errors", prev: previous?.errorCount ?? "—", impr: improved?.errorCount ?? "—" },
    { label: "Fetch Only", prev: previous?.fetchCount ?? "—", impr: improved?.fetchCount ?? "—" },
    {
      label: "Playwright Fallback",
      prev: previous?.playwrightCount ?? "—",
      impr: improved?.playwrightCount ?? "—",
    },
  ];

  return (
    <Wrap $border={t.border} $bg={t.bg}>
      <Header $bg={t.bgSubtle} $border={t.border}>
        <Title $color={t.text}>
          Pipeline Benchmark Comparison
          {hasBoth && (
            <Badge $bg={fair ? t.passBg : t.warnBg} $color={fair ? t.passText : t.warnText}>
              {fair ? "fair comparison" : "⚠ conditions differ"}
            </Badge>
          )}
        </Title>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: t.textFaint }}>
            {hasBoth ? "Both pipelines ran" : "Run both pipelines to compare"}
          </span>
          {onReset && (
            <ResetBtn $border={t.failText} $color={t.failText} onClick={onReset}>
              Reset
            </ResetBtn>
          )}
        </div>
      </Header>

      {/* Fairness warning */}
      {hasBoth && !fair && (
        <WarningBanner $bg={t.warnBg} $border={t.border} $color={t.warnText}>
          ⚠ Warning:{" "}
          {previous!.runMode !== improved!.runMode
            ? `Previous ran as ${previous!.runMode} cache, Improved ran as ${improved!.runMode} cache — timing is not directly comparable.`
            : "Scan configurations differ between runs — results may not be directly comparable."}
        </WarningBanner>
      )}

      <Table>
        <thead>
          <tr>
            <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} style={{ width: "34%" }}>
              Metric
            </Th>
            <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
              Previous Process
              {previous && (
                <div
                  style={{
                    fontWeight: 400,
                    fontSize: 11,
                    color: t.textFaint,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  {previous.runMode} · {new Date(previous.ranAt).toLocaleTimeString()}
                </div>
              )}
            </Th>
            <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
              Improved Process
              {improved && (
                <div
                  style={{
                    fontWeight: 400,
                    fontSize: 11,
                    color: t.textFaint,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  {improved.runMode} · {new Date(improved.ranAt).toLocaleTimeString()}
                </div>
              )}
            </Th>
          </tr>
        </thead>
        <tbody>
          <SectionHeader $bg={t.bgMuted}>
            <SectionTd colSpan={3} $color={t.textMuted} $border={t.border}>
              Timing
            </SectionTd>
          </SectionHeader>
          {timingRows.map((row) => {
            const winner = row.label === "Total Duration" ? durationWinner : avgWinner;
            return (
              <tr key={row.label}>
                <MetricLabel $border={t.border} $color={t.text} $bg={t.bgSubtle}>
                  {row.label}
                </MetricLabel>
                <Td $border={t.border} $color={t.text} $align="center">
                  {previous ? row.prev : "—"}
                  {winner?.a}
                </Td>
                <Td $border={t.border} $color={t.text} $align="center">
                  {improved ? row.impr : "—"}
                  {winner?.b}
                </Td>
              </tr>
            );
          })}

          <SectionHeader $bg={t.bgMuted}>
            <SectionTd colSpan={3} $color={t.textMuted} $border={t.border}>
              Result Counts
            </SectionTd>
          </SectionHeader>
          {countRows.map((row) => (
            <tr key={row.label}>
              <MetricLabel $border={t.border} $color={t.text} $bg={t.bgSubtle}>
                {row.label}
              </MetricLabel>
              <Td $border={t.border} $color={t.text} $align="center">
                {previous ? row.prev : "—"}
              </Td>
              <Td $border={t.border} $color={t.text} $align="center">
                {improved ? row.impr : "—"}
              </Td>
            </tr>
          ))}

          <SectionHeader $bg={t.bgMuted}>
            <SectionTd colSpan={3} $color={t.textMuted} $border={t.border}>
              Environment
            </SectionTd>
          </SectionHeader>
          {[
            { label: "Run Mode", prev: previous?.runMode ?? "—", impr: improved?.runMode ?? "—" },
            {
              label: "Cache Mode",
              prev: previous?.cacheMode ?? "—",
              impr: improved?.cacheMode ?? "—",
            },
            { label: "Scope", prev: previous?.scanScope ?? "—", impr: improved?.scanScope ?? "—" },
            {
              label: "Scan Limit",
              prev: previous ? (previous.scanLimit ?? "none") : "—",
              impr: improved ? (improved.scanLimit ?? "none") : "—",
            },
            {
              label: "Queue Size",
              prev: previous?.queueSize ?? "—",
              impr: improved?.queueSize ?? "—",
            },
            {
              label: "Concurrency",
              prev: previous ? (previous.concurrency ?? "sequential") : "—",
              impr: improved ? (improved.concurrency ?? "sequential") : "—",
            },
            {
              label: "Performance Mode",
              prev: previous ? (previous.performanceMode ?? "—") : "—",
              impr: improved?.performanceMode ?? "—",
            },
            {
              label: "Browser Reuse",
              prev: previous ? (previous.browserReuse ? "Yes" : "No") : "—",
              impr: improved ? (improved.browserReuse ? "Yes" : "No") : "—",
            },
          ].map((row) => (
            <tr key={row.label}>
              <MetricLabel $border={t.border} $color={t.text} $bg={t.bgSubtle}>
                {row.label}
              </MetricLabel>
              <Td $border={t.border} $color={t.text} $align="center">
                {row.prev}
              </Td>
              <Td $border={t.border} $color={t.text} $align="center">
                {row.impr}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {consistency && (
        <ConsistencyWrap $border={t.border} $bg={t.bgSubtle}>
          <ConsistencyTitle $color={t.text}>
            Result Consistency — {consistency.totalCompared} URLs compared
            <Badge
              $bg={
                consistency.matchRate >= 0.95
                  ? t.passBg
                  : consistency.matchRate >= 0.8
                    ? t.warnBg
                    : t.failBg
              }
              $color={
                consistency.matchRate >= 0.95
                  ? t.passText
                  : consistency.matchRate >= 0.8
                    ? t.warnText
                    : t.failText
              }
            >
              {Math.round(consistency.matchRate * 100)}% match
            </Badge>
          </ConsistencyTitle>
          <ConsistencyGrid>
            {[
              {
                label: "Title",
                match: consistency.titleMatch,
                mismatch: consistency.titleMismatch,
              },
              {
                label: "Description",
                match: consistency.descriptionMatch,
                mismatch: consistency.descriptionMismatch,
              },
              {
                label: "Status",
                match: consistency.statusMatch,
                mismatch: consistency.statusMismatch,
              },
              {
                label: "Overall",
                match:
                  consistency.titleMatch + consistency.descriptionMatch + consistency.statusMatch,
                mismatch:
                  consistency.titleMismatch +
                  consistency.descriptionMismatch +
                  consistency.statusMismatch,
              },
            ].map(({ label, match, mismatch }) => {
              const total = match + mismatch;
              const rate = total > 0 ? match / total : 0;
              return (
                <ConsistencyCell key={label} $border={t.border} $bg={t.bg}>
                  <ConsistencyValue
                    $color={rate >= 0.9 ? t.passText : rate >= 0.7 ? t.warnText : t.failText}
                  >
                    {pct(match, total)}
                  </ConsistencyValue>
                  <ConsistencyLabel $color={t.textMuted}>{label}</ConsistencyLabel>
                  <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                    {match}/{total}
                  </div>
                </ConsistencyCell>
              );
            })}
          </ConsistencyGrid>
        </ConsistencyWrap>
      )}

      {notes.length > 0 && (
        <NotesWrap $border={t.border} $bg={t.bg}>
          {notes.map((n, i) => (
            <NoteItem key={i} $color={t.textMuted}>
              {n}
            </NoteItem>
          ))}
        </NotesWrap>
      )}
    </Wrap>
  );
}
