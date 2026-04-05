"use client";

import { useState } from "react";
import { useTheme, tokens } from "@/lib/theme";
import type { Issue, IssueStatus } from "../types";
import { useQACenterStore } from "../store/useQACenterStore";
import { runLinkedTest } from "../services/issueApiService";

type Props = { issue: Issue; onClose: () => void };

const TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  open:         ["in_progress", "closed"],
  in_progress:  ["ready_for_qa", "open", "closed"],
  ready_for_qa: ["verified", "in_progress", "closed"],
  verified:     ["closed", "open"],
  closed:       ["open"],
};

const TRANSITION_LABEL: Partial<Record<IssueStatus, string>> = {
  in_progress:  "Start Progress",
  ready_for_qa: "Ready for QA",
  verified:     "Mark Verified",
  closed:       "Close",
  open:         "Re-open",
};

const RESULT_COLOR: Record<string, string> = {
  passed: "#4ade80", failed: "#f87171", not_run: "#9ca3af",
};

function fmtStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(ts: number | string) {
  return new Date(ts).toLocaleString();
}

export default function IssueDetail({ issue, onClose }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const { updateIssueStatus, updateIssue, deleteIssue, loadIssues } = useQACenterStore();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const available = TRANSITIONS[issue.status] ?? [];
  const autoResult = issue.automationStatus?.result ?? "not_run";
  const hasLinkedTest = !!issue.linkedTest;

  // Completion gating: "verified" requires linked test to have passed
  function canTransitionTo(to: IssueStatus): boolean {
    if (to !== "verified") return true;
    if (!hasLinkedTest) return false;
    return autoResult === "passed";
  }

  function blockReason(to: IssueStatus): string | null {
    if (to !== "verified") return null;
    if (!hasLinkedTest) return "A linked Playwright test is required before marking as verified.";
    if (autoResult !== "passed") return "The linked test must pass before this issue can be marked verified.";
    return null;
  }

  async function handleRunTest() {
    setRunning(true);
    setRunError(null);
    try {
      const updated = await runLinkedTest(issue.id);
      updateIssue(issue.id, {
        automationStatus: updated.automationStatus,
        updatedAt: updated.updatedAt,
      });
      // Reload to sync with file
      await loadIssues();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Failed to run test.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", overflowY: "auto", flex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1, marginRight: 8 }}>{issue.title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 16, padding: 0 }}>✕</button>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge label={fmtStatus(issue.status)} color={t.infoText} bg={t.infoBg} />
          {issue.severity && <Badge label={issue.severity} color={t.warnText} bg={t.warnBg} />}
          {issue.area && <Badge label={issue.area} color={t.textMuted} bg={t.bgMuted} />}
        </div>

        {/* Linked test + automation status */}
        {hasLinkedTest && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: t.bgSubtle, borderRadius: 8, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Linked Test</div>
            <div style={{ fontSize: 12, color: t.text, marginBottom: 6 }}>{issue.linkedTest!.fullTitle}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: RESULT_COLOR[autoResult] ?? t.textFaint }}>
                {autoResult === "not_run" ? "Not run yet" : autoResult === "passed" ? "✓ Passed" : "✕ Failed"}
              </span>
              {issue.automationStatus?.lastRun && (
                <span style={{ fontSize: 11, color: t.textFaint }}>
                  · {fmtDate(issue.automationStatus.lastRun)}
                </span>
              )}
            </div>

            {issue.automationStatus?.message && autoResult === "failed" && (
              <pre style={{
                fontSize: 11, color: t.failText, marginTop: 6,
                background: t.failBg, padding: "8px 10px", borderRadius: 6,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                margin: "6px 0 0", fontFamily: "inherit", lineHeight: 1.5,
              }}>
                {issue.automationStatus.message}
              </pre>
            )}

            {runError && <div style={{ fontSize: 11, color: t.failText, marginTop: 4 }}>{runError}</div>}
          </div>
        )}

        {/* Issue fields */}
        {issue.description && <Field label="Description" t={t}>{issue.description}</Field>}
        {issue.reproSteps && <Field label="Repro Steps" t={t}><pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 11 }}>{issue.reproSteps}</pre></Field>}
        {(issue.expected || issue.actual) && (
          <Field label="Expected vs Actual" t={t}>
            {issue.expected && <div style={{ color: t.passText, fontSize: 12, marginBottom: 4 }}>Expected: {issue.expected}</div>}
            {issue.actual && <div style={{ color: t.failText, fontSize: 12 }}>Actual: {issue.actual}</div>}
          </Field>
        )}
        {issue.notes && <Field label="Notes" t={t}>{issue.notes}</Field>}

        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 12 }}>
          Created {fmtDate(issue.createdAt)} · Updated {fmtDate(issue.updatedAt)}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${t.border}`, background: t.bgSubtle, display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
        {/* Run test button */}
        {hasLinkedTest && (
          <button
            onClick={handleRunTest}
            disabled={running}
            style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
              fontFamily: "inherit", cursor: running ? "not-allowed" : "pointer",
              background: t.infoBg, color: t.infoText, border: `1px solid ${t.infoBorder}`,
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? "Running..." : "▶ Run Test"}
          </button>
        )}

        {/* Status transitions */}
        {available.map((to) => {
          const blocked = !canTransitionTo(to);
          const reason = blockReason(to);
          return (
            <button
              key={to}
              onClick={() => !blocked && updateIssueStatus(issue.id, to)}
              disabled={blocked}
              title={reason ?? undefined}
              style={{
                padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                fontFamily: "inherit", cursor: blocked ? "not-allowed" : "pointer",
                background: to === "verified" && !blocked ? t.btnActive : t.btnIdle,
                color: to === "verified" && !blocked ? t.btnActiveTxt : t.btnIdleTxt,
                border: to === "closed" ? `1px solid ${t.failText}` : `1px solid ${t.border}`,
                opacity: blocked ? 0.45 : 1,
              }}
            >
              {TRANSITION_LABEL[to] ?? fmtStatus(to)}
            </button>
          );
        })}

        {/* Gating message */}
        {available.includes("verified") && !canTransitionTo("verified") && (
          <div style={{ width: "100%", fontSize: 11, color: t.warnText, marginTop: 2 }}>
            {blockReason("verified")}
          </div>
        )}

        <button
          onClick={() => { deleteIssue(issue.id); onClose(); }}
          style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, fontFamily: "inherit", cursor: "pointer", background: "transparent", color: t.failText, border: `1px solid ${t.failText}` }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: bg, color, fontWeight: 600 }}>{label}</span>;
}

function Field({ label, children, t }: { label: string; children: React.ReactNode; t: any }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: t.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
