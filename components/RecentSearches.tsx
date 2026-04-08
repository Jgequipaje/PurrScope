"use client";

import styled from "styled-components";
import { RiDeleteBinLine, RiTimeLine, RiGlobalLine, RiListCheck } from "react-icons/ri";
import { useTheme, tokens } from "@/lib/theme";
import { entryLabel } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

type Props = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
};

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div` margin-bottom: 1.5rem; `;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SectionTitle = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
`;

const ClearBtn = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${(p) => p.$color};
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-family: inherit;
  opacity: 0.8;
  &:hover { opacity: 1; }
`;

const EmptyText = styled.p<{ $color: string }>`
  font-size: 13px;
  color: ${(p) => p.$color};
  margin: 0;
  font-style: italic;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EntryBtn = styled.button<{ $border: string; $bg: string; $color: string }>`
  width: 100%;
  text-align: left;
  /* padding: 7px 12px; */
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  font-family: inherit;
  transition: filter 0.12s, transform 0.1s;
  &:hover { filter: brightness(0.96); }
  &:active { transform: scale(0.99); }
`;

const Badge = styled.span<{ $bg: string; $color: string }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
`;

const EntryLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const TimeStamp = styled.span<{ $color: string }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: ${(p) => p.$color};
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecentSearches({ entries, onSelect, onClear }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <Wrap>
      <Header>
        <SectionTitle $color={t.textMuted}>
          <RiTimeLine size={14} /> Recent Searches
        </SectionTitle>
        {entries.length > 0 && (
          <ClearBtn onClick={onClear} $color={t.textFaint}>
            <RiDeleteBinLine size={13} /> Clear
          </ClearBtn>
        )}
      </Header>

      {entries.length === 0 && (
        <EmptyText $color={t.textFaint}>No recent searches yet.</EmptyText>
      )}

      {entries.length > 0 && (
        <List>
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryBtn
                onClick={() => onSelect(entry)}
                title={entry.value}
                $border={t.border}
                $bg={t.bgSubtle}
                $color={t.text}
              >
                <Badge
                  $bg={entry.type === "url" ? t.passBg : t.bgMuted}
                  $color={entry.type === "url" ? t.passText : t.textMuted}
                >
                  {entry.type === "url" ? <RiGlobalLine size={11} /> : <RiListCheck size={11} />}
                  {entry.type === "url" ? "URL" : "Manual"}
                </Badge>
                <EntryLabel>{entryLabel(entry)}</EntryLabel>
                <TimeStamp $color={t.textFaint}>
                  <RiTimeLine size={11} />{relativeTime(entry.createdAt)}
                </TimeStamp>
              </EntryBtn>
            </li>
          ))}
        </List>
      )}
    </Wrap>
  );
}
