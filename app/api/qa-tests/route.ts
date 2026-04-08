// Scans local Playwright test files and returns extracted test entries.
// Writes results to data/available-tests.json for caching.

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { AvailableTest } from "@/features/qa-center/types";

const TESTS_FILE = path.join(process.cwd(), "data", "available-tests.json");
const SCAN_DIRS = ["tests", "playwright-automation"];
const TEST_FILE_PATTERN = /\.(spec|test)\.(ts|js)$/;

// ── Regex-based test extractor ────────────────────────────────────────────────

function extractTests(source: string, filePath: string): Omit<AvailableTest, "id">[] {
  const results: Omit<AvailableTest, "id">[] = [];
  const lines = source.split("\n");

  let currentDescribe: string | undefined;

  for (const line of lines) {
    // Match test.describe("...") or describe("...")
    const describeMatch = line.match(/(?:test\.describe|describe)\s*\(\s*["'`](.+?)["'`]/);
    if (describeMatch) {
      currentDescribe = describeMatch[1];
      continue;
    }

    // Match test("...") or it("...") — but not test.describe, test.beforeEach etc.
    const testMatch = line.match(/^\s*(?:test|it)\s*(?:\.only|\.skip)?\s*\(\s*["'`](.+?)["'`]/);
    if (testMatch) {
      const testTitle = testMatch[1];
      const fullTitle = currentDescribe
        ? `${currentDescribe} > ${testTitle}`
        : testTitle;
      results.push({ file: filePath, describe: currentDescribe, testTitle, fullTitle });
    }
  }

  return results;
}

function stableId(file: string, fullTitle: string): string {
  // Simple deterministic ID from file + title
  const raw = `${file}::${fullTitle}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `test-${Math.abs(hash).toString(36)}`;
}

async function scanDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    /* turbopackIgnore: true */
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        files.push(...await scanDir(full));
      } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
        files.push(full);
      }
    }
  } catch {
    // Directory doesn't exist — skip silently
  }
  return files;
}

async function discoverTests(): Promise<AvailableTest[]> {
  const cwd = process.cwd();
  const allTests: AvailableTest[] = [];

  for (const dir of SCAN_DIRS) {
    /* turbopackIgnore: true */
    const files = await scanDir(path.join(cwd, dir));
    for (const file of files) {
      const relPath = path.relative(cwd, file).replace(/\\/g, "/");
      const source = await fs.readFile(file, "utf-8");
      const extracted = extractTests(source, relPath);
      for (const t of extracted) {
        allTests.push({ ...t, id: stableId(t.file, t.fullTitle) });
      }
    }
  }

  return allTests;
}

// GET /api/qa-tests — return cached or freshly scanned tests
export async function GET() {
  try {
    const raw = await fs.readFile(TESTS_FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    // Cache miss — scan now
    const tests = await discoverTests();
    await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2));
    return NextResponse.json(tests);
  }
}

// POST /api/qa-tests/refresh — force rescan
export async function POST(_req: NextRequest) {
  const tests = await discoverTests();
  await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2));
  return NextResponse.json({ count: tests.length, tests });
}
