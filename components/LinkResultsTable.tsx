"use client";

import { useState, useMemo, Fragment } from "react";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiCornerDownRightLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileCopyLine,
  RiCheckLine,
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "react-icons/ri";
import { useTheme, tokens } from "@/lib/theme";
import { formatDuration, executionLabel } from "@/lib/duration";
import type { Tokens } from "@/lib/theme";
import type { TimerState } from "@/lib/duration";
import type { LinkCheckResult, LinkType } from "@/lib/types";
import {
  TableWrap,
  SummaryBar,
  SummaryChip,
  Toolbar,
  TabGroup,
  TabBtn,
  ToolbarRight,
  SearchWrap,
  SearchInput,
  CopyBtn,
  ScrollWrap,
  Table,
  Thead,
  Th,
  Td,
  DataRow,
  ExpandCell,
  UrlCell,
  UrlText,
  UrlAnchor,
  SubLine,
  PillSpan,
  CautionBadge,
  ExpandedTd,
  ExpandedGrid,
  ExpandedFieldLabel,
  ExpandedValue,
  FooterBar,
  FooterLeft,
  PaginationWrap,
  PageBtn,
  PageSizeSelect,
  EmptyRow,
  EmptyTd,
  IconWrap,
  ExecutionBadge,
} from "./ResultsTable.styles";

type TabFilter = "all" | "broken" | "working";
type LinkTypeFilter = "all" | "internal" | "external" | "canonical";
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const PAGINATION_THRESHOLD = 25;

type Props = {
  results: LinkCheckResult[];
  scanTimer?: TimerState;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isBroken(r: LinkCheckResult): boolean {
  // Broken/Needs Review = anything that's not confirmed working
  // Includes truly broken links AND protected links that need manual verification
  return r.status !== "success" && r.status !== "rate_limited" && r.status !== "redirect";
}

function isWorking(r: LinkCheckResult): boolean {
  // Working = links that are confirmed accessible
  return r.status === "success" || r.status === "rate_limited" || r.status === "redirect";
}

function isProtected(r: LinkCheckResult): boolean {
  // Protected = links that may exist but block automated tools (403/405/999)
  // Used for styling the Issues badge, not for row background
  return r.status === "protected";
}

// Severity ranking for default sort (higher = more critical)
function getSeverity(r: LinkCheckResult): number {
  if (r.status === "unreachable") return 5; // Most critical - DNS/network failure
  if (r.status === "timeout") return 4; // Very critical - server not responding
  if (r.status === "server_error") return 3; // Critical - 5xx errors
  if (r.status === "client_error") return 2; // Important - 404, 400, etc.
  if (r.status === "protected") return 1; // Needs review - 403, 405, 999
  return 0; // Working - success, rate_limited, redirect
}

// ── Copy to clipboard helper ──────────────────────────────────────────────────

function buildLinkCopyText(results: LinkCheckResult[]): string {
  let text = "Link Validation Results\n";
  text += "=".repeat(80) + "\n\n";

  for (const result of results) {
    text += `URL: ${result.url}\n`;
    text += `Type: ${result.linkType}\n`;
    text += `Status: ${result.status}`;
    if (result.statusCode) text += ` (${result.statusCode})`;
    text += "\n";
    text += `Response Time: ${result.responseTime}ms\n`;
    text += `Found On: ${result.foundOn.length} page(s)\n`;

    if (result.redirectChain.length > 0) {
      text += `Redirect Chain: ${result.redirectChain.join(" → ")}\n`;
    }

    if (result.issues.length > 0) {
      text += `Issues:\n`;
      for (const issue of result.issues) {
        text += `  - [${issue.severity.toUpperCase()}] ${issue.message}\n`;
      }
    }

    text += "\n";
  }

  return text;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ result, t }: { result: LinkCheckResult; t: Tokens }) {
  const broken = isBroken(result);
  const protected_ = isProtected(result);
  const statusCode = result.statusCode ? ` (${result.statusCode})` : "";

  // Protected links (403/405/999) - needs manual review
  if (protected_) {
    return (
      <PillSpan $bg={t.warnBg} $color={t.warnText}>
        <RiErrorWarningLine size={12} />
        Needs Review{statusCode}
      </PillSpan>
    );
  }

  // Truly broken links (404, 500, timeout, unreachable)
  if (broken) {
    return (
      <PillSpan $bg={t.failBg} $color={t.failText}>
        <RiCloseCircleLine size={12} />
        Broken{statusCode}
      </PillSpan>
    );
  }

  // Working links (200, 429, 3xx) - always green, regardless of warnings
  // Issues column will show if there are any warnings
  return (
    <PillSpan $bg={t.passBg} $color={t.passText}>
      <RiCheckboxCircleLine size={12} />
      Working{statusCode}
    </PillSpan>
  );
}

