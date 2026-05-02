# Protected Links Feature - Simplified Two-Category UI

## Problem & Solution

**Problem:** Link validation can't distinguish between truly broken links (404) and protected links (403/405/999) that may exist but block bots.

**Solution:** Group both into **"Broken/Needs Review"** category. Use the **Issues column** to show the difference:

- ⚠️ Yellow badge = Protected (may exist, needs manual check)
- 🔴 Red badge = Broken (truly broken)

## UI Design

### Tabs (Simplified)

```
All (150)  |  Broken/Needs Review (17)  |  Working (133)
```

### Summary Bar

```
🔗 150 links  |  ❌ 17 Broken/Needs Review  |  ✅ 133 Working
```

### Visual Hierarchy

**1. Row Background (Quick Scan)**

- 🟢 Green = Working
- 🔴 Red = Broken/Needs Review

**2. Status Pill (Technical Detail)**

- Shows actual HTTP status (success, protected, client_error, etc.)

**3. Issues Column (Why It Needs Attention)**

- ⚠️ Yellow badge = Protected link (403/405/999) - "May exist but blocks automated tools"
- 🔴 Red badge = Truly broken (404, 500, timeout) - "Client error (broken link)"

## Example Table

```
┌──────────────────────────────────────────────────────────────┐
│ URL                     | Type | Status    | Time  | Issues  │
├──────────────────────────────────────────────────────────────┤
│ 🔴 linkedin.com/...     | Ext  | Protected | 150ms | ⚠️ 1    │ ← Red row, yellow badge
│ 🔴 choa.org             | Ext  | Protected | 200ms | ⚠️ 1    │ ← Red row, yellow badge
│ 🔴 example.com/404      | Int  | Error     | 100ms | 🔴 1    │ ← Red row, red badge
│ 🟢 example.com/about    | Int  | Success   | 50ms  | —       │ ← Green row, no issues
└──────────────────────────────────────────────────────────────┘
```

**Expanded row details:**

```
Issues (1)
⚠️ WARNING: HTTP 403: Protected resource (anti-bot/auth-required)
           - link may exist but blocks automated tools
```

## Why This Works

### Clear Visual Hierarchy

1. **Row color** - Quick scan: Green = good, Red = needs attention
2. **Status pill** - Technical status for debugging
3. **Issues badge** - Specific reason (protected vs broken)

### User Workflow

1. See "❌ 17 Broken/Needs Review" in summary
2. Click "Broken/Needs Review" tab
3. Look at **Issues column**:
   - ⚠️ Yellow = Protected, manually verify if it works
   - 🔴 Red = Broken, fix or remove
4. Manually check protected links in browser

### Benefits

- **Simpler** - Two tabs instead of three
- **Clear** - Issues column shows why it needs review
- **No confusion** - Protected links don't show as "working"
- **Actionable** - One tab for everything that needs attention

## Implementation

### Helper Functions

```typescript
function isBroken(r: LinkCheckResult): boolean {
  // Broken/Needs Review = anything not confirmed working
  return r.status !== "success" && r.status !== "rate_limited" && r.status !== "redirect";
}

function isWorking(r: LinkCheckResult): boolean {
  // Working = confirmed accessible
  return r.status === "success" || r.status === "rate_limited" || r.status === "redirect";
}

function isProtected(r: LinkCheckResult): boolean {
  // Protected = used for Issues badge styling only
  return r.status === "protected";
}
```

### Row Styling

```typescript
// Row background: Red for broken/protected, Green for working
const rowBg = isBroken(r) ? t.rowFail : t.rowOk;

// Issues badge: Yellow for protected, Red for truly broken
const badgeBg = isBroken(r) ? t.failBg : t.warnBg;
const badgeColor = isBroken(r) ? t.failText : t.cautionText;
```

## Files Modified

- `lib/types.ts` - Added `"protected"` status
- `lib/linkChecker.ts` - Protected link issue detection (warning)
- `scan/pipelines/linkValidationProcess.ts` - 403/405/999 classification
- `components/LinkResultsTable.tsx` - Two-category UI with Issues column differentiation

## Testing

```bash
npm test lib/linkChecker.test.ts
# ✓ 28 tests passed
```
