"use client";

import { useState } from "react";
import { useTheme, tokens } from "@/lib/theme";
import { useQACenterStore } from "../store/useQACenterStore";
import IssueCard from "./IssueCard";
import IssueDetail from "./IssueDetail";
import ImportedIssueDetail from "./ImportedIssueDetail";
import NewIssueForm from "./NewIssueForm";
import EmptyState from "./EmptyState";
import ImportIssuesModal from "./ImportIssuesModal";

export default function QADrawer() {
  const { theme } = useTheme();
  const t = tokens[theme];
  const [showImport, setShowImport] = useState(false);

  const {
    isDrawerOpen, closeDrawer,
    issues, filters, setFilters, clearFilters,
    selectedIssueId, selectIssue,
    isCreating, openCreateForm, closeCreateForm,
  } = useQACenterStore();

  if (!isDrawerOpen) return null;

  // Apply filters
  const visible = issues.filter((i) => {
    if (filters.status && i.status !== filters.status) return false;
    if (filters.severity && i.severity !== filters.severity) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !(i.area?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const selectedIssue = selectedIssueId ? issues.find((i) => i.id === selectedIssueId) ?? null : null;
  const openCount = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;

  return (
    <>
      {/* Backdrop */}
      <div onClick={closeDrawer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 999 }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(440px, 100vw)",
        background: t.bg, borderLeft: `1px solid ${t.border}`,
        zIndex: 1000, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>PurrScope QA Center</div>
            <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
              {openCount > 0 ? `${openCount} active issue${openCount > 1 ? "s" : ""}` : "No active issues"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isCreating && !selectedIssue && (
              <>
                <button
                  onClick={() => setShowImport(true)}
                  style={{ padding: "5px 10px", fontSize: 12, fontWeight: 600, background: t.btnIdle, color: t.btnIdleTxt, border: `1px solid ${t.border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Import
                </button>
                <button
                  onClick={openCreateForm}
                  style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, background: t.btnActive, color: t.btnActiveTxt, border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}
                >
                  + New Issue
                </button>
              </>
            )}
            <button onClick={closeDrawer} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 18, lineHeight: 1, padding: "4px 6px" }}>✕</button>
          </div>
        </div>

        {/* Filter bar — only shown on list view */}
        {!isCreating && !selectedIssue && (
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search issues..."
              value={filters.search ?? ""}
              onChange={(e) => setFilters({ search: e.target.value || undefined })}
              style={{ flex: 1, minWidth: 120, padding: "4px 8px", fontSize: 12, background: t.bg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, fontFamily: "inherit", outline: "none" }}
            />
            <select
              value={filters.status ?? ""}
              onChange={(e) => setFilters({ status: (e.target.value as any) || undefined })}
              style={{ padding: "4px 8px", fontSize: 12, background: t.bgSubtle, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, fontFamily: "inherit" }}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="ready_for_qa">Ready for QA</option>
              <option value="verified">Verified</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filters.severity ?? ""}
              onChange={(e) => setFilters({ severity: (e.target.value as any) || undefined })}
              style={{ padding: "4px 8px", fontSize: 12, background: t.bgSubtle, color: t.text, border: `1px solid ${t.border}`, borderRadius: 6, fontFamily: "inherit" }}
            >
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            {(filters.status || filters.severity || filters.search) && (
              <button onClick={clearFilters} style={{ fontSize: 11, color: t.link, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {isCreating && <NewIssueForm onClose={closeCreateForm} />}

          {!isCreating && selectedIssue && (
            selectedIssue.origin === "imported_markdown"
              ? <ImportedIssueDetail issue={selectedIssue} onClose={() => selectIssue(null)} />
              : <IssueDetail issue={selectedIssue} onClose={() => selectIssue(null)} />
          )}

          {!isCreating && !selectedIssue && (
            visible.length === 0
              ? <EmptyState message="No issues found" sub={issues.length === 0 ? "Click '+ New Issue' to log your first issue." : "No issues match the current filters."} />
              : <div style={{ overflowY: "auto", flex: 1 }}>
                  {visible.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      selected={selectedIssueId === issue.id}
                      onClick={() => selectIssue(issue.id)}
                    />
                  ))}
                </div>
          )}
        </div>
      </div>
      {showImport && <ImportIssuesModal onClose={() => setShowImport(false)} />}
    </>
  );
}

