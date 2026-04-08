"use client";

import { useState, useMemo, Fragment } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  RiCheckboxCircleFill, RiCloseCircleFill, RiProhibitedLine,
  RiAlertLine, RiCornerDownRightLine,
  RiArrowDownSLine, RiArrowUpSLine,
  RiFileCopyLine, RiCheckLine, RiErrorWarningLine,
  RiSearchLine, RiArrowLeftSLine, RiArrowRightSLine,
} from "react-icons/ri";
import { buildCopyText } from "@/lib/copy";
import { useTheme, tokens } from "@/lib/theme";
import { formatDuration, executionLabel } from "@/lib/duration";
import type { Tokens } from "@/lib/theme";
import type { TimerState } from "@/lib/duration";
import type { ScanResult } from "@/lib/types";

type TabFilter = "all" | "failed" | "passed" | "blocked";
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];
const PAGINATION_THRESHOLD = 25;

type Props = {
  results: ScanResult[];
  scanTimer?: TimerState;
};

// ── Animations ────────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Styled ────────────────────────────────────────────────────────────────────

const TableWrap = styled.div<{ $border: string; $bg: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 10px;
  overflow: hidden;
  background: ${(p) => p.$bg};
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  margin-bottom: 1.5rem;
`;

// Summary bar
const SummaryBar = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 10px 14px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  font-size: 12px;
  font-weight: 600;
`;

const SummaryChip = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

// Toolbar: tabs + search + copy
const Toolbar = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
`;

const TabGroup = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const TabBtn = styled.button<{ $active: boolean; $activeBg: string; $idleBg: string; $activeTxt: string; $idleTxt: string; $border: string; $disabled?: boolean }>`
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  cursor: ${(p) => p.$disabled ? "not-allowed" : "pointer"};
  opacity: ${(p) => p.$disabled ? 0.4 : 1};
  background: ${(p) => (p.$active && !p.$disabled ? p.$activeBg : p.$idleBg)};
  color: ${(p) => (p.$active && !p.$disabled ? p.$activeTxt : p.$idleTxt)};
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
  &:not(:disabled):hover { opacity: 0.85; }
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SearchWrap = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  background: ${(p) => p.$bg};
  padding: 3px 8px;
`;

const SearchInput = styled.input<{ $color: string; $bg: string }>`
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: ${(p) => p.$color};
  font-family: inherit;
  width: 160px;
  &::placeholder { opacity: 0.5; }
`;

const CopyBtn = styled.button<{ $copied: boolean; $passBg: string; $idleBg: string; $passTxt: string; $idleTxt: string; $border: string }>`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${(p) => (p.$copied ? p.$passBg : p.$idleBg)};
  color: ${(p) => (p.$copied ? p.$passTxt : p.$idleTxt)};
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const ScrollWrap = styled.div` overflow-x: auto; `;

const Table = styled.table` width: 100%; border-collapse: collapse; `;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 2;
`;

const Th = styled.th<{ $bg: string; $border: string; $color: string; $align?: string; $sortable?: boolean }>`
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.$color};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  white-space: nowrap;
  text-align: ${(p) => p.$align ?? "left"};
  cursor: ${(p) => p.$sortable ? "pointer" : "default"};
  user-select: none;
  ${(p) => p.$sortable && css`&:hover { opacity: 0.8; }`}
`;

const Td = styled.td<{ $border: string; $color: string; $align?: string }>`
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid ${(p) => p.$border};
  vertical-align: middle;
  color: ${(p) => p.$color};
  text-align: ${(p) => p.$align ?? "left"};
`;

const DataRow = styled.tr<{ $bg: string; $open: boolean; $accentColor: string; $failed: boolean; $failBorder: string }>`
  background: ${(p) => p.$bg};
  cursor: pointer;
  border-left: 3px solid ${(p) => p.$failed ? p.$failBorder : "transparent"};
  box-shadow: ${(p) => p.$open ? `inset 3px 0 0 ${p.$accentColor}` : "none"};
  animation: ${fadeIn} 0.15s ease both;
  transition: filter 0.1s;
  &:hover { filter: brightness(0.97); }
