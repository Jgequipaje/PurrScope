import { create } from "zustand";
import type { Issue, IssueStatus, IssueFilters } from "../types";
import * as api from "../services/issueApiService";

type QACenterState = {
  // ── UI ───────────────────────────────────────────────────────────────────────
  isDrawerOpen: boolean;
  selectedIssueId: string | null;
  isCreating: boolean;
  isLoading: boolean;
  loadError: string | null;

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

  // ── Data actions (async, persist to API) ──────────────────────────────────────
  loadIssues: () => Promise<void>;
  addIssue: (issue: Issue) => void;                          // optimistic + persist
  updateIssueStatus: (id: string, status: IssueStatus) => void;
  updateIssue: (id: string, patch: Partial<Omit<Issue, "id" | "createdAt">>) => void;
  deleteIssue: (id: string) => void;
};

export const useQACenterStore = create<QACenterState>((set, get) => ({
  isDrawerOpen: false,
  selectedIssueId: null,
  isCreating: false,
  isLoading: false,
  loadError: null,
  issues: [],
  filters: {},

  openDrawer:      () => set({ isDrawerOpen: true }),
  closeDrawer:     () => set({ isDrawerOpen: false, selectedIssueId: null, isCreating: false }),
  selectIssue:     (id) => set({ selectedIssueId: id, isCreating: false }),
  openCreateForm:  () => set({ isCreating: true, selectedIssueId: null }),
  closeCreateForm: () => set({ isCreating: false }),
  setFilters:      (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters:    () => set({ filters: {} }),

  // Load issues from the API on mount
  loadIssues: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const issues = await api.fetchIssues();
      set({ issues, isLoading: false });
    } catch (e) {
      set({ isLoading: false, loadError: e instanceof Error ? e.message : "Failed to load issues." });
    }
  },

  // Optimistic add: update UI immediately, then persist
  addIssue: (issue) => {
    set((s) => ({ issues: [issue, ...s.issues], isCreating: false, selectedIssueId: issue.id }));
    api.createIssue(issue).then((saved) => {
      // Replace the optimistic entry with the server-confirmed one
      set((s) => ({
        issues: s.issues.map((i) => (i.id === issue.id ? saved : i)),
        selectedIssueId: s.selectedIssueId === issue.id ? saved.id : s.selectedIssueId,
      }));
    }).catch(() => {
      // Rollback on failure
      set((s) => ({ issues: s.issues.filter((i) => i.id !== issue.id) }));
    });
  },

  updateIssueStatus: (id, status) => {
    set((s) => ({
      issues: s.issues.map((i) => i.id === id ? { ...i, status, updatedAt: Date.now() } : i),
    }));
    api.updateIssueStatus(id, status).catch(() => {
      // Reload on failure to restore correct state
      get().loadIssues();
    });
  },

  updateIssue: (id, patch) => {
    set((s) => ({
      issues: s.issues.map((i) => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i),
    }));
  },

  deleteIssue: (id) => {
    const prev = get().issues;
    set((s) => ({
      issues: s.issues.filter((i) => i.id !== id),
      selectedIssueId: s.selectedIssueId === id ? null : s.selectedIssueId,
    }));
    api.deleteIssue(id).catch(() => {
      // Rollback on failure
      set({ issues: prev });
    });
  },
}));
