import type { Issue } from "../types";
import type { ParsedMarkdownIssue } from "./markdownIssueParser";

/**
 * Converts a ParsedMarkdownIssue into an Issue with origin = "imported_markdown".
 * Raw content is preserved — no schema forcing.
 */
export function parsedToIssue(parsed: ParsedMarkdownIssue, sourceFile?: string): Issue {
  const now = Date.now();
  return {
    id: `issue-${now}-${Math.random().toString(36).slice(2, 6)}`,
    origin: "imported_markdown",
    title: parsed.title,
    status: parsed.status,
    rawContent: parsed.rawContent,
    sourceRef: parsed.ref,
    sourceFile,
    createdAt: now,
    updatedAt: now,
  };
}

export function importSelectedIssues(selected: ParsedMarkdownIssue[], sourceFile?: string): Issue[] {
  return selected.map((p) => parsedToIssue(p, sourceFile));
}
