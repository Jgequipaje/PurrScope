# Quick Start: Running PurrScope Benchmarks

## Prerequisites

```bash
# Install tsx globally (if not already installed)
npm install -g tsx
```

## Step 1: Run Benchmarks

```bash
npm run benchmark
```

This will:

- ✅ Crawl 5 real-world websites (43-119 pages each)
- ✅ Test both sequential and concurrent pipelines
- ✅ Test different worker configurations (2, 4, 6 workers)
- ✅ Measure duration, memory, throughput, and success rate
  - **Success** = Data fetched (even if SEO rules fail)
  - **Error** = Network failure or no data found
- ⏱️ Takes approximately **15-25 minutes**

## Step 2: Analyze Results

```bash
npm run benchmark:analyze
```

This generates chart-ready data files:

- `pipeline-comparison.json` — Sequential vs Concurrent
- `worker-scaling.json` — Throughput vs Worker Count
- `memory-analysis.json` — Memory efficiency
- `key-metrics.json` — Summary statistics
- `results.csv` — Spreadsheet-compatible format

## Step 3: Review Results

### Human-Readable Summary

```bash
cat benchmark/summary.md
```

### Raw Data

```bash
cat benchmark/results.json
```

## Expected Output

### Console Output

```
╔════════════════════════════════════════════════════════════╗
║         PurrScope Performance Benchmark Suite              ║
╚════════════════════════════════════════════════════════════╝

📊 Environment:
   OS: win32 x64
   Node: v20.11.0
   Time: 2024-01-15T10:30:00.000Z

═══════════════════════════════════════════════════════════
Phase 1: Sitemap Discovery
═══════════════════════════════════════════════════════════

📡 Crawling sitemap: Rawspace
   ✓ Found 43 pages

...

═══════════════════════════════════════════════════════════
Phase 2: Pipeline Comparison (Previous vs Improved)
═══════════════════════════════════════════════════════════

🔍 Testing: Rawspace (43 pages)
   Pipeline: previous
   ✓ Duration: 28.45s
   ✓ Throughput: 1.51 pages/sec
   ✓ Memory: 95.2 MB (peak), 78.3 MB (avg)
   ✓ Success: 100.0% (0 errors)

🔍 Testing: Rawspace (43 pages)
   Pipeline: improved (balanced)
   ✓ Duration: 10.23s
   ✓ Throughput: 4.20 pages/sec
   ✓ Memory: 145.7 MB (peak), 112.4 MB (avg)
   ✓ Success: 100.0% (0 errors)

   🚀 Speedup: 2.78x faster with improved pipeline

...

═══════════════════════════════════════════════════════════
✅ Benchmark Complete!
═══════════════════════════════════════════════════════════
```

### Generated Files

```
benchmark/
├── results.json              # Complete raw data
├── summary.md                # Human-readable report
├── pipeline-comparison.json  # Chart data: Sequential vs Concurrent
├── worker-scaling.json       # Chart data: Workers vs Throughput
├── memory-analysis.json      # Chart data: Memory efficiency
├── key-metrics.json          # Summary statistics
└── results.csv               # Spreadsheet format
```

## Using the Data in Your Portfolio

### 1. Key Metrics Card

Use `key-metrics.json`:

```json
{
  "avgSpeedup": "3.24x",
  "maxThroughput": "4.85 pages/sec",
  "memoryEfficiency": "2.45 MB/page",
  "avgSuccessRate": "99.5%"
}
```

Display as:

```
⚡ 3.24x Faster
   Concurrent vs Sequential

📊 4.85 pages/sec
   Peak Throughput

💾 2.45 MB/page
   Memory Efficient

✅ 99.5% Success
   Robust & Reliable
```

### 2. Bar Chart: Pipeline Comparison

Use `pipeline-comparison.json`:

```javascript
// Chart.js example
{
  labels: data.map(d => d.site),
  datasets: [
    {
      label: 'Sequential',
      data: data.map(d => d.sequential),
      backgroundColor: '#ff6384'
    },
    {
      label: 'Concurrent',
      data: data.map(d => d.concurrent),
      backgroundColor: '#36a2eb'
    }
  ]
}
```

### 3. Line Chart: Worker Scaling

Use `worker-scaling.json`:

```javascript
// Chart.js example
{
  labels: data.map(d => d.workers),
  datasets: [{
    label: 'Throughput (pages/sec)',
    data: data.map(d => d.throughput),
    borderColor: '#4bc0c0',
    fill: false
  }]
}
```

### 4. Table: Detailed Results

Use `results.csv` or `results.json`:

```markdown
| Site          | Pages | Sequential | Concurrent | Speedup |
| ------------- | ----- | ---------- | ---------- | ------- |
| Rawspace      | 43    | 28.5s      | 10.2s      | 2.78x   |
| Irwin Upstate | 50    | 32.1s      | 11.8s      | 2.72x   |

| ...
```

## Troubleshooting

### "tsx: command not found"

```bash
npm install -g tsx
```

### "No sites could be crawled"

- Check internet connection
- Verify sites are accessible
- Try running again (network issues are transient)

### Benchmarks taking too long

- Normal for 5 sites with 100+ pages each
- Consider testing fewer sites initially
- Run during off-peak hours for faster results

### High memory usage

- Close other applications
- Reduce worker count in the script
- Test one site at a time

## Tips for Best Results

1. **Close background apps** — Minimize interference
2. **Use wired connection** — More stable than WiFi
3. **Run multiple times** — Average results for consistency
4. **Document environment** — Include in portfolio (OS, CPU, RAM)
5. **Test during off-peak** — Faster website response times

## Next Steps

1. ✅ Run benchmarks: `npm run benchmark`
2. ✅ Analyze results: `npm run benchmark:analyze`
3. 📊 Create charts using the JSON files
4. 📝 Write your optimization story
5. 🚀 Add to your portfolio!

## Example Portfolio Section

```markdown
# Performance Optimization

## The Challenge

SEO audits are time-consuming. Scanning 100 pages sequentially
takes over 2 minutes. For agencies managing multiple clients,
this doesn't scale.

## The Solution

I implemented a concurrent scanning pipeline using a worker pool
pattern, achieving:

- **3.24x speedup** over sequential scanning
- **4.85 pages/second** peak throughput
- **2.45 MB/page** memory efficiency
- **99.5% success rate** across 500+ pages tested

## Technical Implementation

- Worker pool pattern with configurable concurrency
- Playwright browser context reuse for efficiency
- Automatic retry logic for transient failures
- Memory-efficient deduplication and batching

## Real-World Testing

Benchmarked against 5 production websites (43-119 pages each):
[Insert your charts here]

## Impact

What took 2 minutes now takes 35 seconds. A 250-page site?
Just over 1 minute. This makes PurrScope viable for production
use at scale.
```

---

**Ready to run?**

```bash
npm run benchmark
```

Good luck with your portfolio! 🚀
