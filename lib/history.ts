// Recent search history — localStorage persistence helpers.
//
// Each entry stores enough to restore the input field it came from.
// Max 5 items; duplicates are moved to the top rather than re-added.

export type SearchType = "url" | "manual";

export type HistoryEntry = {
  id: string;
  type: SearchType;
  value: string; // raw value as entered
  normalizedValue: string; // lowercased/trimmed for dedup comparison
  createdAt: number; // Date.now()
};

const STORAGE_KEY = "seo_checker_history";
export const MAX_RECENT_SEARCHES = 5;
const MAX_ENTRIES = MAX_RECENT_SEARCHES;

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Normalise a URL for dedup comparison.
 * Strips trailing slash, lowercases scheme+host, preserves path case.
 */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function normalizeManual(raw: string): string {
  // Normalise line endings and trim each line for comparison
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function normalizeValue(type: SearchType, value: string): string {
  return type === "url" ? normalizeUrl(value) : normalizeManual(value);
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const trimmed = parsed.slice(0, MAX_ENTRIES);
    // Re-save if we trimmed stale over-limit data
    if (trimmed.length < parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        /* ignore */
      }
    }
    return trimmed;
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── Add entry ─────────────────────────────────────────────────────────────────

/**
 * Adds a new entry to the history list.
 * - If an entry with the same normalizedValue already exists, it is moved to
 *   the top (most recent) with an updated timestamp.
 * - List is capped at MAX_ENTRIES.
 * Returns the updated list.
 */
export function addHistoryEntry(
  current: HistoryEntry[],
  type: SearchType,
  value: string
): HistoryEntry[] {
  const normalized = normalizeValue(type, value);

  // Remove existing duplicate (same type + normalizedValue)
  const deduped = current.filter((e) => !(e.type === type && e.normalizedValue === normalized));

  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    value,
    normalizedValue: normalized,
    createdAt: Date.now(),
  };

  // Prepend and cap
  return [entry, ...deduped].slice(0, MAX_ENTRIES);
}

// ── Display helpers ───────────────────────────────────────────────────────────

const MANUAL_PREVIEW_MAX = 60;

/**
 * Returns a short display label for a history entry.
 * For manual entries with multiple URLs, shows the first line + count.
 */
export function entryLabel(entry: HistoryEntry): string {
  if (entry.type === "url") return entry.value;

  const lines = entry.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return entry.value;

  const first =
    lines[0].length > MANUAL_PREVIEW_MAX ? lines[0].slice(0, MANUAL_PREVIEW_MAX) + "…" : lines[0];

  return lines.length > 1 ? `${first} (+${lines.length - 1} more)` : first;
}
