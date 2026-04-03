import type { Issue } from "../types";

const now = Date.now();

export const mockIssues: Issue[] = [
  {
    id: "issue-001",
    title: "Mode tabs not full-width on mobile viewports under 480px",
    description: "On small screens the Manual URLs and Sitemap Crawl tabs do not stack and appear cramped.",
    status: "verified",
    severity: "medium",
    area: "responsive",
    reproSteps: "1. Open app on 375px viewport\n2. Observe mode tabs",
    expected: "Tabs stack vertically, each full width",
    actual: "Tabs appear side by side and overflow",
    notes: "Fixed by adding flex-direction: column below 480px breakpoint",
    createdAt: now - 86400000 * 3,
    updatedAt: now - 86400000,
    origin: "manual"
  },
  {
    id: "issue-002",
    title: "Homepage SEO title exceeds 61 character limit",
    description: "The homepage title is 72 characters, which fails the PurrScope SEO rule of 45–61 chars.",
    status: "open",
    severity: "high",
    area: "seo",
    reproSteps: "1. Run PurrScope scan on https://example.com\n2. Check title length in results",
    expected: "Title between 45 and 61 characters",
    actual: "Title is 72 characters",
    createdAt: now - 3600000,
    updatedAt: now - 3600000,
    origin: "manual"
  },
  {
    id: "issue-003",
    title: "Scan limit not clamped when switching to static scope",
    description: "If user sets scan limit to 50 then switches to static scope with only 20 pages, the limit input shows 50 briefly before clamping.",
    status: "in_progress",
    severity: "low",
    area: "filter",
    createdAt: now - 86400000 * 5,
    updatedAt: now - 86400000 * 2,
    origin: "manual"
  },
];
