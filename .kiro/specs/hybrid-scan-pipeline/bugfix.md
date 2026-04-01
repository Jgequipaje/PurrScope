# Bugfix Requirements Document

## Introduction

The SEO scanning pipeline has two related reliability problems. First, it relies exclusively on Playwright (headless Chromium) for every URL scan, causing unnecessary latency and flaky extraction failures even for pages whose metadata is fully present in the raw HTML. Second, even with Playwright, some pages are still incorrectly reported as having missing title or meta description because the scanner does not distinguish between a true absence of metadata and a scan failure (navigation error, timeout, or incomplete extraction). The fix introduces a hybrid fetch-first/Playwright-fallback strategy, a structured per-field result state model (found / missing / scan_error), multi-method extraction with retries at each stage, and a debug panel in the UI to surface scan reliability information.

A third problem compounds the second: when a page is classified as missing title or description, there is currently no way to verify whether that classification is correct. The scanner discards all intermediate evidence (raw HTML, raw extracted values, readyState, per-method outcomes) before returning results, making false-missing diagnoses impossible to investigate without re-running the scan with manual instrumentation. The fix adds a strict debugging mode that captures and surfaces this evidence in the UI for every page classified as missing title or description.

A fourth problem affects the URL filtering pipeline: when the "collapse-dynamic" scope is used, dynamic child URLs are collapsed to naive parent paths derived purely by stripping path segments (e.g. `/properties/134park` → `/properties`). The sitemap is never consulted during this collapsing step, so the derived parent path may not correspond to any real route. This causes the scanner to hit 404 pages and scan their SEO metadata instead of a real section page. The fix replaces naive first-segment collapsing with nearest-valid-parent matching against the discovered sitemap URL list, adds 404 protection before accepting a collapsed parent, and introduces a representative-child fallback when no valid parent exists.

These collapsing rules are now further hardened: the `deriveParentUrl` function that guesses parents by stripping path segments must be removed entirely — no guessing is permitted under any circumstances. Parent collapsing is only allowed when all four conditions are simultaneously satisfied: the candidate parent exists in the sitemap, it has been explicitly validated (fetched or opened), it returns a successful HTTP status, and its content does not indicate a 404/not-found page. A new `invalid_target` result state is introduced for pages identified as 404/not-found, whose SEO metadata must never be included in validation results. A "Disable parent collapsing" safe mode toggle is added to the UI scope/filter controls. Correctness is always preferred over aggressive collapsing: when uncertain, the system must use `representative_child_fallback` rather than a guessed parent.


## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a URL's title and description are present in the raw HTML THEN the system launches Playwright unnecessarily, adding latency and increasing the chance of flaky extraction failures.

1.2 WHEN Playwright is used for every URL sequentially THEN the system scans pages slowly because a new browser page is opened and closed for each URL without any concurrency.

1.3 WHEN Playwright fails to extract metadata on the first attempt for a page THEN the system may return missing title or description results even though the data exists in the HTML.

1.4 WHEN a fetch fails or a page redirects unexpectedly THEN the system has no fallback mechanism and records an error or incorrect result.

1.5 WHEN multiple URLs are scanned THEN the system provides no per-URL debug information about which scan method was used or why a result may be incomplete.

1.6 WHEN a navigation error, timeout, or runtime exception occurs during scanning THEN the system marks the page's title and description as missing, conflating a scan failure with a true absence of metadata.

1.7 WHEN a title or description field is null or empty after a single extraction attempt THEN the system immediately classifies it as missing without retrying or falling back to alternative extraction methods.

1.8 WHEN a page scan fails THEN the system returns no structured state distinguishing between a field that was confirmed absent and a field that could not be read due to a scan error.

1.9 WHEN a page is classified as missing title or description THEN the system discards all intermediate scan evidence (raw extracted values, HTML head content, per-method outcomes, readyState) and returns only the final classification, making it impossible to verify whether the missing classification is correct.

1.10 WHEN a page is classified as missing title or description THEN the system does not record whether the fetch attempt succeeded or failed, what raw title or description value (including empty string) was returned by each method, or what document.readyState was at the time of extraction.