function LinkTypeBadge({ linkType, t }: { linkType: LinkType; t: Tokens }) {
  const colors: Record<LinkType, { bg: string; text: string }> = {
    internal: { bg: t.passBg, text: t.passText },
    external: { bg: t.bgMuted, text: t.textMuted },
    canonical: { bg: t.btnActive, text: t.btnActiveTxt },
  };

  const { bg, text } = colors[linkType];
  const label = linkType.charAt(0).toUpperCase() + linkType.slice(1);

  return (
    <PillSpan $bg={bg} $color={text}>
      {label}
    </PillSpan>
  );
}

function ExpandedRow({ r, colSpan, t }: { r: LinkCheckResult; colSpan: number; t: Tokens }) {
  const [showAllFoundOn, setShowAllFoundOn] = useState(false);

  return (
    <tr>
      <ExpandedTd colSpan={colSpan} $bg={t.bgSubtle} $border={t.border}>
        <ExpandedGrid>
          <div>
            <ExpandedFieldLabel $color={t.textMuted}>Full URL</ExpandedFieldLabel>
            <ExpandedValue $color={t.text}>{r.url}</ExpandedValue>
          </div>

          <div>
            <ExpandedFieldLabel $color={t.textMuted}>
              Found On ({r.foundOn.length} page{r.foundOn.length !== 1 ? "s" : ""})
            </ExpandedFieldLabel>
            <ExpandedValue $color={t.text}>
              {(showAllFoundOn ? r.foundOn : r.foundOn.slice(0, 5)).map((page, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <UrlAnchor
                    href={page}
                    target="_blank"
                    rel="noreferrer"
                    $color={t.link}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {page}
                  </UrlAnchor>
                </div>
              ))}
              {r.foundOn.length > 5 && !showAllFoundOn && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: t.link,
                    cursor: "pointer",
                    marginTop: 8,
                    textDecoration: "underline",
                  }}
                  onClick={() => setShowAllFoundOn(true)}
                >
                  ... show {r.foundOn.length - 5} more
                </div>
              )}
              {showAllFoundOn && r.foundOn.length > 5 && (
                <div
                  style={{
                    fontStyle: "italic",
                    color: t.link,
                    cursor: "pointer",
                    marginTop: 8,
                    textDecoration: "underline",
                  }}
                  onClick={() => setShowAllFoundOn(false)}
                >
                  show less
                </div>
              )}
            </ExpandedValue>
          </div>

          {r.redirectChain.length > 0 && (
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>
                Redirect Chain ({r.redirectChain.length} hop
                {r.redirectChain.length !== 1 ? "s" : ""})
              </ExpandedFieldLabel>
              <ExpandedValue $color={t.text}>
                {r.redirectChain.map((url, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <IconWrap>
                      <RiCornerDownRightLine size={11} />
                      <UrlAnchor
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        $color={t.link}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {url}
                      </UrlAnchor>
                    </IconWrap>
                  </div>
                ))}
              </ExpandedValue>
            </div>
          )}

          {r.issues.length > 0 && (
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>
                Issues ({r.issues.length})
              </ExpandedFieldLabel>
              <ExpandedValue $color={t.text}>
                {r.issues.map((issue, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <CautionBadge
                      $bg={issue.severity === "error" ? t.failBg : t.warnBg}
                      $color={issue.severity === "error" ? t.failText : t.warnText}
                      $border={issue.severity === "error" ? t.rowFailBorder : t.warnBorder}
                    >
                      <RiErrorWarningLine size={11} />
                      {issue.severity.toUpperCase()}
                    </CautionBadge>
                    <span style={{ marginLeft: 8 }}>{issue.message}</span>
                  </div>
                ))}
              </ExpandedValue>
            </div>
          )}

          {r.finalUrl && r.finalUrl !== r.url && (
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>Final URL</ExpandedFieldLabel>
              <ExpandedValue $color={t.text}>
                <UrlAnchor
                  href={r.finalUrl}
                  target="_blank"
                  rel="noreferrer"
                  $color={t.link}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.finalUrl}
                </UrlAnchor>
              </ExpandedValue>
            </div>
          )}

          {r.error && (
            <div>
              <ExpandedFieldLabel $color={t.textMuted}>Error Details</ExpandedFieldLabel>
              <ExpandedValue $color={t.failText}>{r.error}</ExpandedValue>
            </div>
          )}
        </ExpandedGrid>
      </ExpandedTd>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LinkResultsTable({ results, scanTimer }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const [tab, setTab] = useState<TabFilter>("all");
  const [linkTypeFilter, setLinkTypeFilter] = useState<LinkTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [sortKey, setSortKey] = useState<"url" | "status" | "responseTime" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Counts ────────────────────────────────────────────────────────────────
  const brokenCount = useMemo(() => results.filter(isBroken).length, [results]);
  const workingCount = useMemo(() => results.filter(isWorking).length, [results]);
  const allWorking = brokenCount === 0;

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = results;

    // Filter by status tab
    if (tab === "broken") rows = rows.filter(isBroken);
    if (tab === "working") rows = rows.filter(isWorking);

    // Filter by link type
    if (linkTypeFilter !== "all") {
      rows = rows.filter((r) => r.linkType === linkTypeFilter);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.url.toLowerCase().includes(q));
    }

    return rows;
  }, [results, tab, linkTypeFilter, search]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    // Default sort: prioritize broken links (by severity) when no manual sort is active
    if (!sortKey) {
      return [...filtered].sort((a, b) => {
        const severityA = getSeverity(a);
        const severityB = getSeverity(b);

        // Sort by severity (descending - most critical first)
        if (severityA !== severityB) {
          return severityB - severityA;
        }

        // If same severity, sort by URL (ascending)
        return a.url.localeCompare(b.url);
      });
    }

    // Manual sort by user-selected column
    return [...filtered].sort((a, b) => {
      let av: number | string = 0,
        bv: number | string = 0;
      if (sortKey === "url") {
        av = a.url;
        bv = b.url;
      }
      if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      }
      if (sortKey === "responseTime") {
        av = a.responseTime;
        bv = b.responseTime;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const showPagination = sorted.length > PAGINATION_THRESHOLD;

  function handleTabChange(next: TabFilter) {
    setTab(next);
    setPage(1);
    setOpenUrl(null);
  }

  function handleLinkTypeFilterChange(next: LinkTypeFilter) {
    setLinkTypeFilter(next);
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
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildLinkCopyText(results)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleRow(url: string) {
    setOpenUrl((prev) => (prev === url ? null : url));
  }

  const sortIndicator = (key: typeof sortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const toolbarBg = allWorking ? t.toolbarPassBg : t.toolbarFailBg;

  const tabDefs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: results.length },
    { key: "broken", label: "Broken/Needs Review", count: brokenCount },
    { key: "working", label: "Working", count: workingCount },
  ];

  return (
    <TableWrap
      data-testid="link-results-table"
      className="link-results-table"
      $border={t.border}
      $bg={t.bg}
    >
      {/* ── Summary bar ── */}
      <SummaryBar data-testid="link-results-summary" $bg={t.bgSubtle} $border={t.border}>
        <SummaryChip $color={t.textMuted}>
          <RiCheckboxCircleLine size={12} style={{ opacity: 0.5 }} />
          {results.length} links
        </SummaryChip>
        {brokenCount > 0 && (
          <SummaryChip $color={t.failText}>
            <RiCloseCircleLine size={12} />
            {brokenCount} Broken/Needs Review
          </SummaryChip>
        )}
        <SummaryChip $color={t.passText}>
          <RiCheckboxCircleLine size={12} />
          {workingCount} Working
        </SummaryChip>
        {scanTimer?.duration != null && scanTimer.status != null && (
          <SummaryChip $color={t.textFaint}>
            · {executionLabel(scanTimer.status, formatDuration(scanTimer.duration), "Scanned")}
          </SummaryChip>
        )}
      </SummaryBar>

      {/* ── Toolbar: tabs + search + copy ── */}
      <Toolbar data-testid="link-results-toolbar" $border={t.border} $bg={toolbarBg}>
        <TabGroup data-testid="link-filter-tabs">
          {tabDefs.map(({ key, label, count }) => {
            const disabled = count === 0 && key !== "all";
            return (
              <TabBtn
                key={key}
                data-testid={`link-filter-tab-${key}`}
                className={`link-filter-tab ${tab === key && !disabled ? "active" : ""}`}
                onClick={() => {
                  if (!disabled) handleTabChange(key);
                }}
                disabled={disabled}
                $active={tab === key && !disabled}
                $disabled={disabled}
                $activeBg={t.btnActive}
                $idleBg={t.btnIdle}
                $activeTxt={t.btnActiveTxt}
                $idleTxt={t.btnIdleTxt}
                $border={t.border}
              >
                {label} ({count})
              </TabBtn>
            );
          })}
        </TabGroup>

        <ToolbarRight>
          {/* Link Type Filter Dropdown */}
          <PageSizeSelect
            data-testid="link-type-filter"
            value={linkTypeFilter}
            onChange={(e) => handleLinkTypeFilterChange(e.target.value as LinkTypeFilter)}
            $border={t.border}
            $bg={t.bgMuted}
            $color={t.text}
          >
            <option value="all">All Types</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="canonical">Canonical</option>
          </PageSizeSelect>

          <SearchWrap data-testid="link-search-wrap" $border={t.border} $bg={t.bg}>
            <RiSearchLine size={13} color={t.textFaint} />
            <SearchInput
              data-testid="link-search-input"
              className="link-search-input"
              placeholder="Search URLs…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              $color={t.text}
              $bg={t.bg}
            />
          </SearchWrap>
          <CopyBtn
            data-testid="copy-link-results-btn"
            onClick={handleCopy}
            $copied={copied}
            $passBg={t.passBg}
            $idleBg={t.btnIdle}
            $passTxt={t.passText}
            $idleTxt={t.btnIdleTxt}
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
                $bg={t.headerBg}
                $border={t.border}
                $color={t.textMuted}
                $sortable
                onClick={() => handleSort("url")}
              >
                Link URL{sortIndicator("url")}
              </Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
                Link Type
              </Th>
              <Th
                $bg={t.headerBg}
                $border={t.border}
                $color={t.textMuted}
                $align="center"
                $sortable
                onClick={() => handleSort("status")}
              >
                Status{sortIndicator("status")}
              </Th>
              <Th
                $bg={t.headerBg}
                $border={t.border}
                $color={t.textMuted}
                $align="center"
                $sortable
                onClick={() => handleSort("responseTime")}
              >
                Response Time{sortIndicator("responseTime")}
              </Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">
                Issues
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
                const isOpen = openUrl === r.url;
                const rowClass = isBroken(r) ? "broken" : "working";
                const rowBg = isBroken(r) ? t.rowFail : t.rowOk;
                const rowBorder = isBroken(r) ? t.rowFailBorder : t.border;

                return (
                  <Fragment key={r.url}>
                    <DataRow
                      data-testid={`link-result-row-${r.url}`}
                      className={`link-result-row ${rowClass} ${isOpen ? "expanded" : ""}`}
                      $bg={rowBg}
                      $open={isOpen}
                      $accentColor={t.btnActive}
                      $failed={isBroken(r)}
                      $failBorder={rowBorder}
                      onClick={() => toggleRow(r.url)}
                    >
                      <ExpandCell $border={t.border} $color={t.textFaint} $align="center">
                        {isOpen ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </ExpandCell>
                      <UrlCell $border={t.border} $color={t.text}>
                        <UrlText>
                          <UrlAnchor
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            $color={t.link}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.url}
                          </UrlAnchor>
                        </UrlText>
                        <SubLine $color={t.textMuted}>
                          Found on: {r.foundOn.length} page{r.foundOn.length !== 1 ? "s" : ""}
                        </SubLine>
                        {r.redirectChain.length > 0 && (
                          <SubLine $color={t.textMuted}>
                            <IconWrap>
                              <RiCornerDownRightLine size={11} />
                              {r.redirectChain.length} redirect
                              {r.redirectChain.length !== 1 ? "s" : ""}
                            </IconWrap>
                          </SubLine>
                        )}
                        {r.error && (
                          <SubLine $color={t.failText}>
                            <IconWrap>
                              <RiErrorWarningLine size={11} /> {r.error}
                            </IconWrap>
                          </SubLine>
                        )}
                      </UrlCell>

                      <Td $border={t.border} $color={t.text} $align="center">
                        <LinkTypeBadge linkType={r.linkType} t={t} />
                      </Td>

                      <Td $border={t.border} $color={t.text} $align="center">
                        <StatusPill result={r} t={t} />
                      </Td>

                      <Td $border={t.border} $color={t.text} $align="center">
                        {r.responseTime}ms
                      </Td>

                      <Td $border={t.border} $color={t.text} $align="center">
                        {r.issues.length > 0 ? (
                          <CautionBadge
                            $bg={isBroken(r) ? t.failBg : t.warnBg}
                            $color={isBroken(r) ? t.failText : t.warnText}
                            $border={isBroken(r) ? t.rowFailBorder : t.warnBorder}
                          >
                            <RiErrorWarningLine size={11} />
                            {r.issues.length}
                          </CautionBadge>
                        ) : (
                          <span style={{ color: t.textFaint }}>—</span>
                        )}
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
        <FooterLeft $color={allWorking ? t.successText : t.warnText}>
          <IconWrap>
            {allWorking ? <RiCheckboxCircleLine size={14} /> : <RiCloseCircleLine size={14} />}
            {allWorking
              ? `All ${results.length} links are working.`
              : `${brokenCount} of ${results.length} links are broken.`}
          </IconWrap>
          {sorted.length !== results.length && (
            <ExecutionBadge $color={t.textFaint}>· showing {sorted.length} filtered</ExecutionBadge>
          )}
        </FooterLeft>

        {showPagination && (
          <PaginationWrap>
            <PageSizeSelect
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
              $border={t.border}
              $bg={t.bgMuted}
              $color={t.text}
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </PageSizeSelect>

            <PageBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              $border={t.border}
              $bg={t.bgMuted}
              $color={t.text}
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
                  <span
                    key={`ellipsis-${i}`}
                    style={{ color: t.textFaint, fontSize: 12, padding: "0 2px" }}
                  >
                    …
                  </span>
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
              $border={t.border}
              $bg={t.bgMuted}
              $color={t.text}
            >
              <RiArrowRightSLine size={14} />
            </PageBtn>
          </PaginationWrap>
        )}
      </FooterBar>
    </TableWrap>
  );
}
