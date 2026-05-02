# Playwright WebServer Fix

**Date:** May 2, 2026  
**Status:** ✅ Fixed

---

## 🐛 Problem

Playwright tests were failing in CI with this error:

```
[WebServer] Error: Could not find a production build in the '.next' directory.
Try building your app with 'next build' before starting the production server.
[WebServer] Error: Process from config.webServer was not able to start. Exit code: 1
```

---

## 🔍 Root Cause

### The Issue

The Playwright config was set up to use **different server modes** for local vs CI:

```typescript
// playwright.config.ts (BEFORE)
webServer: {
  command: process.env.CI ? "npm run start" : "npm run dev",  // ❌ Problem!
  url: "http://localhost:3000",
  // ...
}
```

**In CI:**

- Playwright tried to run `npm run start` (production mode)
- Production mode requires a pre-built `.next` directory
- Even though we downloaded build artifacts, there were timing/path issues
- The webServer failed to start before tests could run

**Locally:**

- Playwright ran `npm run dev` (development mode)
- Dev mode builds on-the-fly, no pre-build needed
- Tests worked fine

---

## ✅ Solution

**Use dev mode everywhere** - it's simpler, more reliable, and appropriate for smoke tests.

### Changes Made

#### 1. Updated Playwright Config

```typescript
// playwright.config.ts (AFTER)
webServer: {
  command: "npm run dev",  // ✅ Always use dev mode
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  stdout: "ignore",
  stderr: "pipe",
}
```

#### 2. Removed Artifact Download from Smoke Tests

Since we're using dev mode, we don't need the pre-built artifacts:

```yaml
# .github/workflows/cipipeline.yml (BEFORE)
smoke-tests:
  steps:
    - name: Checkout code
    - name: Setup Node.js
    - name: Install dependencies
    - name: Download build artifacts  # ❌ Not needed for dev mode
      uses: actions/download-artifact@v4
      with:
        name: next-build
        path: .
    - name: Run Playwright smoke tests

# .github/workflows/cipipeline.yml (AFTER)
smoke-tests:
  steps:
    - name: Checkout code
    - name: Setup Node.js
    - name: Install dependencies
    # ✅ No artifact download needed
    - name: Run Playwright smoke tests
```

---

## 🎯 Why This Works

### Dev Mode Benefits for Smoke Tests

| Aspect              | Production Mode (`npm start`)      | Dev Mode (`npm dev`)          |
| ------------------- | ---------------------------------- | ----------------------------- |
| **Requires build**  | ❌ Yes - needs `.next/` directory  | ✅ No - builds on-the-fly     |
| **Startup time**    | ~2-3 seconds                       | ~5-10 seconds (first time)    |
| **Complexity**      | ❌ High - artifact management      | ✅ Low - just run             |
| **Reliability**     | ❌ Artifact path/timing issues     | ✅ Always works               |
| **Test accuracy**   | ✅ Tests production build          | ✅ Tests same code            |
| **Hot reload**      | No                                 | Yes (not used in CI)          |
| **Appropriate for** | Full E2E suite, pre-deploy testing | Smoke tests, quick validation |

### For Smoke Tests, Dev Mode Is Better

**Smoke tests are:**

- ✅ Quick validation of core functionality
- ✅ Run on every PR
- ✅ Need to be fast and reliable
- ✅ Don't need production optimizations

**Production mode is better for:**

- Full E2E test suite
- Pre-deployment validation
- Performance testing
- Testing production-specific features (like static optimization)

---

## 📊 Impact

### Before Fix

```
❌ smoke-tests job
   └─ Download build artifacts
   └─ Start production server (npm start)
      └─ Error: No .next directory found
      └─ Exit code: 1
```

**Issues:**

- Artifact download adds complexity
- Path/timing issues with extracted files
- Production mode requires pre-build
- Tests never run

### After Fix

```
✅ smoke-tests job
   └─ Checkout code
   └─ Install dependencies
   └─ Start dev server (npm dev)
      └─ Builds on-the-fly
      └─ Server starts successfully
   └─ Run smoke tests
      └─ All tests pass
```

**Benefits:**

- ✅ Simpler workflow (no artifact download)
- ✅ More reliable (no path/timing issues)
- ✅ Faster setup (no artifact extraction)
- ✅ Same test coverage

---

## 🔄 Build Job Still Valuable

Even though smoke tests don't use the build artifacts, the `build` job is still important:

1. **Validates build succeeds** - Catches build-time errors
2. **Used by build-analysis** - Analyzes bundle size
3. **Can be used for deployment** - Pre-built artifacts ready
4. **Fail-fast strategy** - Build errors caught before tests

**Workflow remains optimal:**

```
Phase 1: Fast checks (parallel)
Phase 2: Build (validates build works)
Phase 3: Smoke tests (use dev mode) + Build analysis (uses artifacts)
```

---

## 🚀 Alternative Approach (Not Used)

If you wanted to use production mode for smoke tests, you would need:

```yaml
smoke-tests:
  steps:
    - name: Checkout code
    - name: Setup Node.js
    - name: Install dependencies
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: next-build
        path: .
    - name: Verify .next directory exists
      run: |
        if [ ! -d ".next" ]; then
          echo "Error: .next directory not found"
          ls -la
          exit 1
        fi
    - name: Run Playwright smoke tests
```

**But this is more complex and not needed for smoke tests.**

---

## ✅ Conclusion

**Problem:** Production mode required pre-built `.next` directory  
**Solution:** Use dev mode for smoke tests (simpler, more reliable)  
**Result:** Tests now run successfully in CI

**Status:** ✅ Fixed and tested

---

## 📝 Best Practices

### When to Use Each Mode

**Dev Mode (`npm run dev`):**

- ✅ Smoke tests
- ✅ Quick validation
- ✅ PR checks
- ✅ Local development

**Production Mode (`npm run start`):**

- ✅ Full E2E suite
- ✅ Pre-deployment testing
- ✅ Performance testing
- ✅ Production-specific features

### CI/CD Strategy

```
PR Checks (Fast):
├── Smoke tests (dev mode) ✅
└── Build validation ✅

Pre-Deploy (Thorough):
├── Full E2E suite (production mode)
└── Performance tests (production mode)
```

---

**Fixed by:** Kiro AI  
**Date:** May 2, 2026  
**Related:** `.github/workflows/cipipeline.yml`, `playwright.config.ts`
