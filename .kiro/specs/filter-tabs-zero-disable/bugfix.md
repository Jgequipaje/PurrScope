# Bugfix Requirements Document

## Introduction

After a scan completes, the results toolbar renders filter tabs (e.g. "All (5)", "Failed (0)"). When a tab's count is 0 it should be inert — visually disabled and non-interactive. Currently those tabs remain fully clickable, allowing users to switch to an empty filter state and producing a confusing empty table view.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a filter tab has a count of 0 THEN the system allows the user to click it and switch the active filter to that empty state
1.2 WHEN a filter tab has a count of 0 THEN the system renders the tab with the same interactive styling as tabs that have results
1.3 WHEN a filter tab has a count of 0 THEN the system allows keyboard activation (Enter / Space) to switch the active filter
1.4 WHEN the active filter is set to a tab whose count later becomes 0 THEN the system continues to display that empty filter state without falling back

### Expected Behavior (Correct)

2.1 WHEN a filter tab has a count of 0 THEN the system SHALL prevent the click from changing the active filter
2.2 WHEN a filter tab has a count of 0 THEN the system SHALL render the tab with disabled styling (reduced opacity, no-pointer cursor) that clearly communicates it is unavailable
2.3 WHEN a filter tab has a count of 0 THEN the system SHALL block keyboard activation so pressing Enter or Space does not switch the active filter
2.4 WHEN the active filter corresponds to a tab whose count is 0 THEN the system SHALL automatically fall back to the "All" filter
2.5 WHEN a filter tab has a count of 0 THEN the system SHALL still display the count label (e.g. "Failed (0)") so users understand why the tab is disabled

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a filter tab has a count greater than 0 THEN the system SHALL CONTINUE TO allow the user to click it and switch the active filter
3.2 WHEN a filter tab has a count greater than 0 THEN the system SHALL CONTINUE TO render the tab with full interactive styling
3.3 WHEN a filter tab has a count greater than 0 THEN the system SHALL CONTINUE TO respond to keyboard activation
3.4 WHEN the "All" tab is active and all results are present THEN the system SHALL CONTINUE TO display all scanned results in the table
3.5 WHEN a previously disabled tab gains a count greater than 0 (e.g. after a new scan) THEN the system SHALL CONTINUE TO become fully interactive again
3.6 WHEN there are no results at all (results array is empty) THEN the system SHALL CONTINUE TO render all tabs in a consistent disabled state without crashing
