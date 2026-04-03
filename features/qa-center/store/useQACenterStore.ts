import { create } from "zustand";
import type { Issue, IssueStatus, IssueFilters } from "../types";
import { mockIssues } from "../mock/issues";

type QACenterState = {
  // ── UI ───────────────────────────────────────────────────────────────────────
  isDrawerOpen: boolean;
  selectedIssueId: string | null;
  isCreating: boolean;           // true when the new-issue form is open

  // ── Data ─────────────────────────────────────────────────────────────────────
  issues: Issue[];
  filters: IssueFilters;

  // ── UI actions ────────────────────────────────────────────────────────────────
  openDrawer: () => void;
  closeDrawer: () => void;
  selectIssue: (id: string | null) => void;
  openCreateForm: () => void;
  closeCreateForm: () => void;
  setFilters: (patch: Partial<IssueFilters>) => void;
  clearFilters: () => void;

  // ── Issue actions ─────────────────────────────────────────────────────────────
  addIssue: (issue: Issue) => void;
  updateIssueStatus: (id: string, status: IssueStatus) => void;
  updateIssue: (id: string, patch: Partial<Omit<Issue, "id" | "createdAt">>) => void;
  deleteIssue: (id: string) => void;
};

export const useQACenterStore = create<QACenterState>((set) => ({
  isDrawerOpen: false,
  selectedIssueId: null,
  isCreating: false,
  issues: mockIssues,
  filters: {},

  openDrawer:      () => set({ isDrawerOpen: true }),
  closeDrawer:     () => set({ isDrawerOpen: false, selectedIssueId: null, isCreating: false }),
  selectIssue:     (id) => set({ selectedIssueId: id, isCreating: false }),
  openCreateForm:  () => set({ isCreating: true, selectedIssueId: null }),
  closeCreateForm: () => set({ isCreating: false }),
  setFilters:      (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters:    () => set({ filters: {} }),

  addIssue: (issue) =>
    set((s) => ({ issues: [issue, ...s.issues], isCreating: false, selectedIssueId: issue.id })),

  updateIssueStatus: (id, status) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, status, updatedAt: Date.now() } : i
      ),
    })),

  updateIssue: (id, patch) =>
    set((s) => ({
      issues: s.issues.map((i) =>
        i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i
      ),
    })),

  deleteIssue: (id) =>
    set((s) => ({
      issues: s.issues.filter((i) => i.id !== id),
      selectedIssueId: s.selectedIssueId === id ? null : s.selectedIssueId,
    })),
}));
