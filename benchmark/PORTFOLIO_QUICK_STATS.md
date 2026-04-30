# PurrScope - Performance Quick Stats

> High-performance SEO audit tool with concurrent scanning and configurable performance modes

## 🎯 Key Numbers

```
Sitemap Discovery:  465 pages/sec average | 721 pages/sec peak
Scan Throughput:    5.6 - 38.8 pages/sec (mode-dependent)
Success Rate:       95-97% across all modes
Memory Efficiency:  0.6 - 0.9 MB per page
```

## 📊 Performance Modes

### Safe Mode (2 Workers)

```
Throughput:    5.60 pages/sec
Success Rate:  97.5%
Memory:        64.53 MB peak
Best For:      Maximum reliability, resource-constrained systems
```

### Balanced Mode (4 Workers) ⭐ Default

```
Throughput:    20.53 pages/sec
Success Rate:  95.0%
Memory:        73.16 MB peak
Best For:      Optimal balance of speed and stability
```

### Fast Mode (6 Workers)

```
Throughput:    38.84 pages/sec
Success Rate:  96.6%
Memory:        108.02 MB peak
Best For:      Maximum throughput, high-performance systems
```

## ⚡ Speed Comparison

| Mode     | Speed vs Safe Mode | Real-World Example (119 pages) |
| -------- | ------------------ | ------------------------------ |
| Safe     | 1.0x (baseline)    | 21.2 seconds                   |
| Balanced | **3.7x faster**    | 5.8 seconds                    |
| Fast     | **6.9x faster**    | 3.1 seconds                    |

## 🏆 Highlights

- 🗺️ **Sitemap Discovery**: 100% success rate, 465 p/s average
- ⚡ **Concurrent Scanning**: 6.9x speedup with optimized settings
- 💾 **Memory Efficient**: Sub-linear scaling, <1 MB per page
- 🎯 **Highly Reliable**: 95-97% success rate across all modes
- 🌐 **Respectful**: Built-in rate limiting (100-300ms delays)

## 🔧 Technical Stack

- **Runtime**: Node.js 24.14.1
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Architecture**: Worker pool pattern with configurable concurrency
- **HTTP**: Native Fetch API (no browser overhead)

## 📈 Scalability

```
Test Dataset:  5 real-world websites, 380 total pages
Memory Growth: Sub-linear with worker count
Performance:   Consistent across 43-119 page sites
Reliability:   100% sitemap discovery, 95%+ scan success
```

## 💡 Use Cases

✅ **Ideal For:**

- SEO audits and compliance checking
- Bulk website analysis
- Automated monitoring systems
- Pre-deployment validation

❌ **Not Ideal For:**

- JavaScript-heavy SPAs (no browser rendering)
- Sites with aggressive bot protection

## 📊 Real-World Example

**Scanning a 100-page website (Balanced Mode):**

```
Sitemap Discovery:  0.2 seconds
Page Scanning:      5.8 seconds
Total Time:         ~6 seconds
Success Rate:       95%
Memory Usage:       ~70 MB
```

## 🎨 For Charts/Visualizations

### Throughput by Mode

```
Safe:     ████░░░░░░ 5.6 p/s
Balanced: ████████████████████░░░░░░░░░░ 20.5 p/s
Fast:     ████████████████████████████████████████ 38.8 p/s
```

### Success Rate by Mode

```
Safe:     ████████████████████████████████████████ 97.5%
Balanced: ███████████████████████████████████████░ 95.0%
Fast:     ███████████████████████████████████████░ 96.6%
```

### Memory Usage by Mode

```
Safe:     ████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 64.5 MB
Balanced: ██████████████████░░░░░░░░░░░░░░░░░░░░░░ 73.2 MB
Fast:     ████████████████████████████░░░░░░░░░░░░ 108.0 MB
```

## 📝 One-Liner Summary

> PurrScope achieves 465 pages/sec sitemap discovery and 20-39 pages/sec scan throughput with 95-97% success rates and efficient memory usage under 1 MB per page.

## 🔗 Detailed Documentation

See `PORTFOLIO_METRICS.md` for complete analysis, methodology, and technical details.
