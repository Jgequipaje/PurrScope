# Results Persistence Feature

## Problem

Users lose scan results when switching between tabs (Manual, Sitemap, Link Checker). This is especially frustrating for link validation scans that can take 7+ minutes.

**Example scenario:**

1. User runs link validation scan (7 minutes)
2. User accidentally clicks "Manual" or "Sitemap" tab
3. Results are lost
4. User has to rescan everything 😢

## Solution

Persist scan results to **localStorage** so they survive tab switches and even page refreshes.

### What Gets Cached

**1. Manual Mode Results**

- Scan results (`ScanResult[]`)
- Timer state (duration, status)
- Timestamp (for expiry)

**2. Sitemap Mode Results**

- Scan results (`ScanResult[]`)
- Timer state (duration, status)
- Timestamp (for expiry)

**3. Link Checker Results**

- Link validation results (`LinkCheckResult[]`)
- Timer state (duration, status)
- Timestamp (for expiry)

### Cache Expiry

Results expire after **24 hours** to prevent stale data.

## Implementation

### New File: `lib/resultsCache.ts`

Provides localStorage utilities:

```typescript
// Save results
saveScanResults(mode: "manual" | "sitemap", results, timer)
saveLinkResults(results, timer)

// Load results
loadScanResults(mode: "manual" | "sitemap") → CachedScanResults | null
loadLinkResults() → CachedLinkResults | null

// Clear results
clearScanResults(mode: "manual" | "sitemap")
clearLinkResults()
clearAllResults()
```

### Integration Points in `app/page.tsx`

**1. On Page Load (useEffect)**

- Load cached results for current mode
- Restore results and timer state

**2. After Scan Completion**

- Save results to localStorage
- Includes both successful scans and scans with errors

**3. When Starting New Scan**

- Clear old cached results for that mode
- Prevents showing stale data

**4. When Switching Tabs**

- Current results are already saved
- Load cached results for new tab (if available)

## User Experience

### Before

```
1. Run link scan (7 minutes) ✅
2. Click "Manual" tab 😱
3. Results lost ❌
4. Have to rescan 😢
```

### After

```
1. Run link scan (7 minutes) ✅
2. Click "Manual" tab 👍
3. Click "Link Checker" tab 👍
4. Results restored! 🎉
```

### Additional Benefits

✅ **Survives page refresh** - Close browser, come back later, results still there
✅ **Survives accidental navigation** - Click wrong tab, no problem
✅ **24-hour cache** - Results available for a full day
✅ **Automatic cleanup** - Expired results are removed automatically
✅ **Per-mode caching** - Each mode has its own cache

## Storage Keys

```typescript
purrscope_manual_results; // Manual mode scan results
purrscope_sitemap_results; // Sitemap mode scan results
purrscope_links_results; // Link checker results
```

## Cache Structure

**Scan Results Cache:**

```typescript
{
  results: ScanResult[],
  timer: { duration: number, status: "pass" | "fail" },
  timestamp: 1234567890,
  mode: "manual" | "sitemap"
}
```

**Link Results Cache:**

```typescript
{
  results: LinkCheckResult[],
  timer: { duration: number, status: "pass" | "fail" },
  timestamp: 1234567890
}
```

## Error Handling

- **Storage quota exceeded** - Fails silently, logs warning
- **Invalid JSON** - Returns null, clears corrupted cache
- **Expired cache** - Automatically removed on load
- **Missing fields** - Validation checks, returns null if invalid

## Next Steps

To complete the implementation, need to:

1. **Import utilities in `app/page.tsx`**

   ```typescript
   import {
     saveScanResults,
     loadScanResults,
     saveLinkResults,
     loadLinkResults,
     clearScanResults,
     clearLinkResults,
   } from "@/lib/resultsCache";
   ```

2. **Add useEffect to load cached results on mount**

   ```typescript
   useEffect(() => {
     if (mode === "manual") {
       const cached = loadScanResults("manual");
       if (cached) {
         setResults(cached.results);
         setScanTimer(cached.timer);
       }
     }
     // Similar for sitemap and links modes
   }, [mode]);
   ```

3. **Save results after scan completion**

   ```typescript
   // After successful scan
   saveScanResults(mode, results, scanTimer);

   // After link validation
   saveLinkResults(linkScanResults, linkScanTimer);
   ```

4. **Clear cache when starting new scan**

   ```typescript
   // Before starting scan
   clearScanResults(mode);

   // Before starting link validation
   clearLinkResults();
   ```

## Testing

Manual testing steps:

1. Run manual URL scan → Switch to Sitemap tab → Switch back → Verify results restored
2. Run sitemap scan → Switch to Manual tab → Switch back → Verify results restored
3. Run link validation → Switch to Manual tab → Switch back → Verify results restored
4. Run scan → Refresh page → Verify results restored
5. Run scan → Wait 25 hours → Refresh page → Verify results cleared (expired)
6. Run scan → Clear browser data → Verify results cleared

## Storage Size Considerations

**Typical sizes:**

- Manual scan (10 URLs): ~5 KB
- Sitemap scan (100 URLs): ~50 KB
- Link validation (500 links): ~250 KB

**localStorage limit:** 5-10 MB per domain (browser-dependent)

This should be plenty for typical usage. If storage quota is exceeded, the save operation fails silently and the app continues to work (just without persistence).
