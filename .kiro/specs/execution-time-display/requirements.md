# Requirements Document

## Introduction

Add execution time tracking and display to the SEO Checker tool. Users should be able to see how long each process (Sitemap Crawl and Page Scan) took to complete, was cancelled, or failed. The timing should be displayed near the relevant results in a subtle, consistent style that does not compete visually with the main results.

## Glossary

- **Timer**: The client-side timing mechanism that records start and end timestamps for a process.
- **Duration**: The elapsed time in milliseconds between a process start and end event.
- **Duration_Formatter**: A utility function that converts a raw millisecond duration into a human-readable string (e.g. `0.8s`, `2.4s`, `1m 12s`).
- **Crawl_Timer**: The Timer instance associated with the Sitemap Crawl process.
- **Scan_Timer**: The Timer instance associated with the Page Scan process.
- **Process_Status**: The terminal state of a process — one of `completed`, `failed`, or `cancelled`.
- **Execution_Badge**: The UI element that displays the formatted duration and Process_Status near the relevant results or process summary.
- **SEO_Checker**: The Next.js web application being extended.

---

## Requirements

### Requirement 1: Duration Formatting

**User Story:** As a developer, I want a reusable duration formatter, so that all execution time displays are consistent and human-readable across the application.

#### Acceptance Criteria

1. THE Duration_Formatter SHALL accept a duration in milliseconds and return a formatted string.
2. WHEN the duration is less than 60,000 ms, THE Duration_Formatter SHALL return a string in the format `Xs` where `X` is the number of seconds rounded to one decimal place (e.g. `0.8s`, `2.4s`, `12.0s`).
3. WHEN the duration is 60,000 ms or greater, THE Duration_Formatter SHALL return a string in the format `Xm Ys` where `X` is whole minutes and `Y` is remaining whole seconds (e.g. `1m 12s`, `2m 0s`).
4. IF the duration is negative or zero, THEN THE Duration_Formatter SHALL return `0.0s`.
5. FOR ALL valid positive durations, formatting then parsing the numeric value from the output SHALL produce a value within 0.1s of the original duration divided by 1000 (round-trip consistency property).

---

### Requirement 2: Crawl Timing

**User Story:** As a user, I want to see how long the Sitemap Crawl took, so that I can understand the performance of the discovery step.

#### Acceptance Criteria

1. WHEN the user initiates a Sitemap Crawl, THE Crawl_Timer SHALL record the start timestamp.
2. WHEN the Sitemap Crawl completes successfully, THE Crawl_Timer SHALL record the end timestamp and set Process_Status to `completed`.
3. WHEN the Sitemap Crawl fails with an error, THE Crawl_Timer SHALL record the end timestamp and set Process_Status to `failed`.
4. WHEN the user cancels the Sitemap Crawl, THE Crawl_Timer SHALL record the end timestamp and set Process_Status to `cancelled`.
5. WHEN a new Sitemap Crawl is initiated, THE Crawl_Timer SHALL reset any previously recorded timing data.

---

### Requirement 3: Scan Timing

**User Story:** As a user, I want to see how long the Page Scan took, so that I can understand the performance of the scanning step.

#### Acceptance Criteria

1. WHEN the user initiates a Page Scan, THE Scan_Timer SHALL record the start timestamp.
2. WHEN the Page Scan completes successfully, THE Scan_Timer SHALL record the end timestamp and set Process_Status to `completed`.
3. WHEN the Page Scan fails with an error, THE Scan_Timer SHALL record the end timestamp and set Process_Status to `failed`.
4. WHEN the user cancels the Page Scan, THE Scan_Timer SHALL record the end timestamp and set Process_Status to `cancelled`.
5. WHEN a new Page Scan is initiated, THE Scan_Timer SHALL reset any previously recorded timing data.
6. THE Scan_Timer SHALL operate independently from the Crawl_Timer so that each process has its own separate elapsed time.

---

### Requirement 4: Execution Time Display — Crawl

**User Story:** As a user, I want to see the crawl duration near the sitemap discovery results, so that I know how long the crawl step took without it distracting from the main content.

#### Acceptance Criteria

1. WHEN the Sitemap Crawl completes with Process_Status `completed`, THE Execution_Badge SHALL display the formatted duration (e.g. `Crawled in 2.4s`) in the sitemap results summary area.
2. WHEN the Sitemap Crawl ends with Process_Status `failed`, THE Execution_Badge SHALL display the formatted duration with a failure label (e.g. `Failed after 1.1s`).
3. WHEN the Sitemap Crawl ends with Process_Status `cancelled`, THE Execution_Badge SHALL display the formatted duration with a cancellation label (e.g. `Canceled after 3.2s`).
4. THE Execution_Badge SHALL use a font size and color that is visually subordinate to the primary result content.
5. THE Execution_Badge SHALL use styling tokens consistent with the existing design system (e.g. `t.textMuted` or `t.textFaint` from the theme tokens).
6. WHEN a new Sitemap Crawl is initiated, THE Execution_Badge for the previous crawl SHALL be cleared.

---

### Requirement 5: Execution Time Display — Scan

**User Story:** As a user, I want to see the scan duration near the scan results, so that I know how long the scanning step took.

#### Acceptance Criteria

1. WHEN the Page Scan completes with Process_Status `completed`, THE Execution_Badge SHALL display the formatted duration (e.g. `Scanned in 14.2s`) in the results summary or header area.
2. WHEN the Page Scan ends with Process_Status `failed`, THE Execution_Badge SHALL display the formatted duration with a failure label (e.g. `Failed after 5.0s`).
3. WHEN the Page Scan ends with Process_Status `cancelled`, THE Execution_Badge SHALL display the formatted duration with a cancellation label (e.g. `Canceled after 8.7s`).
4. THE Execution_Badge for the scan SHALL be displayed near the ResultsTable component or its summary footer.
5. WHEN a new Page Scan is initiated, THE Execution_Badge for the previous scan SHALL be cleared.

---

### Requirement 6: Timing Logic Modularity

**User Story:** As a developer, I want the timing logic to be modular and reusable, so that it can be applied to additional processes in the future without duplication.

#### Acceptance Criteria

1. THE Timer SHALL be implemented as a reusable module or hook that is not coupled to any specific process (crawl or scan).
2. THE Timer SHALL expose a start operation, a stop operation that accepts a Process_Status, and a read operation that returns the current duration and status.
3. WHERE the Timer is used in a React component, THE Timer SHALL be implemented as a custom React hook so that state updates trigger re-renders correctly.
4. THE Duration_Formatter SHALL be implemented as a standalone pure function in a dedicated utility file so that it can be imported independently of any React component.

---

### Requirement 7: No Regression

**User Story:** As a developer, I want the execution time feature to be additive only, so that existing functionality is not broken.

#### Acceptance Criteria

1. THE SEO_Checker SHALL continue to perform Sitemap Crawl and Page Scan operations with the same behaviour as before this feature is introduced.
2. THE SEO_Checker SHALL continue to display all existing result data (titles, descriptions, status pills, copy button, filters) without modification.
3. IF the Timer fails to record a timestamp for any reason, THEN THE SEO_Checker SHALL continue to function normally and THE Execution_Badge SHALL not be rendered.
