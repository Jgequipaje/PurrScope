"use client";

import { useTheme, tokens } from "@/lib/theme";
import type { Issue, IssueStatus } from "../types";
import { useQACenterStore } from "../store/useQACenterStore";

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

function fmtStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function IssueDetail({ issue, onClose }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const { updateIssueStatus, deleteIssue } = useQACenterStore();

  const available = TRANSITIONS[issue.status] ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Scrollable body */}
      <div style={{ padding: "14px 16px", overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1, marginRight: 8 }}>{issue.title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: 16, padding: 0 }}>✕</button>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge label={fmtStatus(issue.status)} color={t.infoText} bg={t.infoBg} />
          <Badge label={issue.severity} color={t.warnText} bg={t.warnBg} />
          {issue.area && <Badge label={issue.area} color={t.textMuted} bg={t.bgMuted} />}
        </div>

        <Field label="Description" t={t}>{issue.description}</Field>
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
        {available.map((to) => (
          <button
            key={to}
            onClick={() => updateIssueStatus(issue.id, to)}
            style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
              fontFamily: "inherit", cursor: "pointer",
              background: to === "verified" ? t.btnActive : t.btnIdle,
              color: to === "verified" ? t.btnActiveTxt : t.btnIdleTxt,
              border: to === "closed" ? `1px solid ${t.failText}` : `1px solid ${t.border}`,
            }}
          >
            {TRANSITION_LABEL[to] ?? fmtStatus(to)}
          </button>
        ))}
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
