import type { Issue, IssueStatus } from "../types";

const BASE = "/api/qa-issues";

export async function fetchIssues(): Promise<Issue[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to load issues.");
  return res.json();
}

export async function createIssue(issue: Omit<Issue, "id" | "createdAt" | "updatedAt">): Promise<Issue> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(issue),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create issue.");
  }
  return res.json();
}

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<Issue> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update issue.");
  return res.json();
}

export async function deleteIssue(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete issue.");
}

import type { AvailableTest } from "../types";

export async function fetchAvailableTests(): Promise<AvailableTest[]> {
  const res = await fetch("/api/qa-tests");
  if (!res.ok) return [];
  return res.json();
}

export async function refreshAvailableTests(): Promise<AvailableTest[]> {
  const res = await fetch("/api/qa-tests", { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh tests.");
  const data = await res.json();
  return data.tests;
}

export async function runLinkedTest(issueId: string): Promise<Issue> {
  const res = await fetch(`/api/qa-issues/${issueId}/run-test`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to run test.");
  }
  return res.json();
}