1.11 WHEN a page is classified as missing title or description THEN the system does not capture the HTML head content from either the fetch response or Playwright's page.content(), so it is impossible to confirm whether a &lt;title&gt; tag or meta[name="description"] tag was actually absent from the page.

1.12 WHEN a page is classified as missing title or description THEN the system provides no UI action to inspect the scan evidence for that page — debug information is either absent or only written to server-side logs.

1.13 WHEN the "collapse-dynamic" scope is used and a dynamic child URL such as `/properties/134park` is collapsed THEN the system derives the parent path purely by stripping path segments (e.g. `/properties`) without consulting the sitemap, even when `/properties` is not a real route.

1.14 WHEN a collapsed parent URL does not exist in the sitemap THEN the system still adds it to the scan list, causing the scanner to fetch a 404 page and record its (absent or error) SEO metadata as the result for that dynamic group.

1.15 WHEN a dynamic child URL is collapsed THEN the system does not verify whether the derived parent URL returns a real page before scanning it, so 404 pages and "not found" pages are scanned as if they were valid section pages.

1.16 WHEN no valid parent route exists in the sitemap for a dynamic group THEN the system has no fallback mechanism and either scans a fake route or drops the group entirely without recording why.

1.17 WHEN a dynamic child URL is collapsed THEN the system records no debug output indicating whether the chosen parent was found in the sitemap, whether it passed 404 validation, or whether a representative child fallback was used instead.

1.18 WHEN the "collapse-dynamic" scope is used THEN the system still invokes `deriveParentUrl`, which guesses parent paths by stripping segments, even after partial fixes — naive guessing is not fully disabled and can still produce invalid scan targets.

1.19 WHEN a scanned page returns HTTP 404 or its content indicates a not-found page THEN the system has no `invalid_target` result state and includes that page's SEO metadata in pass/fail validation results as if it were a real page.

1.20 WHEN a page is identified as a 404/not-found page THEN the system does not mark it distinctly in the UI and does not exclude its metadata from SEO validation, causing false failures or misleading pass results.

1.21 WHEN the user wants to avoid all parent collapsing risk THEN the system provides no "safe mode" toggle to disable collapsing entirely, forcing the user to accept the collapsing behavior or manually exclude all dynamic groups.

1.22 WHEN parent collapsing is active THEN the system does not record all attempted parent candidates per group, only the final chosen URL, making it impossible to audit why a particular candidate was accepted or rejected.


### Expected Behavior (Correct)

2.1 WHEN a URL's title and description are both found by fetching and parsing the raw HTML THEN the system SHALL use that result directly without launching Playwright for that URL.

2.2 WHEN a URL's title or description is missing from the fetched HTML, or the fetch fails, or the page redirects unexpectedly THEN the system SHALL retry the fetch once before proceeding to the Playwright fallback.

2.3 WHEN the fetch retry also fails to find a field THEN the system SHALL fall back to Playwright to extract metadata for that URL.

2.4 WHEN Playwright is used as a fallback THEN the system SHALL reuse a single shared browser instance across all URLs in the scan, opening fresh pages as needed rather than launching a new browser per URL.

2.5 WHEN Playwright is used as a fallback THEN the system SHALL scan pages in small concurrent batches with limited concurrency to balance speed and reliability.

2.6 WHEN Playwright is used as a fallback THEN the system SHALL use a fresh page, wait for domcontentloaded, wait briefly for stabilization, check document.readyState, extract metadata, and retry extraction 1 to 2 more times if a field is still missing.

2.7 WHEN extracting the title via Playwright THEN the system SHALL attempt both page.title() and document.querySelector("title")?.textContent, using whichever returns a non-empty trimmed value.

2.8 WHEN extracting the description via Playwright THEN the system SHALL attempt document.querySelector('meta[name="description"]')?.getAttribute("content") and verify the trimmed content is non-empty before accepting it.

2.9 WHEN all extraction methods and retries complete without navigation or runtime errors and a field is still not found THEN the system SHALL classify that field's state as "missing".

2.10 WHEN a navigation failure, timeout, or unrecoverable runtime error occurs during scanning THEN the system SHALL classify the page as scan_error and SHALL NOT mark any metadata field as missing.

