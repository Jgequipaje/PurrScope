# Found On - Expandable List Feature

## Problem

Users couldn't see all pages where a link appears when there are more than 5 source pages. The "... and 7 more" text was **not clickable**, making the information inaccessible.

### Before

```
Found On (12 pages)
├─ https://example.com/page1
├─ https://example.com/page2
├─ https://example.com/page3
├─ https://example.com/page4
├─ https://example.com/page5
└─ ... and 7 more  ← NOT CLICKABLE ❌
```

## Solution

Made the "... and X more" text **clickable** to expand/collapse the full list.

### After

```
Found On (12 pages)
├─ https://example.com/page1
├─ https://example.com/page2
├─ https://example.com/page3
├─ https://example.com/page4
├─ https://example.com/page5
└─ ... show 7 more  ← CLICKABLE ✅ (underlined, link color)
```

**After clicking "show 7 more":**

```
Found On (12 pages)
├─ https://example.com/page1
├─ https://example.com/page2
├─ https://example.com/page3
├─ https://example.com/page4
├─ https://example.com/page5
├─ https://example.com/page6
├─ https://example.com/page7
├─ https://example.com/page8
├─ https://example.com/page9
├─ https://example.com/page10
├─ https://example.com/page11
├─ https://example.com/page12
└─ show less  ← CLICKABLE ✅ (collapses back to 5)
```

## Implementation Details

### Component: `LinkResultsTable.tsx`

Added local state to the `ExpandedRow` component:

```typescript
function ExpandedRow({ r, colSpan, t }: { r: LinkCheckResult; colSpan: number; t: Tokens }) {
  const [showAllFoundOn, setShowAllFoundOn] = useState(false);

  // Show first 5 by default, or all if expanded
  const displayedPages = showAllFoundOn ? r.foundOn : r.foundOn.slice(0, 5);

  // ...
}
```

### Visual Design

**Expand/Collapse Link Styling:**

- Color: Theme link color (blue in light mode, cyan in dark mode)
- Cursor: Pointer (hand cursor on hover)
- Text decoration: Underline
- Font style: Italic
- Margin top: 8px (spacing from list)

**Behavior:**

- Initially shows first 5 pages
- If more than 5 pages exist, shows "... show X more" link
- Clicking expands to show all pages
- Shows "show less" link to collapse back to 5 pages
- State resets when row is collapsed/re-expanded

### User Experience

1. **Discoverability**: Link color and underline make it clear the text is clickable
2. **Reversible**: Users can collapse back to the compact view
3. **Contextual**: Only appears when there are more than 5 pages
4. **Accessible**: Uses semantic HTML and proper click handlers

## Related Changes

Also updated the `isBroken()` and `isWorking()` helper functions to handle the new `"protected"` link status:

```typescript
function isBroken(r: LinkCheckResult): boolean {
  // Broken = status is not success/rate_limited/protected
  return r.status !== "success" && r.status !== "rate_limited" && r.status !== "protected";
}

function isWorking(r: LinkCheckResult): boolean {
  // Working = success, rate_limited, or protected
  return r.status === "success" || r.status === "rate_limited" || r.status === "protected";
}
```

This ensures protected links (403/405/999) are displayed with the "working" row styling (green background) rather than "broken" styling (red background).

## Testing

Manual testing steps:

1. Run a link validation scan on a site with links that appear on multiple pages
2. Expand a row that has more than 5 "Found On" pages
3. Verify "... show X more" link appears and is clickable
4. Click to expand - verify all pages are shown
5. Verify "show less" link appears
6. Click to collapse - verify it returns to showing 5 pages
7. Collapse the row and re-expand - verify state resets to showing 5 pages

## Files Modified

- `components/LinkResultsTable.tsx`
  - Added `showAllFoundOn` state to `ExpandedRow` component
  - Made "... and X more" text clickable with proper styling
  - Added "show less" link for collapsing
  - Updated `isBroken()` and `isWorking()` to handle "protected" status

## Benefits

1. **Full transparency**: Users can now see all pages where a link appears
2. **Better UX**: Clickable, discoverable, and reversible interaction
3. **Maintains performance**: Only shows 5 by default, expands on demand
4. **Consistent design**: Uses theme colors and standard interaction patterns
