# Requirements Document

## Introduction

The SEO checker results view displays filter tabs (e.g. "All", "Failed") that let users narrow the results table to a specific category. Currently, tabs are always clickable regardless of whether they have any matching results. This feature disables filter tabs whose result count is zero, preventing users from navigating into an empty view, while keeping the count visible and the disabled state visually intentional and accessible.

## Glossary

- **ResultsTable**: The component (`components/ResultsTable.tsx`) that renders the scan results, toolbar, and filter tabs.
- **Filter_Tab**: A button in the toolbar that filters the results table to a specific category (e.g. "All", "Failed").
- **Result_Count**: The number of `ScanResult` entries that match a given filter category.
- **Disabled_Tab**: A Filter_Tab whose Result_Count is zero; it cannot be clicked or focused via keyboard.
- **Active_Tab**: The currently selected Filter_Tab.
- **ResultFilter**: The union type `"all" | "failed"` defined in `lib/types.ts` representing the available filter categories.

## Requirements

### Requirement 1: Disable tabs with zero results

**User Story:** As a user reviewing SEO scan results, I want filter tabs with no matching results to be disabled, so that I cannot navigate into an empty results view.

#### Acceptance Criteria

1. WHEN a Filter_Tab's Result_Count is zero, THE ResultsTable SHALL render that tab in a disabled state.
2. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL prevent click interactions on that tab.
3. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL prevent keyboard activation (Enter/Space) on that tab.
4. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL keep the Result_Count label visible on the tab.

### Requirement 2: Keep tabs with results enabled

**User Story:** As a user reviewing SEO scan results, I want filter tabs that have at least one matching result to remain fully interactive, so that I can switch between result categories normally.

#### Acceptance Criteria

1. WHEN a Filter_Tab's Result_Count is greater than zero, THE ResultsTable SHALL render that tab in an enabled state.
2. WHEN a Filter_Tab is in an enabled state, THE ResultsTable SHALL allow click and keyboard interactions on that tab.

### Requirement 3: "All" tab behavior

**User Story:** As a user, I want the "All" tab to reflect the total result count logically, so that it is only disabled when there are genuinely no results at all.

#### Acceptance Criteria

1. WHEN the total Result_Count across all results is greater than zero, THE ResultsTable SHALL keep the "All" tab enabled.
2. WHEN the total Result_Count across all results is zero (no scan has completed or results are empty), THE ResultsTable SHALL disable the "All" tab.
3. WHILE the "All" tab is the Active_Tab and another tab becomes enabled, THE ResultsTable SHALL keep the "All" tab as the Active_Tab.

### Requirement 4: Active tab auto-reset on disable

**User Story:** As a user, I want the active filter to reset automatically if the currently selected tab becomes disabled, so that I never see an empty results table without explanation.

#### Acceptance Criteria

1. WHEN the Active_Tab's Result_Count drops to zero, THE ResultsTable SHALL reset the Active_Tab to "All".
2. IF the "All" tab is also disabled (zero total results), THEN THE ResultsTable SHALL display the empty-state message rather than switching tabs.

### Requirement 5: Disabled tab visual appearance

**User Story:** As a user, I want disabled tabs to look intentionally inactive rather than broken, so that I understand why I cannot interact with them.

#### Acceptance Criteria

1. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL render the tab with reduced opacity to signal non-interactivity.
2. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL render the tab with a `not-allowed` cursor on hover.
3. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL NOT apply the active/selected visual style to that tab, even if it were somehow the current filter value.
4. THE ResultsTable SHALL render disabled tabs using the same layout and size as enabled tabs so the toolbar does not reflow.

### Requirement 6: Accessibility

**User Story:** As a user relying on assistive technology, I want disabled filter tabs to be correctly communicated as disabled, so that I understand they are not interactive.

#### Acceptance Criteria

1. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL set the `disabled` attribute on the underlying `<button>` element.
2. WHEN a Filter_Tab is in a disabled state, THE ResultsTable SHALL ensure the tab is not reachable via Tab key focus.
3. THE ResultsTable SHALL NOT remove disabled tabs from the DOM, so screen readers can still announce their presence and count.
