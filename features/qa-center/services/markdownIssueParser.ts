import type { IssueStatus } from "../types";

// ── Parsed result types ───────────────────────────────────────────────────────

export type ParsedMarkdownIssue = {
  ref: string;           // e.g. "ISSUE-001" (the ## heading text)
  title: string;         // extracted from "Title:" line, or falls back to ref
  status: IssueStatus;   // extracted from "Status:" line, defaults to "open"
  rawContent: string;    // full body of the section, preserved exactly as written
  warnings: string[];    // normalisation notes shown in preview
};

export type ParseResult = {
  issues: ParsedMarkdownIssue[];
  parseError?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, IssueStatus> = {
  open: "open",
  "in progress": "in_progress", in_progress: "in_progress",
  "ready for qa": "ready_for_qa", ready_for_qa: "ready_for_qa",
  verified: "verified",
  closed: "closed",
};

function extractInlineField(lines: string[], fieldName: string): string | undefined {
  const prefix = `${fieldName.toLowerCase()}:`;
  const line = lines.find((l) => l.toLowerCase().trimStart().startsWith(prefix));
  if (!line) return undefined;
  return line.slice(line.toLowerCase().indexOf(prefix) + prefix.length).trim() || undefined;
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parses a Markdown file into ParsedMarkdownIssue[].
 *
 * Only extracts title and status as metadata.
 * Everything else is preserved in rawContent exactly as written.
 *
 * Supports any ## section — does not require a strict schema.
 */
export function parseMarkdownIssues(markdown: string): ParseResult {
  const sections = markdown.split(/^##\s+/m).filter((s) => s.trim());

  if (sections.length === 0) {
    return {
      issues: [],
      parseError: "No sections found. Each issue should start with a ## heading (e.g. ## ISSUE-001).",
    };
  }

  const issues: ParsedMarkdownIssue[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const ref = lines[0].trim();
    if (!ref) continue;

    const warnings: string[] = [];
    const bodyLines = lines.slice(1);
    const rawContent = bodyLines.join("\n").trim();

    // Try to extract a title — optional
    const rawTitle = extractInlineField(bodyLines, "Title");
    const title = rawTitle ?? ref;
    if (!rawTitle) warnings.push("No Title field found — using section heading as title.");

    // Try to extract status — optional, defaults to open
    const rawStatus = extractInlineField(bodyLines, "Status");
    let status: IssueStatus = "open";
    if (rawStatus) {
      const mapped = STATUS_MAP[rawStatus.toLowerCase()];
      if (mapped) {
        status = mapped;
      } else {
        warnings.push(`Unknown status "${rawStatus}" — defaulted to "open".`);
      }
    } else {
      warnings.push("No Status field found — defaulted to \"open\".");
    }

    issues.push({ ref, title, status, rawContent, warnings });
  }

  if (issues.length === 0) {
    return { issues: [], parseError: "No valid issue sections were found in the file." };
  }

  return { issues };
}