2.11 WHEN any URL is scanned THEN the system SHALL return structured per-field result states: "found", "missing", "scan_error", or "invalid_target" for both title and description.

2.12 WHEN any URL is scanned THEN the system SHALL return debug info per URL including: requestedUrl, finalUrl, methodUsed ("fetch" or "playwright"), titleState, descriptionState, titleAttempts, descriptionAttempts, pageLoadStatus, and errorMessage if any.

2.13 WHEN a page is classified as missing title or description THEN the system SHALL capture and return a strictDebugInfo object containing: requestedUrl, finalUrl, httpStatus (if available), methodUsed, fetchSucceeded (boolean), playwrightSucceeded (boolean), rawTitleFromFetch (string or null, including empty string), rawDescriptionFromFetch (string or null, including empty string), rawTitleFromPlaywright (string or null, including empty string), rawDescriptionFromPlaywright (string or null, including empty string), documentReadyState, and errorMessage (if any).

2.14 WHEN a page is classified as missing title or description THEN the system SHALL also capture in strictDebugInfo: fetchHeadHtml (first 2000 characters of the HTML head from the fetch response), playwrightHeadHtml (first 2000 characters of the HTML head from Playwright's page.content()), titleTagExistsInFetchHtml (boolean — whether a &lt;title&gt; tag is present in the fetched HTML), titleTagExistsInPlaywrightHtml (boolean), descriptionTagExistsInFetchHtml (boolean — whether a meta[name="description"] tag is present in the fetched HTML), and descriptionTagExistsInPlaywrightHtml (boolean).

2.15 WHEN a page is classified as missing title or description THEN the system SHALL expose a "View Debug Details" action in the UI for that page that displays the strictDebugInfo fields inline or in an expanded panel — this information SHALL NOT be hidden in server-side logs only.

2.16 WHEN a page is classified as missing title or description and the strictDebugInfo shows that a &lt;title&gt; or meta[name="description"] tag exists in the captured HTML THEN the system SHALL surface this discrepancy visibly in the debug panel so the user can identify a false-missing classification.

2.17 WHEN a page load fails, times out, or throws an unrecoverable error THEN the system SHALL classify the page as scan_error (not missing) and SHALL still populate all available strictDebugInfo fields with whatever evidence was collected before the failure.

2.18 WHEN the "collapse-dynamic" scope is used THEN the system SHALL build the complete list of valid URLs from sitemap discovery before performing any parent collapsing, and SHALL use that list as the sole source of truth for valid parent candidates.

2.19 WHEN a dynamic child URL is being collapsed THEN the system SHALL attempt to find the nearest valid parent by walking up the path hierarchy (e.g. `/a/b/c` → try `/a/b`, then `/a`) and SHALL only accept a candidate that already exists in the discovered sitemap URL list.

2.20 WHEN no ancestor path of a dynamic child URL exists in the discovered sitemap URL list THEN the system SHALL NOT collapse to a fake route; instead it SHALL keep one representative child URL from that dynamic group and SHALL mark it as `representative_child_fallback` in the collapse debug output.

2.21 WHEN a valid sitemap parent candidate is found for a dynamic child URL THEN the system SHALL perform mandatory validation of that candidate before accepting it: request or open the candidate URL, confirm the HTTP status is successful (not 4xx/5xx), confirm the final URL after redirects is not a 404/not-found route, and confirm the page content does not indicate a 404 page (e.g. "Page not found", "404" in title or heading). ALL four checks must pass; if ANY check fails the candidate SHALL be rejected entirely.

2.22 WHEN a candidate parent URL fails any step of mandatory validation THEN the system SHALL reject that candidate, SHALL NOT fall back to a less-validated guess, and SHALL instead use one representative child URL from the dynamic group, marking it as `representative_child_fallback`.

2.23 WHEN a scanned page is identified as a 404/not-found page — by HTTP status 404, OR final URL containing "404" or "not-found", OR page title/h1 containing "not found", "404", or "page not found" (case-insensitive) — THEN the system SHALL mark that page's result state as `invalid_target`.

2.24 WHEN a page is marked `invalid_target` THEN the system SHALL NOT include its SEO metadata (title, description, lengths, pass/fail status) in validation results, and SHALL display a clear warning in the UI results row for that page. This is a hard rule with no exceptions.

2.25 WHEN the `deriveParentUrl` function exists in the codebase THEN the system SHALL remove it entirely. No code path in the collapse-dynamic pipeline SHALL derive or guess a parent URL by stripping path segments. The only permitted source of parent candidates is the discovered sitemap URL list.

2.26 WHEN parent collapsing is evaluated for a dynamic child URL THEN the system SHALL only accept a candidate parent URL when ALL of the following are simultaneously true: (a) the candidate exists in the discovered sitemap URL list, (b) the candidate has been explicitly validated (fetched or opened), (c) the candidate returns a successful HTTP status (not 4xx/5xx), and (d) the candidate's content does not indicate a 404/not-found page. Satisfying fewer than all four conditions SHALL result in rejection of that candidate.

2.27 WHEN uncertain whether a parent candidate is valid THEN the system SHALL prefer `representative_child_fallback` over any guessed or insufficiently validated parent. Correctness takes precedence over aggressive collapsing.

2.28 WHEN a dynamic child URL is collapsed (or falls back to a representative child, or is marked invalid_target) THEN the system SHALL record a collapse debug entry containing: originalChildUrl, ALL attempted parent candidates (not just the chosen one), for each candidate whether it was in the sitemap, whether it passed each validation step, and why it was rejected if applicable; chosenUrl, and selectionMode which SHALL be one of `validated_parent`, `representative_child_fallback`, or `invalid_target`.

2.29 WHEN the "Disable parent collapsing" safe mode toggle is enabled in the UI THEN the system SHALL NOT collapse any dynamic child URLs. Instead it SHALL either exclude dynamic child URLs entirely OR keep one representative child URL per dynamic group, and SHALL indicate `safe_mode` in the collapse debug output for each affected group.

2.30 WHEN grouping dynamic URLs for collapsing THEN the system SHALL NOT assume all URLs sharing a first path segment belong under that segment as a parent; it SHALL use real sitemap routes and existing section URLs to determine valid parent candidates.


### Unchanged Behavior (Regression Prevention)

3.1 WHEN a URL is scanned THEN the system SHALL CONTINUE TO validate title and description lengths against the existing SEO rules (title 45–61 chars, description 145–161 chars) and return Pass/Fail status.

3.2 WHEN a URL is scanned THEN the system SHALL CONTINUE TO return the finalUrl (after any redirects) in the scan result.

3.3 WHEN a URL fails to load THEN the system SHALL CONTINUE TO record an error result and proceed scanning remaining URLs without aborting the whole scan.

3.4 WHEN the scan API is called THEN the system SHALL CONTINUE TO accept the same request shape ({ urls, limit? }) and return the same response shape ({ results, scanned }).

3.5 WHEN a URL is scanned THEN the system SHALL CONTINUE TO support the existing ScanResult type fields (url, title, titleLength, titleStatus, description, descriptionLength, descriptionStatus, error, finalUrl, titleFound, descriptionFound, attempts).

3.6 WHEN the scanner is used THEN the system SHALL CONTINUE TO export MAX_MANUAL_URLS and MAX_SITEMAP_URLS constants used by other modules.

3.7 WHEN a URL is scanned THEN the system SHALL CONTINUE TO apply existing SEO length validation rules unchanged — only the extraction and classification logic changes, not the validation thresholds.

3.8 WHEN a URL is scanned and its title and description are both found THEN the system SHALL CONTINUE TO return results without any strictDebugInfo overhead — the strict debugging mode applies only to pages classified as missing title or description.

3.9 WHEN the scan API is called THEN the system SHALL CONTINUE TO return results for all scanned URLs regardless of whether strictDebugInfo is populated for some of them.

3.10 WHEN the "all" or "static" scope is used THEN the system SHALL CONTINUE TO apply those scopes unchanged — the parent collapsing fix and safe mode toggle apply only to the "collapse-dynamic" scope.

3.11 WHEN a dynamic child URL's nearest valid parent is found in the sitemap and passes all four mandatory validation checks THEN the system SHALL CONTINUE TO collapse that child to its parent and scan the parent once — only the parent selection and validation logic changes, not the collapsing mechanism itself.

3.12 WHEN manual exclude patterns are provided THEN the system SHALL CONTINUE TO apply them before any collapsing logic, as before.

3.13 WHEN the scan pipeline runs THEN the system SHALL CONTINUE TO export MAX_MANUAL_URLS and MAX_SITEMAP_URLS constants and apply existing SEO length validation rules unchanged.

3.14 WHEN the "Disable parent collapsing" safe mode is active THEN the system SHALL CONTINUE TO apply the "all" and "static" scopes without any modification — safe mode only affects the "collapse-dynamic" scope.

3.15 WHEN a page is marked `invalid_target` THEN the system SHALL CONTINUE TO include that page in the scan pipeline result list (it is not silently dropped) — only its SEO metadata is excluded from pass/fail validation.

3.16 WHEN existing SEO validation rules are applied to non-invalid_target pages THEN the system SHALL CONTINUE TO apply those rules unchanged — the `invalid_target` state only suppresses validation for the affected page, not for any other page in the result set.


---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies inputs that trigger the defective behavior:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ScanInput (url: string)
  OUTPUT: boolean

  // Bug is triggered when:
  //   (a) Playwright is used for a URL whose metadata is already in the raw HTML, OR
  //   (b) a scan failure (navigation error, timeout) causes metadata to be marked missing, OR
  //   (c) extraction is not retried or multi-method before declaring a field missing, OR
  //   (d) no per-URL debug state (titleState, descriptionState, methodUsed, etc.) is returned, OR
  //   (e) a page classified as missing title or description returns no strictDebugInfo, OR
  //   (f) strictDebugInfo is populated but not surfaced in the UI (hidden in logs only).
  RETURN true  // current implementation always uses Playwright, lacks result states, and discards all scan evidence — every URL is a bug condition
END FUNCTION
```

**Property: Fix Checking — Hybrid Fetch Strategy**

```pascal
// For all URLs where HTML fetch succeeds and both fields are found:
FOR ALL X WHERE fetchHtml(X.url) returns title AND description DO
  result ← scan'(X)
  ASSERT result.methodUsed = "fetch"
  ASSERT result.titleState = "found"
  ASSERT result.descriptionState = "found"
  ASSERT no_playwright_launched_for(X.url)
END FOR

// For all URLs where fetch (including retry) fails or metadata is incomplete:
FOR ALL X WHERE fetchWithRetry(X.url) fails OR missing title OR missing description DO
  result ← scan'(X)
  ASSERT result.methodUsed = "playwright"
  ASSERT shared_browser_instance_reused = true
END FOR
```

**Property: Fix Checking — False Missing Classification**

```pascal
// A field must never be classified as missing due to a scan error:
FOR ALL X WHERE scan'(X).pageLoadStatus = "error" DO
  ASSERT scan'(X).titleState = "scan_error"
  ASSERT scan'(X).descriptionState = "scan_error"
  ASSERT scan'(X).titleState ≠ "missing"
  ASSERT scan'(X).descriptionState ≠ "missing"
END FOR

// A field is only missing after all extraction methods and retries complete cleanly:
FOR ALL X WHERE scan'(X).titleState = "missing" DO
  ASSERT scan'(X).pageLoadStatus = "ok"
  ASSERT scan'(X).titleAttempts >= 1
  ASSERT all_extraction_methods_tried(X.url, "title") = true
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT scan(X).titleStatus        = scan'(X).titleStatus
  ASSERT scan(X).descriptionStatus  = scan'(X).descriptionStatus
  ASSERT scan(X).finalUrl           = scan'(X).finalUrl
END FOR
```

---

**Property: Fix Checking — Strict Debug Info for Missing Classifications**

```pascal
// Every page classified as missing title or description must carry full debug evidence:
FOR ALL X WHERE scan'(X).titleState = "missing" OR scan'(X).descriptionState = "missing" DO
  debug ← scan'(X).strictDebugInfo
  ASSERT debug ≠ null
  ASSERT debug.requestedUrl ≠ null
  ASSERT debug.methodUsed IN {"fetch", "playwright"}
  ASSERT debug.fetchSucceeded IS boolean
  ASSERT debug.playwrightSucceeded IS boolean
  ASSERT debug.rawTitleFromFetch IS string OR null        // empty string is valid
  ASSERT debug.rawDescriptionFromFetch IS string OR null  // empty string is valid
  ASSERT debug.rawTitleFromPlaywright IS string OR null
  ASSERT debug.rawDescriptionFromPlaywright IS string OR null
  ASSERT debug.documentReadyState ≠ null
  ASSERT debug.fetchHeadHtml IS string OR null            // up to 2000 chars
  ASSERT debug.playwrightHeadHtml IS string OR null       // up to 2000 chars
  ASSERT debug.titleTagExistsInFetchHtml IS boolean
  ASSERT debug.descriptionTagExistsInFetchHtml IS boolean
  ASSERT debug.titleTagExistsInPlaywrightHtml IS boolean
  ASSERT debug.descriptionTagExistsInPlaywrightHtml IS boolean
END FOR
```

**Property: Fix Checking — Debug Info Surfaced in UI**

```pascal
// For every page with a missing classification, a "View Debug Details" action must be present:
FOR ALL X WHERE scan'(X).titleState = "missing" OR scan'(X).descriptionState = "missing" DO
  uiRow ← renderResultRow(scan'(X))
  ASSERT uiRow.hasViewDebugDetailsAction = true
  ASSERT uiRow.debugDetailsPanel.isVisibleOnAction = true
  ASSERT uiRow.debugDetailsPanel.source ≠ "server_logs_only"
END FOR
```

**Property: Fix Checking — scan_error Preserves Debug Evidence**

```pascal
// Even when a page fails to load, available evidence must still be captured:
FOR ALL X WHERE scan'(X).pageLoadStatus = "error" DO
  debug ← scan'(X).strictDebugInfo
  ASSERT debug ≠ null
  ASSERT debug.errorMessage ≠ null
  ASSERT scan'(X).titleState = "scan_error"
  ASSERT scan'(X).descriptionState = "scan_error"
END FOR
```

**Property: Fix Checking — No Debug Overhead for Passing Pages**

```pascal
// Pages where both fields are found must not carry strictDebugInfo:
FOR ALL X WHERE scan'(X).titleState = "found" AND scan'(X).descriptionState = "found" DO
  ASSERT scan'(X).strictDebugInfo = null OR scan'(X).strictDebugInfo = undefined
END FOR
```

---

## Bug Condition Pseudocode — Dynamic Parent Collapsing

**Bug Condition Function** — identifies dynamic child URLs that trigger the collapsing defect:

```pascal
FUNCTION isCollapsingBugCondition(X, sitemapUrls)
  INPUT: X of type string (a URL from the discovered sitemap)
         sitemapUrls of type Set<string> (all discovered sitemap URLs)
  OUTPUT: boolean

  // Bug is triggered when ANY of the following are true:
  //   (a) X is a dynamic child URL AND deriveParentUrl is still callable (naive guessing not removed), OR
  //   (b) X is a dynamic child URL AND the chosen parent is not in sitemapUrls, OR
  //   (c) X is a dynamic child URL AND the chosen parent has not been explicitly validated, OR
  //   (d) X is a dynamic child URL AND the chosen parent returns 4xx/5xx or not-found content, OR
  //   (e) a scanned page is a 404/not-found page AND it is not marked invalid_target, OR
  //   (f) an invalid_target page's SEO metadata is included in pass/fail validation results, OR
  //   (g) no safe mode toggle exists to disable collapsing entirely.
  naiveParent ← basePath(X)  // e.g. "/properties" for "/properties/134park"
  RETURN isDynamicChild(X) AND (
    deriveParentUrlExists()
    OR NOT sitemapUrls.contains(naiveParent)
    OR NOT allFourValidationChecksPassed(naiveParent)
    OR NOT invalidTargetStateExists()
    OR NOT safeModeToggleExists()
  )
END FUNCTION
```

**Property: Fix Checking — Naive Collapsing Fully Disabled**

```pascal
// deriveParentUrl must not exist anywhere in the codebase:
ASSERT NOT functionExists("deriveParentUrl")

// No code path may derive a parent by stripping path segments:
FOR ALL X WHERE isDynamicChild(X) DO
  ASSERT collapseUrl'(X, sitemapUrls) does NOT call deriveParentUrl(X)
  ASSERT collapseUrl'(X, sitemapUrls).parentCandidates ⊆ sitemapUrls
END FOR
```

**Property: Fix Checking — All-Four-Conditions Mandatory**

```pascal
// A parent candidate is only accepted when all four conditions hold simultaneously:
FOR ALL X WHERE isDynamicChild(X) AND collapseUrl'(X, sitemapUrls).selectionMode = "validated_parent" DO
  result ← collapseUrl'(X, sitemapUrls)
  parent ← result.chosenUrl
  ASSERT sitemapUrls.contains(parent)                    // condition (a): in sitemap
  ASSERT result.candidateValidated(parent) = true        // condition (b): explicitly validated
  ASSERT httpStatus(parent) NOT IN {400..599}            // condition (c): successful HTTP status
  ASSERT NOT isNotFoundContent(parent)                   // condition (d): no 404 content
END FOR

// Fewer than four conditions → candidate must be rejected:
FOR ALL X WHERE isDynamicChild(X) DO
  FOR ALL candidate IN result.attemptedCandidates WHERE
    NOT (sitemapUrls.contains(candidate)
         AND candidateValidated(candidate)
         AND httpStatus(candidate) NOT IN {400..599}
         AND NOT isNotFoundContent(candidate)) DO
    ASSERT candidate ≠ result.chosenUrl
  END FOR
END FOR
```

**Property: Fix Checking — Nearest Valid Parent Matching**

```pascal
// For all dynamic child URLs, the collapsed parent must exist in the sitemap:
FOR ALL X WHERE isDynamicChild(X) DO
  result ← collapseUrl'(X, sitemapUrls)
  IF result.selectionMode = "validated_parent" THEN
    ASSERT sitemapUrls.contains(result.chosenUrl)
  ELSE
    ASSERT result.selectionMode IN {"representative_child_fallback", "invalid_target", "safe_mode"}
  END IF
END FOR

// Walking order: try /a/b before /a for a child at /a/b/c:
FOR ALL X WHERE isDynamicChild(X) AND pathDepth(X) >= 3 DO
  result ← collapseUrl'(X, sitemapUrls)
  IF result.selectionMode = "validated_parent" THEN
    // The chosen parent must be the nearest (deepest) valid ancestor
    ASSERT NOT EXISTS ancestor WHERE
      pathDepth(ancestor) > pathDepth(result.chosenUrl)
      AND isAncestorOf(ancestor, X)
      AND sitemapUrls.contains(ancestor)
      AND allFourValidationChecksPassed(ancestor)
  END IF
END FOR
```

**Property: Fix Checking — Mandatory Validation Steps**

```pascal
// Every accepted parent must have passed all four validation checks:
FOR ALL X WHERE isDynamicChild(X) AND collapseUrl'(X, sitemapUrls).selectionMode = "validated_parent" DO
  result ← collapseUrl'(X, sitemapUrls)
  parent ← result.chosenUrl
  ASSERT result.validationSteps(parent).requestedOrOpened = true
  ASSERT result.validationSteps(parent).httpStatusSuccessful = true
  ASSERT result.validationSteps(parent).finalUrlNotNotFound = true
  ASSERT result.validationSteps(parent).contentNotNotFound = true
END FOR

// If any validation step fails, fallback to representative child:
FOR ALL X WHERE isDynamicChild(X) AND anyValidationStepFails(X, sitemapUrls) DO
  result ← collapseUrl'(X, sitemapUrls)
  ASSERT result.selectionMode = "representative_child_fallback"
  ASSERT result.chosenUrl = oneRepresentativeChild(dynamicGroup(X))
END FOR
```

**Property: Fix Checking — invalid_target State**

```pascal
// Pages identified as 404/not-found must be marked invalid_target:
FOR ALL X WHERE
  httpStatus(X.url) = 404
  OR finalUrl(X.url) CONTAINS "404" OR finalUrl(X.url) CONTAINS "not-found"
  OR pageTitle(X.url) MATCHES /not found|404|page not found/i
  OR pageH1(X.url) MATCHES /not found|404|page not found/i
DO
  result ← scan'(X)
  ASSERT result.titleState = "invalid_target"
  ASSERT result.descriptionState = "invalid_target"
END FOR

// invalid_target pages must not contribute to SEO pass/fail validation:
FOR ALL X WHERE scan'(X).titleState = "invalid_target" DO
  ASSERT scan'(X).titleStatus = null OR scan'(X).titleStatus = "N/A"
  ASSERT scan'(X).descriptionStatus = null OR scan'(X).descriptionStatus = "N/A"
  ASSERT uiRow(scan'(X)).showsInvalidTargetWarning = true
END FOR
```

**Property: Fix Checking — Safe Mode Toggle**

```pascal
// When safe mode is enabled, no dynamic child URLs are collapsed:
FOR ALL X WHERE isDynamicChild(X) AND safeModeEnabled = true DO
  result ← filterUrls'(allUrls, "collapse-dynamic", excludePatterns, safeMode=true)
  ASSERT result.collapsedMappings[X] = null OR result.collapsedMappings[X] = undefined
  ASSERT result.collapseDebug[X].selectionMode IN {"representative_child_fallback", "safe_mode"}
  ASSERT result.collapseDebug[X].safeModeActive = true
END FOR

// Safe mode must not affect "all" or "static" scopes:
FOR ALL scope IN {"all", "static"} DO
  ASSERT filterUrls'(allUrls, scope, excludePatterns, safeMode=true)
        = filterUrls'(allUrls, scope, excludePatterns, safeMode=false)
END FOR
```

**Property: Fix Checking — Extended Collapse Debug Output**

```pascal
// Every collapsed (or fallback) URL must carry a full debug entry:
FOR ALL X WHERE isDynamicChild(X) DO
  debug ← collapseUrl'(X, sitemapUrls).collapseDebug
  ASSERT debug.originalChildUrl = X
  ASSERT debug.attemptedCandidates IS array AND LENGTH(debug.attemptedCandidates) >= 0
  FOR ALL candidate IN debug.attemptedCandidates DO
    ASSERT candidate.url ≠ null
    ASSERT candidate.inSitemap IS boolean
    ASSERT candidate.passedValidation IS boolean
    ASSERT candidate.rejectionReason IS string OR null
  END FOR
  ASSERT debug.chosenUrl ≠ null
  ASSERT debug.selectionMode IN {"validated_parent", "representative_child_fallback", "invalid_target", "safe_mode"}
END FOR
```

**Property: Fix Checking — Correctness Preference**

```pascal
// When no candidate passes all four checks, representative_child_fallback is always chosen:
FOR ALL X WHERE isDynamicChild(X)
             AND NOT EXISTS candidate IN sitemapUrls WHERE
               isAncestorOf(candidate, X)
               AND allFourValidationChecksPassed(candidate) DO
  result ← collapseUrl'(X, sitemapUrls)
  ASSERT result.selectionMode = "representative_child_fallback"
  // Must never fall back to a guessed or partially-validated parent:
  ASSERT result.chosenUrl ≠ deriveParentUrl(X)
END FOR
```

**Property: Preservation Checking — Unaffected Scopes**

```pascal
// "all" and "static" scope results must be identical before and after the fix:
FOR ALL X WHERE scope IN {"all", "static"} DO
  ASSERT filterUrls(allUrls, scope, excludePatterns)
        = filterUrls'(allUrls, scope, excludePatterns)
END FOR

// Dynamic children with a valid nearest parent that passes all four validation checks
// must still be collapsed (not dropped):
FOR ALL X WHERE isDynamicChild(X)
             AND nearestValidParent(X, sitemapUrls) ≠ null
             AND allFourValidationChecksPassed(nearestValidParent(X, sitemapUrls)) DO
  result ← filterUrls'(allUrls, "collapse-dynamic", excludePatterns)
  ASSERT result.collapsedMappings[X] = nearestValidParent(X, sitemapUrls)
  ASSERT result.includedUrls.contains(nearestValidParent(X, sitemapUrls))
END FOR

// invalid_target pages remain in the result list (not silently dropped):
FOR ALL X WHERE scan'(X).titleState = "invalid_target" DO
  ASSERT scan'(X) IN scanResults
END FOR
```