`;

const ExpandCell = styled(Td)`
  user-select: none;
  padding-right: 0;
  width: 32px;
`;

const UrlCell = styled(Td)`
  max-width: 320px;
`;

const UrlText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
`;

const UrlAnchor = styled.a<{ $color: string }>`
  color: ${(p) => p.$color};
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const SubLine = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  margin-top: 2px;
`;

const PillSpan = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
`;

const LengthSpan = styled.span<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
`;

const MissingSpan = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  font-style: italic;
`;

const CautionBadge = styled.span<{ $bg: string; $color: string; $border: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  border: 1px solid ${(p) => p.$border};
`;

const ExpandedTd = styled.td<{ $bg: string; $border: string }>`
  padding: 12px 18px 16px 36px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  font-size: 13px;
`;

const ExpandedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const ExpandedFieldLabel = styled.div<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`;

const ExpandedValue = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  line-height: 1.5;
  word-break: break-word;
`;

// Footer: summary + pagination
const FooterBar = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  font-size: 12px;
`;

const FooterLeft = styled.div<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PaginationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PageBtn = styled.button<{ $border: string; $bg: string; $color: string; $active?: boolean; $activeBg?: string; $activeTxt?: string }>`
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$active ? (p.$activeBg ?? p.$bg) : p.$bg};
  color: ${(p) => p.$active ? (p.$activeTxt ?? p.$color) : p.$color};
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  &:disabled { opacity: 0.35; cursor: not-allowed; }
  &:not(:disabled):hover { opacity: 0.75; }
`;

const PageSizeSelect = styled.select<{ $border: string; $bg: string; $color: string }>`
  padding: 3px 6px;
  font-size: 12px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  font-family: inherit;
  cursor: pointer;
`;

const EmptyRow = styled.tr``;
const EmptyTd = styled.td<{ $color: string; $border: string }>`
  padding: 3rem 1rem;
  text-align: center;
  color: ${(p) => p.$color};
  font-size: 13px;
  border-bottom: 1px solid ${(p) => p.$border};
