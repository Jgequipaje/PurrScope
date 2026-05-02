# Recommended Additional CI Jobs

**Project:** PurrScope  
**Date:** May 2, 2026  
**Current Jobs:** Format Check, Smoke Tests  
**Status:** Recommendations

---

## 📊 Current State Analysis

### What You Have ✅

- ✅ Format checking (Prettier)
- ✅ Smoke tests (Playwright E2E)
- ✅ Build verification

### What You're Missing ⚠️

- ❌ TypeScript type checking
- ❌ Unit tests (Vitest)
- ❌ Dependency security scanning
- ❌ Build size monitoring
- ❌ Full E2E test suite (only smoke tests run)
- ❌ Lighthouse performance audits

---

## 🎯 Recommended Jobs (Priority Order)

### Priority 1: MUST HAVE (Add Immediately)

#### 1. TypeScript Type Check ⭐⭐⭐

**Why:** Catches type errors before they reach production. Next.js build does this, but catching it earlier saves time.

**Impact:** High - Prevents runtime errors  
**Cost:** Low - ~30 seconds  
**Complexity:** Very Low

```yaml
type-check:
  name: TypeScript Type Check
  runs-on: ubuntu-latest
  timeout-minutes: 10
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Run type check
      run: npx tsc --noEmit
```

---

#### 2. Unit Tests (Vitest) ⭐⭐⭐

**Why:** You have `npm test` script and test files (`filter.test.ts`, `linkChecker.test.ts`) but they're not running in CI!

**Impact:** High - Catches logic errors  
**Cost:** Low - ~1 minute  
**Complexity:** Very Low

```yaml
unit-test:
  name: Run Unit Tests
  runs-on: ubuntu-latest
  timeout-minutes: 10
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm test

    - name: Upload coverage report
      if: always()
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
      with:
        name: coverage-report
        path: coverage/
        retention-days: 7
        if-no-files-found: ignore
```

---

### Priority 2: SHOULD HAVE (Add This Week)

#### 3. Dependency Security Scan ⭐⭐

**Why:** Detects known vulnerabilities in dependencies. Free and automated.

**Impact:** High - Security  
**Cost:** Low - ~1 minute  
**Complexity:** Very Low

```yaml
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  timeout-minutes: 10
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Run npm audit
      run: npm audit --audit-level=moderate
      continue-on-error: true

    - name: Run npm audit (production only)
      run: npm audit --production --audit-level=high
```

---

#### 4. Full E2E Test Suite ⭐⭐

**Why:** You're only running smoke tests (@Smoke tag). Run all E2E tests on main branch.

**Impact:** Medium - Better coverage  
**Cost:** Medium - ~5-10 minutes  
**Complexity:** Low

```yaml
e2e-full:
  name: Full E2E Tests
  # Only run on main branch or manual trigger
  if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  timeout-minutes: 45
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Get Playwright version
      id: playwright-version
      run: echo "version=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

    - name: Cache Playwright browsers
      uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
      id: playwright-cache
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

    - name: Install Playwright browsers
      if: steps.playwright-cache.outputs.cache-hit != 'true'
      run: npx playwright install --with-deps

    - name: Install system dependencies (cache hit)
      if: steps.playwright-cache.outputs.cache-hit == 'true'
      run: npx playwright install-deps

    - name: Run all Playwright tests
      timeout-minutes: 30
      run: npx playwright test

    - name: Upload test reports
      if: always()
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
      with:
        name: playwright-report-full
        path: playwright-report/
        retention-days: 7
        if-no-files-found: warn
```

---

### Priority 3: NICE TO HAVE (Add This Sprint)

#### 5. Build Size Analysis ⭐

**Why:** Monitor bundle size to prevent bloat. Next.js apps can grow quickly.

**Impact:** Medium - Performance  
**Cost:** Low - ~1 minute  
**Complexity:** Low

````yaml
build-analysis:
  name: Build Size Analysis
  runs-on: ubuntu-latest
  timeout-minutes: 15
  permissions:
    contents: read
    pull-requests: write # To comment on PRs
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Analyze bundle size
      run: |
        echo "## Build Size Report" >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "### Next.js Build Output" >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
        du -sh .next >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "### Largest Files" >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
        find .next -type f -exec du -h {} + | sort -rh | head -10 >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY

    - name: Upload build artifacts
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
      with:
        name: next-build
        path: .next/
        retention-days: 3
````

---

#### 6. Lighthouse Performance Audit ⭐

**Why:** Automated performance, accessibility, and SEO checks.

**Impact:** Medium - Quality  
**Cost:** Medium - ~3 minutes  
**Complexity:** Medium

```yaml
lighthouse:
  name: Lighthouse Audit
  needs: [smoke-tests]
  # Only run on main branch
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  timeout-minutes: 15
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Start server
      run: npm start &
      env:
        PORT: 3000

    - name: Wait for server
      run: npx wait-on http://localhost:3000 --timeout 60000

    - name: Run Lighthouse
      run: |
        npm install -g @lhci/cli
        lhci autorun --collect.url=http://localhost:3000 --collect.numberOfRuns=3

    - name: Upload Lighthouse reports
      if: always()
      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
      with:
        name: lighthouse-reports
        path: .lighthouseci/
        retention-days: 7
```

