// Runs the linked Playwright test from playwright-automation/ using async spawn
// so the Next.js server stays responsive while the test runs.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import type { Issue } from "@/features/qa-center/types";

const DATA_FILE = path.join(process.cwd(), "data", "issues.json");
const PW_CWD = path.join(process.cwd(), "playwright-automation");

async function readIssues(): Promise<Issue[]> {
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf-8")); }
  catch { return []; }
}

async function writeIssues(issues: Issue[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(issues, null, 2));
}

function runCommand(command: string, cwd: string): Promise<{ exitCode: number; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, {
      cwd,
      shell: true,
      env: { ...process.env, PLAYWRIGHT_HTML_OPEN: "never" },
    });

    let output = "";
    proc.stdout?.on("data", (d) => { output += d.toString(); });
    proc.stderr?.on("data", (d) => { output += d.toString(); });

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, output });
    });

    proc.on("error", (err) => {
      resolve({ exitCode: 1, output: err.message });
    });
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issues = await readIssues();
  const idx = issues.findIndex((i) => i.id === id);

  if (idx === -1) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  const issue = issues[idx];
  if (!issue.linkedTest) return NextResponse.json({ error: "No linked test." }, { status: 400 });

  const { testTitle } = issue.linkedTest;
  // Sanitize: strip characters that could break out of the shell-quoted argument
  const safeTitle = testTitle.replace(/["`$\\]/g, "").slice(0, 200);
  const now = new Date().toISOString();

  const command = `npx playwright test -g "${safeTitle}" --reporter=line --timeout=30000`;
  console.log("[QA run-test] cwd:", PW_CWD);
  console.log("[QA run-test] command:", command);

  const { exitCode, output } = await runCommand(command, PW_CWD);

  console.log("[QA run-test] exit code:", exitCode);
  if (exitCode !== 0) console.error("[QA run-test] output:\n", output || "(empty)");

  let result: "passed" | "failed";
  let message: string;

  if (exitCode === 0) {
    result = "passed";
    message = "Test passed successfully.";
  } else {
    result = "failed";
    // Strip ANSI escape codes so the message is readable in the UI
    const stripAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, "");
    const cleanOutput = stripAnsi(output);
    const lines = cleanOutput.split("\n");

    // Collect the error block: from the "Error:" line through the next 4 lines
    // to capture Locator, Expected, Received, and Timeout info
    const errorIdx = lines.findIndex((l) =>
      l.includes("Error:") || l.includes("TimeoutError") || l.includes("expect(")
    );

    if (errorIdx !== -1) {
      message = lines
        .slice(errorIdx, errorIdx + 5)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");
    } else {
      message = lines.find((l) => l.includes("FAILED"))?.trim() ?? "Test failed.";
    }
  }

  issues[idx] = { ...issue, updatedAt: Date.now(), automationStatus: { result, lastRun: now, message } };
  await writeIssues(issues);
  return NextResponse.json(issues[idx]);
}
