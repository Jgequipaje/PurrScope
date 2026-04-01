# Requirements Document

## Introduction

The Recent Searches feature currently stores and displays up to 10 history entries. This feature reduces that cap to 5 items so the UI stays compact and uncluttered. The limit applies both to what is rendered in the UI and what is persisted in localStorage. All existing behaviours — duplicate promotion, click-to-refill, and clear-history — are preserved.

## Glossary

- **History_Manager**: The module (`lib/history.ts`) responsible for adding, loading, saving, and clearing history entries.
- **RecentSearches**: The UI component (`components/RecentSearches.tsx`) that renders the list of recent search entries.
- **MAX_RECENT_SEARCHES**: A named constant that defines the maximum number of history entries to store and display.
- **HistoryEntry**: A single record in the search history containing type, value, normalised value, and timestamp.
- **localStorage**: The browser storage mechanism used to persist history between sessions.
- **Duplicate**: A history entry whose `type` and `normalizedValue` match an existing entry in the list.

## Requirements

### Requirement 1: Centralised History Limit Constant

**User Story:** As a developer, I want the history cap defined in one place, so that I can change it without hunting through multiple files.

#### Acceptance Criteria

1. THE History_Manager SHALL export a constant named `MAX_RECENT_SEARCHES` with a value of `5`.
2. THE History_Manager SHALL use `MAX_RECENT_SEARCHES` as the sole cap value when truncating the history list.

---

### Requirement 2: Enforce Limit on Add

**User Story:** As a user, I want only the 5 most recent searches stored, so that the history stays relevant and the UI stays clean.

#### Acceptance Criteria

1. WHEN a new HistoryEntry is added and the resulting list would exceed `MAX_RECENT_SEARCHES`, THE History_Manager SHALL remove the oldest entries until the list length equals `MAX_RECENT_SEARCHES`.
2. THE History_Manager SHALL store entries in descending chronological order, with the most recent entry at index 0.
3. WHEN a Duplicate entry is added, THE History_Manager SHALL move the existing entry to index 0 with an updated timestamp instead of inserting a second copy.
4. WHEN a Duplicate entry is promoted to index 0, THE History_Manager SHALL NOT increase the total list length.

---

### Requirement 3: Enforce Limit on Load

**User Story:** As a user, I want legacy localStorage data with more than 5 entries to be silently trimmed on load, so that the UI is never shown more items than the current limit.

#### Acceptance Criteria

1. WHEN `loadHistory` reads a stored list whose length exceeds `MAX_RECENT_SEARCHES`, THE History_Manager SHALL return only the first `MAX_RECENT_SEARCHES` entries.
2. WHEN `loadHistory` reads a stored list whose length is within `MAX_RECENT_SEARCHES`, THE History_Manager SHALL return all stored entries unchanged.

---

### Requirement 4: UI Renders at Most MAX_RECENT_SEARCHES Items

**User Story:** As a user, I want the Recent Searches section to show at most 5 items, so that the sidebar stays compact.

#### Acceptance Criteria

1. WHEN the `entries` prop passed to RecentSearches contains `MAX_RECENT_SEARCHES` or fewer items, THE RecentSearches SHALL render all provided entries.
2. THE RecentSearches SHALL render entries in the order they are received, preserving the most-recent-first ordering supplied by History_Manager.

---

### Requirement 5: Preserve Existing Behaviours

**User Story:** As a user, I want all current interactions to keep working after the limit change, so that nothing feels broken.

#### Acceptance Criteria

1. WHEN a user clicks a history entry, THE RecentSearches SHALL invoke the `onSelect` callback with the corresponding HistoryEntry.
2. WHEN a user clicks the Clear button, THE RecentSearches SHALL invoke the `onClear` callback and THE History_Manager SHALL remove all entries from localStorage.
3. WHEN the `entries` prop is empty, THE RecentSearches SHALL display the "No recent searches yet." message.
4. IF localStorage is unavailable or contains malformed data, THEN THE History_Manager SHALL return an empty list without throwing an error.
