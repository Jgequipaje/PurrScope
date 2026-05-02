# Test Setup & Configuration

**Project:** PurrScope  
**Date:** May 2, 2026  
**Status:** ✅ Fixed

---

## 🐛 Problem

When running `npm test`, Vitest was trying to run Playwright test files, causing this error:

```
Error: Playwright Test did not expect test.describe() to be called here.
```

**Root Cause:** Vitest was scanning all `.spec.ts` files, including Playwright tests in `pipeline-tests/`.

---

## ✅ Solution

Created `vitest.config.ts` to separate unit tests from E2E tests.

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Exclude Playwright test files
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/pipeline-tests/**", // Playwright tests
      "**/*.spec.ts", // Playwright spec files
    ],
    // Include only unit test files
    include: ["**/*.test.ts", "**/*.test.tsx"],
    environment: "node",
  },
});
```

### File Naming Convention

| Test Type      | File Pattern | Location                    | Runner     |
| -------------- | ------------ | --------------------------- | ---------- |
| **Unit Tests** | `*.test.ts`  | `lib/`, `components/`, etc. | Vitest     |
| **E2E Tests**  | `*.spec.ts`  | `pipeline-tests/`           | Playwright |

---

## 📝 Available Test Scripts

### Unit Tests (Vitest)

```bash
# Run all unit tests (CI mode)
npm test
npm run test:unit

# Run unit tests in watch mode (development)
npm run test:unit:watch

# Run with coverage
npm run test:unit -- --coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run only smoke tests
npm run test:e2e:smoke

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test pipeline-tests/ui-tests/smoke-tests.spec.ts
```

---

## 📊 Current Test Coverage

### Unit Tests (Vitest) ✅

Located in `lib/`:

- ✅ `lib/filter.test.ts` - URL filtering logic
- ✅ `lib/linkChecker.test.ts` - Link validation logic

**Total:** 30 unit tests passing

### E2E Tests (Playwright) ✅

Located in `pipeline-tests/ui-tests/`:

- ✅ `smoke-tests.spec.ts` - Critical user flows (@Smoke tag)

**Total:** Multiple E2E scenarios

---

## 🎯 Test Strategy

### When to Use Unit Tests (Vitest)

Use for:

- ✅ Pure functions and utilities
- ✅ Business logic
- ✅ Data transformations
- ✅ Validation functions
- ✅ Fast, isolated tests

**Examples:**

- URL filtering logic (`filter.ts`)
- Link checking logic (`linkChecker.ts`)
- Data parsing functions
- Helper utilities

### When to Use E2E Tests (Playwright)

Use for:

- ✅ User workflows
- ✅ UI interactions
- ✅ Integration between components
- ✅ Full application behavior
- ✅ Browser-specific features

**Examples:**

- Manual mode URL scanning
- Sitemap crawling workflow
- Results table interactions
- Link checker flows

---

## 🚀 CI/CD Integration

### Current CI Pipeline

```yaml
jobs:
  unit-test:
    name: Run Unit Tests
    steps:
      - run: npm ci
      - run: npm test # Runs Vitest only

  smoke-tests:
    name: Run Playwright Smoke Tests
    steps:
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:smoke # Runs Playwright @Smoke tests
```

### Recommended CI Strategy

1. **On every PR:**
   - ✅ Run unit tests (fast, ~1 second)
   - ✅ Run smoke tests (critical paths, ~2 minutes)

2. **On main branch:**
   - ✅ Run all unit tests
   - ✅ Run full E2E suite

3. **Scheduled (nightly):**
   - ✅ Run full E2E suite
   - ✅ Run performance benchmarks

---

## 📁 Project Structure

```
seo-checker/
├── lib/
│   ├── filter.ts
│   ├── filter.test.ts          ← Unit tests (Vitest)
│   ├── linkChecker.ts
│   └── linkChecker.test.ts     ← Unit tests (Vitest)
├── pipeline-tests/
│   ├── ui-tests/
│   │   └── smoke-tests.spec.ts ← E2E tests (Playwright)
│   ├── fixtures/
│   └── pageobjects/
├── vitest.config.ts             ← Vitest configuration
├── playwright.config.ts         ← Playwright configuration
└── package.json
```

---

## 🔧 Adding New Tests

### Adding a Unit Test

1. Create file with `.test.ts` extension:

   ```typescript
   // lib/myFunction.test.ts
   import { describe, it, expect } from "vitest";
   import { myFunction } from "./myFunction";

   describe("myFunction", () => {
     it("should do something", () => {
       expect(myFunction("input")).toBe("output");
     });
   });
   ```

2. Run tests:
   ```bash
   npm test
   ```

### Adding an E2E Test

1. Create file with `.spec.ts` extension in `pipeline-tests/`:

   ```typescript
   // pipeline-tests/ui-tests/my-feature.spec.ts
   import { test, expect } from "@playwright/test";

   test("should do something", async ({ page }) => {
     await page.goto("/");
     // ... test steps
   });
   ```

2. Run tests:
   ```bash
   npm run test:e2e
   ```

---

## 🎨 Coverage Configuration

Coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  exclude: [
    "node_modules/**",
    ".next/**",
    "**/*.config.*",
    "**/types.ts",
    "**/*.d.ts",
    "**/pipeline-tests/**",
    "benchmark/**",
  ],
}
```

### Generate Coverage Report

```bash
npm run test:unit -- --coverage
```

Coverage report will be in `coverage/` directory.

---

## ✅ Verification

Test the setup:

```bash
# Should run only unit tests (30 tests)
npm test

# Should run only E2E smoke tests
npm run test:e2e:smoke

# Should run all E2E tests
npm run test:e2e
```

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/write-tests)

---

**Status:** ✅ All tests now run correctly in their respective runners!
