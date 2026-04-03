"use client";

import { useTheme, tokens } from "@/lib/theme";

type Counts = { failed: number; warning: number; passed: number; skipped: number };

type Props = {
  counts: Counts;
  showPassed: boolean;
  onTogglePassed: (v: boolean) => void;
};

export default function FailuresSummaryBar({ counts, showPassed, onTogglePassed }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <div style={{
      padding: "8px 14px",
      borderBottom: `1px solid ${t.border}`,
      background: t.bgSubtle,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
      flexShrink: 0,
    }}>
      {/* Counts */}
      <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ color: t.failText, fontWeight: 600 }}>
          ✕ {counts.failed} Failed
        </span>
        <span style={{ color: t.warnText, fontWeight: 600 }}>
          ◆ {counts.warning} Warning{counts.warning !== 1 ? "s" : ""}
        </span>
        <span style={{ color: t.textFaint }}>
          ✓ {counts.passed} Passed
        </span>
      </div>

      {/* Show Passed toggle */}
      <label style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: t.textMuted, cursor: "pointer",
        userSelect: "none",
      }}>
        <input
          type="checkbox"
          checked={showPassed}
          onChange={(e) => onTogglePassed(e.target.checked)}
          style={{ cursor: "pointer", accentColor: t.btnActive }}
        />
        Show Passed
      </label>
    </div>
  );
}
