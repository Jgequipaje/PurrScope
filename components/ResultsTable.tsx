"use client";

import { useState, Fragment } from "react";
import styled from "styled-components";
import {
  RiCheckboxCircleFill, RiCloseCircleFill, RiProhibitedLine,
  RiAlertLine, RiCornerDownRightLine,
  RiArrowDownSLine, RiArrowUpSLine,
  RiFileCopyLine, RiCheckLine,
} from "react-icons/ri";
import { buildCopyText } from "@/lib/copy";
import { useTheme, tokens } from "@/lib/theme";
import { formatDuration, executionLabel } from "@/lib/duration";
import type { Tokens } from "@/lib/theme";
import type { TimerState } from "@/lib/duration";
import type { ScanResult, ResultFilter } from "@/lib/types";

type Props = {
  results: ScanResult[];
  scanTimer?: TimerState;
};

// ── Styled primitives ─────────────────────────────────────────────────────────

const TableWrap = styled.div<{ $border: string; $bg: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 10px;
  overflow: hidden;
  background: ${(p) => p.$bg};
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
`;

const Toolbar = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
`;

const ToolbarLeft = styled.div` display: flex; gap: 6px; `;

const FilterBtn = styled.button<{ $active: boolean; $activeBg: string; $idleBg: string; $activeTxt: string; $idleTxt: string; $border: string; $disabled?: boolean }>`
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  cursor: ${(p) => p.$disabled ? "not-allowed" : "pointer"};
  opacity: ${(p) => p.$disabled ? 0.4 : 1};
  background: ${(p) => (p.$active && !p.$disabled ? p.$activeBg : p.$idleBg)};
  color: ${(p) => (p.$active && !p.$disabled ? p.$activeTxt : p.$idleTxt)};
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  &:not(:disabled):hover { opacity: 0.85; }
  &:not(:disabled):active { transform: scale(0.97); }
`;

const CopyBtn = styled.button<{ $copied: boolean; $passBg: string; $idleBg: string; $passTxt: string; $idleTxt: string; $border: string }>`
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  background: ${(p) => (p.$copied ? p.$passBg : p.$idleBg)};
  color: ${(p) => (p.$copied ? p.$passTxt : p.$idleTxt)};
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  &:hover { opacity: 0.85; }
  &:active { transform: scale(0.97); }
`;

const ScrollWrap = styled.div` overflow-x: auto; `;

const Table = styled.table` width: 100%; border-collapse: collapse; `;

const Th = styled.th<{ $bg: string; $border: string; $color: string; $align?: string }>`
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.$color};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  white-space: nowrap;
  text-align: ${(p) => p.$align ?? "left"};
`;

const Td = styled.td<{ $border: string; $color: string; $align?: string }>`
  padding: 11px 14px;
  font-size: 13px;
  border-bottom: 1px solid ${(p) => p.$border};
  vertical-align: middle;
  color: ${(p) => p.$color};
  text-align: ${(p) => p.$align ?? "left"};
`;

const DataRow = styled.tr<{ $bg: string; $open: boolean; $accentColor: string }>`
  background: ${(p) => p.$bg};
  cursor: pointer;
  box-shadow: ${(p) => p.$open ? `inset 3px 0 0 ${p.$accentColor}` : "none"};
  transition: filter 0.12s;
  &:hover { filter: brightness(0.97); }
`;

const ExpandCell = styled(Td)`
  user-select: none;
  padding-right: 0;
  width: 32px;
`;

const UrlCell = styled(Td)` max-width: 300px; word-break: break-all; `;

const UrlAnchor = styled.a<{ $color: string }>`
  color: ${(p) => p.$color};
  text-decoration: none;
`;

const SubLine = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  margin-top: 2px;
`;

const PillSpan = styled.span<{ $bg: string; $color: string }>`
  display: inline-block;
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
`;

const Footer = styled.div<{ $border: string; $bg: string; $color: string }>`
  padding: 10px 14px;
  border-top: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
`;

const ExecutionBadge = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 400;
  color: ${(p) => p.$color};
  margin-left: 10px;
  opacity: 0.8;
`;

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ status, t }: { status: "Pass" | "Fail"; t: Tokens }) {
  const pass = status === "Pass";
  return (
    <PillSpan $bg={pass ? t.passBg : t.failBg} $color={pass ? t.passText : t.failText}>
      <IconWrap>
        {pass ? <RiCheckboxCircleFill size={13} /> : <RiCloseCircleFill size={13} />}
        {pass ? "Pass" : "Fail"}
      </IconWrap>
    </PillSpan>
  );
}

