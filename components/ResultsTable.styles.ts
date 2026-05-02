"use client";

import styled, { keyframes, css } from "styled-components";

// ── Animations ────────────────────────────────────────────────────────────────

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ── Styled Components ─────────────────────────────────────────────────────────

export const TableWrap = styled.div<{ $border: string; $bg: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 10px;
  overflow: hidden;
  background: ${(p) => p.$bg};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
`;

// Summary bar
export const SummaryBar = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 10px 14px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  font-size: 12px;
  font-weight: 600;
`;

export const SummaryChip = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

// Toolbar: tabs + search + copy
export const Toolbar = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
`;

export const TabGroup = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

export const TabBtn = styled.button<{
  $active: boolean;
  $activeBg: string;
  $idleBg: string;
  $activeTxt: string;
  $idleTxt: string;
  $border: string;
  $disabled?: boolean;
}>`
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.4 : 1)};
  background: ${(p) => (p.$active && !p.$disabled ? p.$activeBg : p.$idleBg)};
  color: ${(p) => (p.$active && !p.$disabled ? p.$activeTxt : p.$idleTxt)};
  font-family: inherit;
  transition:
    background 0.15s,
    opacity 0.15s;
  &:not(:disabled):hover {
    opacity: 0.85;
  }
`;

export const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SearchWrap = styled.div<{ $border: string; $bg: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  background: ${(p) => p.$bg};
  padding: 3px 8px;
`;

export const SearchInput = styled.input<{ $color: string; $bg: string }>`
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: ${(p) => p.$color};
  font-family: inherit;
  width: 160px;
  &::placeholder {
    opacity: 0.5;
  }
`;

export const CopyBtn = styled.button<{
  $copied: boolean;
  $passBg: string;
  $idleBg: string;
  $passTxt: string;
  $idleTxt: string;
  $border: string;
}>`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${(p) => (p.$copied ? p.$passBg : p.$idleBg)};
  color: ${(p) => (p.$copied ? p.$passTxt : p.$idleTxt)};
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
`;

export const ScrollWrap = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 2;
`;

export const Th = styled.th<{
  $bg: string;
  $border: string;
  $color: string;
  $align?: string;
  $sortable?: boolean;
}>`
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
  cursor: ${(p) => (p.$sortable ? "pointer" : "default")};
  user-select: none;
  ${(p) =>
    p.$sortable &&
    css`
      &:hover {
        opacity: 0.8;
      }
    `}
`;

export const Td = styled.td<{ $border: string; $color: string; $align?: string }>`
  padding: 10px 14px;
  font-size: 13px;
  border-bottom: 1px solid ${(p) => p.$border};
  vertical-align: middle;
  color: ${(p) => p.$color};
  text-align: ${(p) => p.$align ?? "left"};
`;

export const DataRow = styled.tr<{
  $bg: string;
  $open: boolean;
  $accentColor: string;
  $failed: boolean;
  $failBorder: string;
}>`
  background: ${(p) => p.$bg};
  cursor: pointer;
  border-left: 3px solid ${(p) => (p.$failed ? p.$failBorder : "transparent")};
  box-shadow: ${(p) => (p.$open ? `inset 3px 0 0 ${p.$accentColor}` : "none")};
  animation: ${fadeIn} 0.15s ease both;
  transition: filter 0.1s;
  &:hover {
    filter: brightness(0.97);
  }
`;

export const ExpandCell = styled(Td)`
  user-select: none;
  padding-right: 0;
  width: 32px;
`;

export const UrlCell = styled(Td)`
  max-width: 320px;
`;

export const UrlText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
`;

export const UrlAnchor = styled.a<{ $color: string }>`
  color: ${(p) => p.$color};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

export const SubLine = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  margin-top: 2px;
`;

export const PillSpan = styled.span<{ $bg: string; $color: string }>`
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

export const LengthSpan = styled.span<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
`;

export const MissingSpan = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  font-style: italic;
`;

export const CautionBadge = styled.span<{ $bg: string; $color: string; $border: string }>`
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

export const ExpandedTd = styled.td<{ $bg: string; $border: string }>`
  padding: 12px 18px 16px 36px;
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$border};
  font-size: 13px;
`;

export const ExpandedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const ExpandedFieldLabel = styled.div<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`;

export const ExpandedValue = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
  line-height: 1.5;
  word-break: break-word;
`;

// Footer: summary + pagination
export const FooterBar = styled.div<{ $border: string; $bg: string }>`
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

export const FooterLeft = styled.div<{ $color: string }>`
  font-weight: 600;
  color: ${(p) => p.$color};
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const PaginationWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const PageBtn = styled.button<{
  $border: string;
  $bg: string;
  $color: string;
  $active?: boolean;
  $activeBg?: string;
  $activeTxt?: string;
}>`
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => (p.$active ? (p.$activeBg ?? p.$bg) : p.$bg)};
  color: ${(p) => (p.$active ? (p.$activeTxt ?? p.$color) : p.$color)};
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    opacity: 0.75;
  }
`;

export const PageSizeSelect = styled.select<{ $border: string; $bg: string; $color: string }>`
  padding: 3px 6px;
  font-size: 12px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  font-family: inherit;
  cursor: pointer;
`;

export const EmptyRow = styled.tr``;

export const EmptyTd = styled.td<{ $color: string; $border: string }>`
  padding: 3rem 1rem;
  text-align: center;
  color: ${(p) => p.$color};
  font-size: 13px;
  border-bottom: 1px solid ${(p) => p.$border};
`;

export const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const ExecutionBadge = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 400;
  color: ${(p) => p.$color};
  opacity: 0.8;
`;
