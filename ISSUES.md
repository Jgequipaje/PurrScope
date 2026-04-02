# Issues

## ISSUE-01 — URL counter shows limit warning at exactly 10 URLs

**Status:** Open

**Description:**
When a user pastes exactly 10 URLs, the counter displays the limit reached message in red:
`10 / 10 URLs — limit reached, remove a URL to add another`

This is misleading — 10 URLs is the maximum allowed, so the scan should proceed normally without any warning. The red warning should only appear when the user attempts to go *over* the limit (i.e. 11+).

**Steps to Reproduce:**
1. Open the app in Manual URL mode
2. Paste exactly 10 URLs into the textarea
3. Observe the counter below the textarea

**Expected:**
Counter shows `10 / 10 URLs` in normal (muted) color, no warning message.

**Actual:**
Counter shows `10 / 10 URLs — limit reached, remove a URL to add another` in red.
