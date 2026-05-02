import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./pipeline-tests/ui-tests",

  // Test file pattern
  testMatch: "**/*.spec.ts",

  // Timeout for each test (30 seconds)
  timeout: 30_000,

  // Timeout for each assertion (5 seconds)
  expect: {
    timeout: 5_000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"], ["github"]]
    : [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace on failure for debugging
    trace: "retain-on-failure",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Action timeout (10 seconds)
    actionTimeout: 10_000,

    // Navigation timeout (30 seconds)
    navigationTimeout: 30_000,

    // Ignore HTTPS errors (useful for local dev)
    ignoreHTTPSErrors: true,

    // Locale and timezone
    locale: "en-US",
    timezoneId: "America/New_York",
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chrome-specific options
        launchOptions: {
          args: ["--disable-web-security"],
        },
      },
    },

    // Uncomment to test on Firefox
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // Uncomment to test on WebKit (Safari)
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    // Uncomment for mobile testing
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 12"] },
    // },
  ],

  // Web server configuration - starts dev server before tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
