import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Issue, IssueStatus } from "@/features/qa-center/types";

const DATA_FILE = path.join(process.cwd(), "data", "issues.json");

async function readIssues(): Promise<Issue[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIssues(issues: Issue[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(issues, null, 2), "utf-8");
}

// PATCH /api/qa-issues/:id — update status or other fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const issues = await readIssues();
  const idx = issues.findIndex((i) => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Whitelist updatable fields — never allow overwriting id or createdAt
  const ALLOWED: (keyof Issue)[] = [
    "title", "status", "description", "severity", "area",
    "reproSteps", "expected", "actual", "notes",
    "rawContent", "sourceRef", "sourceFile",
    "linkedTest", "automationStatus",
  ];
  const patch: Partial<Issue> = {};
  for (const key of ALLOWED) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }

  issues[idx] = { ...issues[idx], ...patch, id, updatedAt: Date.now() };
  await writeIssues(issues);
  return NextResponse.json(issues[idx]);
}

// DELETE /api/qa-issues/:id — remove an issue
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issues = await readIssues();
  const filtered = issues.filter((i) => i.id !== id);
  if (filtered.length === issues.length) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await writeIssues(filtered);
  return NextResponse.json({ ok: true });
}
