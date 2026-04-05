"use client";

import { useTheme, tokens } from "@/lib/theme";
import { useQACenterStore } from "../store/useQACenterStore";

export default function QAFloatingButton() {
  const { theme } = useTheme();
  const t = tokens[theme];
  const { isDrawerOpen, openDrawer, closeDrawer, issues, loadIssues } = useQACenterStore();

  const openCount = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;

  function handleOpen() {
    openDrawer();
    loadIssues();
  }

  return (
    <button
      onClick={isDrawerOpen ? closeDrawer : handleOpen}
      title="PurrScope QA Center"
      style={{
        position: "fixed", top: 16, right: 16, zIndex: 998,
        width: 42, height: 42, borderRadius: "50%",
        background: isDrawerOpen ? t.bgMuted : t.btnActive,
        color: isDrawerOpen ? t.textMuted : t.btnActiveTxt,
        border: `1px solid ${t.border}`, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        transition: "background 0.15s",
        fontFamily: "inherit",
      }}
    >
      {isDrawerOpen ? "✕" : "QA"}
      {!isDrawerOpen && openCount > 0 && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          background: t.failText, color: "#fff",
          borderRadius: "50%", width: 16, height: 16,
          fontSize: 9, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${t.bg}`,
        }}>
          {openCount > 9 ? "9+" : openCount}
        </span>
      )}
    </button>
  );
}
