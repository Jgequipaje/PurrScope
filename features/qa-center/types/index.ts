// PurrScope QA Center — v1 types

export type IssueStatus =
  | "open"
  | "in_progress"
  | "ready_for_qa"
  | "verified"
  | "closed";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export type IssueOrigin = "manual" | "imported_markdown";

export type AutomationResult = "not_run" | "passed" | "failed";

export type LinkedTest = {
  id: string;
  file: string;
  describe?: string;
  testTitle: string;
  fullTitle: string;
};

export type AutomationStatus = {
  result: AutomationResult;
  lastRun: string | null;   // ISO timestamp
  message: string;
};

export type Issue = {
  id: string;
  origin: IssueOrigin;
  title: string;
  status: IssueStatus;
  createdAt: number;
  updatedAt: number;

  // Manual issue fields
  description?: string;
  severity?: IssueSeverity;
  area?: string;
  reproSteps?: string;
  expected?: string;
  actual?: string;
  notes?: string;

  // Imported markdown fields
  rawContent?: string;
  sourceRef?: string;
  sourceFile?: string;

  // Playwright test linking
  linkedTest?: LinkedTest;
  automationStatus?: AutomationStatus;
};

export type AvailableTest = {
  id: string;
  file: string;
  describe?: string;
  testTitle: string;
  fullTitle: string;
};

export type IssueFilters = {
  status?: IssueStatus;
  severity?: IssueSeverity;
  origin?: IssueOrigin;
  search?: string;
};

export type VerificationResult = "passed" | "failed" | "skipped" | "pending";

export type VerificationEvent = {
  id: string;
  issueId: string;
  issueTitle: string;
  result: VerificationResult;
  runAt: number;        // timestamp
  durationMs?: number;
  message?: string;
  testFile?: string;
};