---

#### 7. Dependency Update Check ⭐

**Why:** Get notified when dependencies are outdated.

**Impact:** Low - Maintenance  
**Cost:** Low - ~30 seconds  
**Complexity:** Very Low

````yaml
dependency-check:
  name: Check Outdated Dependencies
  # Run weekly on Monday
  if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  timeout-minutes: 10
  permissions:
    contents: read
  steps:
    - name: Checkout code
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

    - name: Setup Node.js
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
      with:
        node-version: lts/*
        cache: "npm"

    - name: Check for outdated dependencies
      run: |
        echo "## Outdated Dependencies" >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
        npm outdated || true >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
````

---

### Priority 4: FUTURE ENHANCEMENTS

#### 8. Visual Regression Testing

**When:** After you have stable UI  
**Tool:** Percy, Chromatic, or Playwright screenshots  
**Cost:** Medium-High

#### 9. Performance Benchmarking

**When:** You have performance-critical features  
**Tool:** Your existing benchmark scripts  
**Cost:** High

#### 10. Accessibility Testing

**When:** Accessibility is a priority  
**Tool:** axe-core, pa11y  
**Cost:** Medium

---

## 🎨 Complete Enhanced Workflow

Here's your workflow with all Priority 1 & 2 jobs added:

```yaml
name: CI Pipeline

# This workflow runs on every push and pull request to validate code quality:
# 1. Checks code formatting with Prettier
# 2. Runs TypeScript type checking
# 3. Runs unit tests with Vitest
# 4. Scans dependencies for security vulnerabilities
# 5. Runs Playwright smoke tests
# 6. Runs full E2E tests (main branch only)
#
# Triggers:
# - Push to main, develop, fix/**, chore/** branches
# - Pull requests to main or develop
#
# Required secrets: None
# Required variables: None

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

on:
  push:
    branches: [main, develop, "fix/**", "chore/**"]
  pull_request:
    branches: [main, develop]

jobs:
  # ──────────────────────────────────────────────────────────────────────────
  # Fast checks that run in parallel
  # ──────────────────────────────────────────────────────────────────────────

  format:
    name: Check Formatting
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Check code formatting
        run: npm run format:check

  type-check:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npx tsc --noEmit

  unit-test:
    name: Run Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
          if-no-files-found: ignore

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Run npm audit (production only)
        run: npm audit --production --audit-level=high

  # ──────────────────────────────────────────────────────────────────────────
  # Smoke tests - run after fast checks pass
  # ──────────────────────────────────────────────────────────────────────────

  smoke-tests:
    name: Run Playwright Smoke Tests
    needs: [format, type-check, unit-test, security-scan]
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Get Playwright version
        id: playwright-version
        run: echo "version=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install system dependencies (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run Playwright smoke tests
        timeout-minutes: 20
        run: npx playwright test --grep "@Smoke"

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
        with:
          name: playwright-report-smoke
          path: playwright-report/
          retention-days: 7
          if-no-files-found: warn

  # ──────────────────────────────────────────────────────────────────────────
  # Full E2E tests - only on main branch
  # ──────────────────────────────────────────────────────────────────────────

  e2e-full:
    name: Full E2E Tests
    needs: [smoke-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Setup Node.js
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Get Playwright version
        id: playwright-version
        run: echo "version=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps

      - name: Install system dependencies (cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps

      - name: Run all Playwright tests
        timeout-minutes: 30
        run: npx playwright test

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.0
        with:
          name: playwright-report-full
          path: playwright-report/
          retention-days: 7
          if-no-files-found: warn
```

---

## 📊 Impact Summary

| Job                | Time Added           | Value  | Priority         |
| ------------------ | -------------------- | ------ | ---------------- |
| **Type Check**     | +30s                 | High   | ⭐⭐⭐ Must Have |
| **Unit Tests**     | +1min                | High   | ⭐⭐⭐ Must Have |
| **Security Scan**  | +1min                | High   | ⭐⭐ Should Have |
| **Full E2E**       | +5-10min (main only) | Medium | ⭐⭐ Should Have |
| **Build Analysis** | +1min                | Medium | ⭐ Nice to Have  |
| **Lighthouse**     | +3min (main only)    | Medium | ⭐ Nice to Have  |

**Total PR Time:** ~3-4 minutes (vs current ~2 minutes)  
**Total Main Branch Time:** ~15-20 minutes (includes full E2E)

---

## 🎯 Implementation Plan

### Week 1: Add Must-Haves

1. Add `type-check` job
2. Add `unit-test` job
3. Test on a feature branch
4. Merge to main

### Week 2: Add Should-Haves

1. Add `security-scan` job
2. Add `e2e-full` job (main branch only)
3. Monitor CI times
4. Adjust timeouts if needed

### Week 3: Add Nice-to-Haves

1. Add `build-analysis` job
2. Consider `lighthouse` job
3. Set up scheduled dependency checks

---

## 📚 Resources

- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Next Step:** Start with Priority 1 jobs (type-check + unit-test). They add the most value with minimal cost! 🚀