`;

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const ExecutionBadge = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 400;
  color: ${(p) => p.$color};
  opacity: 0.8;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFailed(r: ScanResult) {
  return !!(r.scanStatus === "Blocked (automation)" || r.titleStatus === "Fail" || r.descriptionStatus === "Fail" || r.error);
}
function isPassed(r: ScanResult) {
  return r.scanStatus === "success" && r.titleStatus === "Pass" && r.descriptionStatus === "Pass";
}
function isBlocked(r: ScanResult) {
  return r.scanStatus === "Blocked (automation)";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ status, t }: { status: "Pass" | "Fail"; t: Tokens }) {
  const pass = status === "Pass";
  return (
    <PillSpan $bg={pass ? t.passBg : t.failBg} $color={pass ? t.passText : t.failText}>
      {pass ? <RiCheckboxCircleFill size={12} /> : <RiCloseCircleFill size={12} />}
      {pass ? "Pass" : "Fail"}
    </PillSpan>
  );
}

function BlockedPill({ t }: { t: Tokens }) {
  return (
    <PillSpan $bg={t.bgMuted} $color={t.textMuted}>
      <RiProhibitedLine size={12} /> Blocked
    </PillSpan>
  );
}

function ExpandedRow({ r, colSpan, t }: { r: ScanResult; colSpan: number; t: Tokens }) {
  const blocked = isBlocked(r);
  return (
    <tr>
      <ExpandedTd colSpan={colSpan} $bg={t.bgSubtle} $border={t.border}>
        {blocked ? (
          <ExpandedValue $color={t.textMuted} style={{ fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
            <RiProhibitedLine size={14} /> This page was blocked by bot protection or an interstitial.
          </ExpandedValue>
        ) : (
          <ExpandedGrid>
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>SEO Title</ExpandedFieldLabel>
              {r.title
                ? <ExpandedValue $color={t.text}>{r.title}</ExpandedValue>
                : <ExpandedValue $color={t.textFaint} style={{ fontStyle: "italic" }}>(missing)</ExpandedValue>}
            </div>
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>Meta Description</ExpandedFieldLabel>
              {r.description
                ? <ExpandedValue $color={t.text}>{r.description}</ExpandedValue>
                : <ExpandedValue $color={t.textFaint} style={{ fontStyle: "italic" }}>(missing)</ExpandedValue>}
            </div>
          </ExpandedGrid>
        )}
      </ExpandedTd>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultsTable({ results, scanTimer }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [sortKey, setSortKey] = useState<"url" | "titleLength" | "descLength" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Counts ────────────────────────────────────────────────────────────────
  const failCount    = useMemo(() => results.filter(isFailed).length, [results]);
  const passCount    = useMemo(() => results.filter(isPassed).length, [results]);
  const blockedCount = useMemo(() => results.filter(isBlocked).length, [results]);
  const allPass      = failCount === 0;

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = results;
    if (tab === "failed")  rows = rows.filter(isFailed);
    if (tab === "passed")  rows = rows.filter(isPassed);
    if (tab === "blocked") rows = rows.filter(isBlocked);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.url.toLowerCase().includes(q));
    }
    return rows;
  }, [results, tab, search]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortKey === "url")         { av = a.url; bv = b.url; }
      if (sortKey === "titleLength") { av = a.titleLength; bv = b.titleLength; }
      if (sortKey === "descLength")  { av = a.descriptionLength; bv = b.descriptionLength; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const showPagination = sorted.length > PAGINATION_THRESHOLD;

  function handleTabChange(next: TabFilter) {
    setTab(next);
    setPage(1);
    setOpenUrl(null);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    setOpenUrl(null);
  }

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildCopyText(results)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleRow(url: string) {
    setOpenUrl((prev) => (prev === url ? null : url));
  }

  const sortIndicator = (key: typeof sortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const toolbarBg = allPass ? t.toolbarPassBg : t.toolbarFailBg;

  const tabDefs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all",     label: "All",     count: results.length },
    { key: "failed",  label: "Failed",  count: failCount },
    { key: "passed",  label: "Passed",  count: passCount },
    { key: "blocked", label: "Blocked", count: blockedCount },
  ];

  return (
    <TableWrap $border={t.border} $bg={t.bg}>

      {/* ── Summary bar ── */}
      <SummaryBar $bg={t.bgSubtle} $border={t.border}>
        <SummaryChip $color={t.textMuted}>
          <RiCheckboxCircleFill size={12} style={{ opacity: 0.5 }} />
          {results.length} URLs
        </SummaryChip>
        {failCount > 0 && (
          <SummaryChip $color={t.warnText}>
            <RiErrorWarningLine size={12} />
            {failCount} Failed
          </SummaryChip>
        )}
        {blockedCount > 0 && (
          <SummaryChip $color={t.textMuted}>
            <RiProhibitedLine size={12} />
            {blockedCount} Blocked
          </SummaryChip>
        )}
        <SummaryChip $color={t.passText}>
          <RiCheckboxCircleFill size={12} />
          {passCount} Passed
        </SummaryChip>
        {scanTimer?.duration != null && scanTimer.status != null && (
          <SummaryChip $color={t.textFaint}>
            · {executionLabel(scanTimer.status, formatDuration(scanTimer.duration), "Scanned")}
          </SummaryChip>
        )}
      </SummaryBar>

      {/* ── Toolbar: tabs + search + copy ── */}
      <Toolbar $border={t.border} $bg={toolbarBg}>
        <TabGroup>
          {tabDefs.map(({ key, label, count }) => {
            const disabled = count === 0 && key !== "all";
            return (
              <TabBtn
                key={key}
                onClick={() => { if (!disabled) handleTabChange(key); }}
                disabled={disabled}
                $active={tab === key && !disabled}
                $disabled={disabled}
                $activeBg={t.btnActive} $idleBg={t.btnIdle}
                $activeTxt={t.btnActiveTxt} $idleTxt={t.btnIdleTxt}
                $border={t.border}
              >
                {label} ({count})
              </TabBtn>
            );
          })}
        </TabGroup>

        <ToolbarRight>
          <SearchWrap $border={t.border} $bg={t.bg}>
            <RiSearchLine size={13} color={t.textFaint} />
            <SearchInput
              placeholder="Search URLs…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              $color={t.text}
              $bg={t.bg}
            />
          </SearchWrap>
          <CopyBtn
            onClick={handleCopy}
            $copied={copied}
            $passBg={t.passBg} $idleBg={t.btnIdle}
            $passTxt={t.passText} $idleTxt={t.btnIdleTxt}
            $border={t.border}
          >
            <IconWrap>
              {copied ? <RiCheckLine size={13} /> : <RiFileCopyLine size={13} />}
              {copied ? "Copied!" : "Copy"}
            </IconWrap>
          </CopyBtn>
        </ToolbarRight>
      </Toolbar>

      {/* ── Table ── */}
      <ScrollWrap>
        <Table>
          <Thead>
            <tr>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} style={{ width: 32 }} />
              <Th
                $bg={t.headerBg} $border={t.border} $color={t.textMuted}
                $sortable onClick={() => handleSort("url")}
              >
                URL{sortIndicator("url")}
              </Th>
              <Th
                $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center"
                $sortable onClick={() => handleSort("titleLength")}
              >
                Title Length{sortIndicator("titleLength")}
              </Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
                Title Status
              </Th>
              <Th
                $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center"
                $sortable onClick={() => handleSort("descLength")}
              >
                Desc. Length{sortIndicator("descLength")}
              </Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
                Desc. Status
              </Th>
            </tr>
          </Thead>
          <tbody>
            {pageRows.length === 0 ? (
              <EmptyRow>
                <EmptyTd colSpan={6} $color={t.textFaint} $border={t.border}>
                  {search ? "No matching results for your search." : "No results in this category."}
                </EmptyTd>
              </EmptyRow>
            ) : (
              pageRows.map((r) => {
                const failed  = isFailed(r);
                const blocked = isBlocked(r);
                const isOpen  = openUrl === r.url;
                return (
                  <Fragment key={r.url}>
                    <DataRow
                      $bg={failed ? t.rowFail : t.rowOk}
                      $open={isOpen}
                      $accentColor={t.btnActive}
                      $failed={failed}
                      $failBorder={t.rowFailBorder}
                      onClick={() => toggleRow(r.url)}
                    >
                      <ExpandCell $border={t.border} $color={t.textFaint} $align="center">
                        {isOpen ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </ExpandCell>
                      <UrlCell $border={t.border} $color={t.text}>
                        <UrlText>
                          <UrlAnchor href={r.url} target="_blank" rel="noreferrer" $color={t.link} onClick={(e) => e.stopPropagation()}>
                            {r.url}
                          </UrlAnchor>
                        </UrlText>
                        {failed && !blocked && (
                          <SubLine $color={t.warnText}>
                            <CautionBadge $bg={t.warnBg} $color={t.warnText} $border={t.warnBorder}>
                              <RiErrorWarningLine size={11} /> Needs attention
                            </CautionBadge>
                          </SubLine>
                        )}
                        {r.finalUrl && r.finalUrl !== r.url && (
                          <SubLine $color={t.textMuted}>
                            <IconWrap>
                              <RiCornerDownRightLine size={11} /> redirected to{" "}
                              <UrlAnchor href={r.finalUrl} target="_blank" rel="noreferrer" $color={t.textMuted} onClick={(e) => e.stopPropagation()}>
                                {r.finalUrl}
                              </UrlAnchor>
                            </IconWrap>
                          </SubLine>
                        )}
                        {r.methodUsed && <SubLine $color={t.textFaint}>via {r.methodUsed}</SubLine>}
                        {r.attempts !== undefined && r.attempts > 1 && (
                          <SubLine $color={t.warnText}><IconWrap><RiAlertLine size={11} /> {r.attempts} attempts</IconWrap></SubLine>
                        )}
                        {r.error && <SubLine $color={t.failText}><IconWrap><RiAlertLine size={11} /> {r.error}</IconWrap></SubLine>}
                      </UrlCell>

                      <Td $border={t.border} $color={t.text} $align="center">
                        {blocked ? <MissingSpan $color={t.textFaint}>—</MissingSpan> :
                          r.title
                            ? <LengthSpan $color={r.titleStatus === "Pass" ? t.passText : t.failText}>{r.titleLength} chars</LengthSpan>
                            : <MissingSpan $color={t.textFaint}>(missing)</MissingSpan>}
                      </Td>
                      <Td $border={t.border} $color={t.text} $align="center">
                        {blocked ? <BlockedPill t={t} /> : <Pill status={r.titleStatus} t={t} />}
                      </Td>
                      <Td $border={t.border} $color={t.text} $align="center">
                        {blocked ? <MissingSpan $color={t.textFaint}>—</MissingSpan> :
                          r.description
                            ? <LengthSpan $color={r.descriptionStatus === "Pass" ? t.passText : t.failText}>{r.descriptionLength} chars</LengthSpan>
                            : <MissingSpan $color={t.textFaint}>(missing)</MissingSpan>}
                      </Td>
                      <Td $border={t.border} $color={t.text} $align="center">
                        {blocked ? <BlockedPill t={t} /> : <Pill status={r.descriptionStatus} t={t} />}
                      </Td>
                    </DataRow>
                    {isOpen && <ExpandedRow r={r} colSpan={6} t={t} />}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </Table>
      </ScrollWrap>

      {/* ── Footer: status + pagination ── */}
      <FooterBar $border={t.border} $bg={toolbarBg}>
        <FooterLeft $color={allPass ? t.successText : t.warnText}>
          <IconWrap>
            {allPass ? <RiCheckboxCircleFill size={14} /> : <RiCloseCircleFill size={14} />}
            {allPass
              ? `All ${results.length} pages passed.`
              : `${failCount} of ${results.length} pages need attention.`}
          </IconWrap>
          {sorted.length !== results.length && (
            <ExecutionBadge $color={t.textFaint}>
              · showing {sorted.length} filtered
            </ExecutionBadge>
          )}
        </FooterLeft>

        {showPagination && (
          <PaginationWrap>
            <PageSizeSelect
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value) as PageSize); setPage(1); }}
              $border={t.border} $bg={t.bgMuted} $color={t.text}
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </PageSizeSelect>

            <PageBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              $border={t.border} $bg={t.bgMuted} $color={t.text}
            >
              <RiArrowLeftSLine size={14} />
            </PageBtn>

            {/* Page number buttons — show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} style={{ color: t.textFaint, fontSize: 12, padding: "0 2px" }}>…</span>
                ) : (
                  <PageBtn
                    key={p}
                    onClick={() => setPage(p as number)}
                    $active={safePage === p}
                    $border={t.border}
                    $bg={t.bgMuted}
                    $color={t.text}
                    $activeBg={t.btnActive}
                    $activeTxt={t.btnActiveTxt}
                  >
                    {p}
                  </PageBtn>
                )
              )}

            <PageBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              $border={t.border} $bg={t.bgMuted} $color={t.text}
            >
              <RiArrowRightSLine size={14} />
            </PageBtn>
          </PaginationWrap>
        )}
      </FooterBar>
    </TableWrap>
  );
}
