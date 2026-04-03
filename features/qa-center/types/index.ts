// PurrScope QA Center — v1 types

export type IssueStatus =
  | "open"
  | "in_progress"
  | "ready_for_qa"
  | "verified"
  | "closed";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

/** Where the issue came from */
export type IssueOrigin = "manual" | "imported_markdown";

export type Issue = {
  id: string;
  origin: IssueOrigin;
  title: string;
  status: IssueStatus;
  createdAt: number;
  updatedAt: number;

  // ── Manual issue fields (origin = "manual") ───────────────────────────────
  description?: string;
  severity?: IssueSeverity;
  area?: string;
  reproSteps?: string;
  expected?: string;
  actual?: string;
  notes?: string;

  // ── Imported issue fields (origin = "imported_markdown") ─────────────────
  rawContent?: string;    // full body of the markdown section, preserved as-is
  sourceRef?: string;     // e.g. "ISSUE-001"
  sourceFile?: string;    // original filename
};

export type IssueFilters = {
  status?: IssueStatus;
  severity?: IssueSeverity;
  origin?: IssueOrigin;
  search?: string;
};