function BlockedPill({ t }: { t: Tokens }) {
  return (
    <PillSpan $bg={t.bgMuted} $color={t.textMuted}>
      <IconWrap><RiProhibitedLine size={13} /> Blocked</IconWrap>
    </PillSpan>
  );
}

function ExpandedRow({ r, colSpan, t }: { r: ScanResult; colSpan: number; t: Tokens }) {
  const isBlocked = r.scanStatus === "Blocked (automation)";
  return (
    <tr>
      <ExpandedTd colSpan={colSpan} $bg={t.bgSubtle} $border={t.border}>
        {isBlocked ? (
          <ExpandedValue $color={t.textMuted} style={{ fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
            <RiProhibitedLine size={14} /> This page was blocked by bot protection or an interstitial. SEO metadata could not be extracted.
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

  const [filter, setFilter] = useState<ResultFilter>("all");
  const [copied, setCopied] = useState(false);
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  const failCount = results.filter(
    (r) => r.scanStatus === "Blocked (automation)" || r.titleStatus === "Fail" || r.descriptionStatus === "Fail" || r.error
  ).length;

  // Auto-reset active filter if its count drops to zero
  const tabCounts: Record<ResultFilter, number> = { all: results.length, failed: failCount };
  if (filter !== "all" && tabCounts[filter] === 0) {
    setFilter("all");
  }

  const visible = filter === "failed"
    ? results.filter((r) => r.scanStatus === "Blocked (automation)" || r.titleStatus === "Fail" || r.descriptionStatus === "Fail" || r.error)
    : results;

  const allPass = failCount === 0;

  function handleCopy() {
    navigator.clipboard.writeText(buildCopyText(results)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Toggle: open clicked row, close if already open
  function toggleRow(url: string) {
    setOpenUrl((prev) => (prev === url ? null : url));
  }

  const toolbarBg = allPass ? t.toolbarPassBg : t.toolbarFailBg;

  return (
    <TableWrap $border={t.border} $bg={t.bg}>
      <Toolbar $border={t.border} $bg={toolbarBg}>
        <ToolbarLeft>
          {(["all", "failed"] as ResultFilter[]).map((f) => {
            const count = tabCounts[f];
            const isDisabled = count === 0;
            return (
              <FilterBtn
                key={f}
                onClick={() => { if (!isDisabled) setFilter(f); }}
                disabled={isDisabled}
                $active={filter === f && !isDisabled}
                $disabled={isDisabled}
                $activeBg={t.btnActive} $idleBg={t.btnIdle}
                $activeTxt={t.btnActiveTxt} $idleTxt={t.btnIdleTxt}
                $border={t.border}
              >
                {f === "all" ? `All (${results.length})` : `Failed (${failCount})`}
              </FilterBtn>
            );
          })}
        </ToolbarLeft>
        <CopyBtn
          onClick={handleCopy}
          $copied={copied}
          $passBg={t.passBg} $idleBg={t.btnIdle}
          $passTxt={t.passText} $idleTxt={t.btnIdleTxt}
          $border={t.border}
        >
          <IconWrap>
            {copied ? <RiCheckLine size={14} /> : <RiFileCopyLine size={14} />}
            {copied ? "Copied!" : "Copy Results"}
          </IconWrap>
        </CopyBtn>
      </Toolbar>

      <ScrollWrap>
        <Table>
          <thead>
            <tr>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} style={{ width: 32 }} />
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted}>URL</Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">Title Length</Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">Title Status</Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">Desc. Length</Th>
              <Th $bg={t.headerBg} $border={t.border} $color={t.textMuted} $align="center">Desc. Status</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isBlocked = r.scanStatus === "Blocked (automation)";
              const rowFailed = isBlocked || r.titleStatus === "Fail" || r.descriptionStatus === "Fail" || r.error;
              const isOpen = openUrl === r.url;
              return (
                <Fragment key={r.url}>
                  <DataRow $bg={rowFailed ? t.rowFail : t.rowOk} $open={isOpen} $accentColor={t.btnActive} onClick={() => toggleRow(r.url)}>
                    <ExpandCell $border={t.border} $color={t.textFaint} $align="center">
                      {isOpen ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                    </ExpandCell>
                    <UrlCell $border={t.border} $color={t.text}>
                      <UrlAnchor href={r.url} target="_blank" rel="noreferrer" $color={t.link} onClick={(e) => e.stopPropagation()}>
                        {r.url}
                      </UrlAnchor>
                      {r.finalUrl && r.finalUrl !== r.url && (
                        <SubLine $color={t.textMuted}>
                          <IconWrap><RiCornerDownRightLine size={11} /> redirected to{" "}
                            <UrlAnchor href={r.finalUrl} target="_blank" rel="noreferrer" $color={t.textMuted} onClick={(e) => e.stopPropagation()}>
                              {r.finalUrl}
                            </UrlAnchor>
                          </IconWrap>
                        </SubLine>
                      )}
                      {r.methodUsed && <SubLine $color={t.textFaint}>via {r.methodUsed}</SubLine>}
                      {r.attempts !== undefined && r.attempts > 1 && (
                        <SubLine $color={t.warnText}><IconWrap><RiAlertLine size={11} /> needed {r.attempts} attempts</IconWrap></SubLine>
                      )}
                      {r.error && <SubLine $color={t.failText}><IconWrap><RiAlertLine size={11} /> {r.error}</IconWrap></SubLine>}
                    </UrlCell>

                    <Td $border={t.border} $color={t.text} $align="center">
                      {isBlocked ? <MissingSpan $color={t.textFaint}>—</MissingSpan> :
                        r.title
                          ? <LengthSpan $color={r.titleStatus === "Pass" ? t.passText : t.failText}>{r.titleLength} chars</LengthSpan>
                          : <MissingSpan $color={t.textFaint}>(missing)</MissingSpan>}
                    </Td>
                    <Td $border={t.border} $color={t.text} $align="center">
                      {isBlocked ? <BlockedPill t={t} /> : <Pill status={r.titleStatus} t={t} />}
                    </Td>

                    <Td $border={t.border} $color={t.text} $align="center">
                      {isBlocked ? <MissingSpan $color={t.textFaint}>—</MissingSpan> :
                        r.description
                          ? <LengthSpan $color={r.descriptionStatus === "Pass" ? t.passText : t.failText}>{r.descriptionLength} chars</LengthSpan>
                          : <MissingSpan $color={t.textFaint}>(missing)</MissingSpan>}
                    </Td>
                    <Td $border={t.border} $color={t.text} $align="center">
                      {isBlocked ? <BlockedPill t={t} /> : <Pill status={r.descriptionStatus} t={t} />}
                    </Td>
                  </DataRow>
                  {isOpen && <ExpandedRow r={r} colSpan={6} t={t} />}
                </Fragment>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <Td colSpan={6} $border={t.border} $color={t.textFaint} $align="center" style={{ padding: "2rem" }}>
                  No issues detected — this filter is clear.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </ScrollWrap>

      <Footer $border={t.border} $bg={toolbarBg} $color={allPass ? t.successText : t.warnText}>
        <IconWrap>
          {allPass ? <RiCheckboxCircleFill size={14} /> : <RiCloseCircleFill size={14} />}
          {allPass
            ? `Scan complete — all ${results.length} pages passed.`
            : `${failCount} of ${results.length} pages need attention.`}
        </IconWrap>
        {scanTimer?.duration != null && scanTimer.status != null && (
          <ExecutionBadge $color={t.textMuted}>
            · {executionLabel(scanTimer.status, formatDuration(scanTimer.duration), "Scanned")}
          </ExecutionBadge>
        )}
      </Footer>
    </TableWrap>
  );
}
