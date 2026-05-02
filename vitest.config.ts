import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Enable global test APIs (describe, it, expect) without imports
    globals: true,
    // Exclude Playwright test files
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/pipeline-tests/**", // Exclude all Playwright tests
      "**/*.spec.ts", // Exclude Playwright spec files
    ],
    // Include only unit test files
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // Test environment
    environment: "node",
    // Coverage configuration
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
        // Exclude internal dev tools (marked for removal)
        "scan/benchmarkUtils.ts",
        "scan/benchmarkTypes.ts",
        // Exclude mock data and SSR boilerplate
        "features/*/mock/**",
        "lib/registry.tsx",
      ],
      // Set minimum coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
