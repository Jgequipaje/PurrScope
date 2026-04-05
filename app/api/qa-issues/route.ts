// API routes for QA Center issue persistence.
// Reads/writes data/issues.json on the server — no database needed.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Issue } from "@/features/qa-center/types";

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

// GET /api/qa-issues — return all issues, newest first
export async function GET() {
  const issues = await readIssues();
  return NextResponse.json(issues.sort((a, b) => b.createdAt - a.createdAt));
}

// POST /api/qa-issues — add a new issue
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const issues = await readIssues();
  const now = Date.now();
  const newIssue: Issue = {
    ...body,
    id: `issue-${now}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };

  // Prevent duplicate IDs
  if (issues.some((i) => i.id === newIssue.id)) {
    newIssue.id = `issue-${now}-${Math.random().toString(36).slice(2, 8)}`;
  }

  await writeIssues([newIssue, ...issues]);
  return NextResponse.json(newIssue, { status: 201 });
}
