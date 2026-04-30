---
inclusion: fileMatch
fileMatchPattern:
  [
    "scan/**/*.ts",
    "app/api/scan*/**/*.ts",
    "app/api/sitemap/**/*.ts",
    "lib/sitemap.ts",
    "**/benchmarkUtils.ts",
    "**/benchmarkTypes.ts",
  ]
---

# Performance Benchmarking

Guidelines for measuring and optimizing PurrScope's sitemap crawl and scan pipeline performance.

## Context

PurrScope has two main performance-critical operations:

- **Sitemap Crawl**: `lib/sitemap.ts` - discovers and parses page URLs from XML sitemaps
- **Scan Pipeline**: `scan/pipelines/improvedProcess.ts` - concurrent, worker-based page scanning

The previous sequential pipeline (`scan/pipelines/previousProcess.ts`) is not planned for production release and should not be included in benchmarks.

Benchmark utilities exist in `scan/benchmarkUtils.ts` and `scan/benchmarkTypes.ts` but are marked for removal before production deployment.

## Key Metrics

When benchmarking performance, track:

### Sitemap Crawl Metrics

1. **Execution time** — total crawl duration
2. **Memory usage** — peak and average heap consumption
3. **Throughput** — pages discovered per second
4. **Sitemap count** — number of sitemap files processed

### Scan Pipeline Metrics

1. **Execution time** — total scan duration
2. **Memory usage** — peak and average heap consumption
3. **Throughput** — pages scanned per second
4. **Concurrency** — active worker/connection count
5. **Error rate** — failed scans vs total attempts

## Built-in Monitoring

Use Node.js built-in APIs for lightweight monitoring:

```typescript
const formatMemoryUsage = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;

// Snapshot
const mem = process.memoryUsage();
console.log({
  heapUsed: formatMemoryUsage(mem.heapUsed),
  rss: formatMemoryUsage(mem.rss),
});

// Continuous tracking
const memoryStats: number[] = [];
const interval = setInterval(() => {
  memoryStats.push(process.memoryUsage().heapUsed);
}, 100);

// Later: clearInterval(interval)
const peak = Math.max(...memoryStats);
const avg = memoryStats.reduce((a, b) => a + b, 0) / memoryStats.length;
```

## Testing Approach

### Sitemap Crawl Testing

1. **Small sites** — 40-50 pages to establish baseline
2. **Medium sites** — 70-90 pages for typical use case
3. **Large sites** — 100+ pages to test scalability
4. **Nested sitemaps** — test sitemap index handling

### Scan Pipeline Testing

1. **Baseline** — single-page scan to establish floor
2. **Scaling** — test with 2, 4, 6 workers to find optimal concurrency
3. **Stress** — large sitemap (100+ pages) to identify bottlenecks
4. **Sustained** — extended run to detect memory leaks
5. **Real-world** — test against actual target sites with varied response times

## Benchmark Script Pattern

```typescript
interface BenchmarkResult {
  duration: number;
  memory: { peak: number; average: number };
  throughput: number;
  errors: number;
}

async function benchmarkScan(urls: string[]): Promise<BenchmarkResult> {
  const startTime = Date.now();
  const memoryStats: number[] = [];

  const interval = setInterval(() => {
    memoryStats.push(process.memoryUsage().heapUsed);
  }, 100);

  // Run scan
  const results = await scanUrls(urls);

  clearInterval(interval);

  return {
    duration: (Date.now() - startTime) / 1000,
    memory: {
      peak: Math.max(...memoryStats) / 1024 / 1024,
      average: memoryStats.reduce((a, b) => a + b) / memoryStats.length / 1024 / 1024,
    },
    throughput: urls.length / ((Date.now() - startTime) / 1000),
    errors: results.filter((r) => r.status === "scan_error").length,
  };
}
```

## External Tools

For deeper profiling:

- **clinic.js** — comprehensive Node.js profiling (`clinic doctor`, `clinic bubbleprof`)
- **autocannon** — HTTP load testing for API routes
- **Windows Task Manager / htop** — system-level resource monitoring

```bash
# Install
npm install -g clinic autocannon

# Profile API route
autocannon -c 10 -d 30 http://localhost:3000/api/scan-improved

# Profile Node.js process
clinic doctor -- node your-script.js
```

## Reporting Format

Document benchmarks with environment context:

```markdown
**Environment**: Windows 11, Node.js v20.11.0, 32GB RAM

### Sitemap Crawl Test

**Test**: 119-page sitemap (Staci Mueller)

| Metric     | Value      |
| ---------- | ---------- |
| Duration   | 2.3s       |
| Throughput | 51.7 p/s   |
| Memory     | 85 MB peak |

### Scan Test

**Test**: 100-page sitemap scan

| Workers | Time | Memory (Peak) | Throughput | Errors |
| ------- | ---- | ------------- | ---------- | ------ |
| 2       | 56s  | 145 MB        | 1.79 p/s   | 0      |
| 4       | 47s  | 198 MB        | 2.13 p/s   | 0      |
| 6       | 26s  | 267 MB        | 3.85 p/s   | 1      |

**Findings**:

- Sitemap crawl is fast and lightweight
- Optimal scan at 6 workers (2.15x speedup over 2 workers)
- Memory scales linearly, no leaks detected
```

## Rules for AI Assistants

- When implementing performance improvements, always benchmark before and after
- Use `process.memoryUsage()` for quick checks; recommend clinic.js for deep analysis
- Test sitemap crawl performance separately from scan performance
- Test concurrent pipeline changes with multiple worker counts (2, 4, 6)
- Verify no memory leaks with sustained load tests (1+ hour)
- Document benchmark results in PR descriptions or spec files
- Remember: benchmark utilities in `scan/` are internal dev tools, not production code
- Do not compare with or reference the previous sequential pipeline - it's not being released
