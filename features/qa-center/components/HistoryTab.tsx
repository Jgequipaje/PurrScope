"use client";

import { useTheme, tokens } from "@/lib/theme";
import type { Issue } from "../types";
import { sortHistory } from "../services/historyService";
import { formatTimestamp, formatStatus } from "../utils/formatters";
import EmptyState from "./EmptyState";

type Props = { issues: Issue[] };

export default function HistoryTab({ issues }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const allHistory = issues
    .flatMap((i) => i.history.map((h) => ({ ...h, issueTitle: i.title })))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (allHistory.length === 0) {
    return <EmptyState message="No history yet" sub="Status changes and updates will appear here." />;
  }

  return (
    <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
      {allHistory.map((entry) => (
        <div key={entry.id} style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${t.border}`,
          fontSize: 12,
        }}>
          <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 2 }}>
            {formatTimestamp(entry.timestamp)} · {entry.actor}
          </div>
          <div style={{ color: t.text }}>
            <span style={{ color: t.textFaint }}>{entry.issueTitle}</span>
            {" — "}{entry.field}: <span style={{ color: t.failText }}>{formatStatus(entry.from as any)}</span>
            {" → "}<span style={{ color: t.passText }}>{formatStatus(entry.to as any)}</span>
          </div>
          {entry.note && <div style={{ color: t.textFaint, fontSize: 11, marginTop: 2 }}>{entry.note}</div>}
        </div>
      ))}
    </div>
  );
}
