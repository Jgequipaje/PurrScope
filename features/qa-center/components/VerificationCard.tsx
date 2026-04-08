"use client";

import { useTheme, tokens } from "@/lib/theme";
import type { VerificationEvent } from "../types";

type Props = {
  event: VerificationEvent;
  selected: boolean;
  onClick: () => void;
};

const RESULT_COLORS: Record<string, { text: string; bg: string }> = {
  passed:  { text: "#4ade80", bg: "#052e16" },
  failed:  { text: "#f87171", bg: "#450a0a" },
  skipped: { text: "#a1a1aa", bg: "#18181b" },
  pending: { text: "#fbbf24", bg: "#1c1400" },
};

export default function VerificationCard({ event, selected, onClick }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const colors = RESULT_COLORS[event.result] ?? RESULT_COLORS.pending;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${t.border}`,
        background: selected ? t.bgMuted : "transparent",
        cursor: "pointer",
        borderLeft: selected ? `3px solid ${t.accent}` : "3px solid transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.issueTitle}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 20,
          background: colors.bg, color: colors.text, flexShrink: 0,
        }}>
          {event.result}
        </span>
      </div>
      {event.message && (
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 3 }}>{event.message}</div>
      )}
      <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
        {new Date(event.runAt).toLocaleString()}
        {event.durationMs !== undefined && ` · ${event.durationMs}ms`}
      </div>
    </div>
  );
}
