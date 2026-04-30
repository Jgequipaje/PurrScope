# Safe Benchmark Testing Strategy

## 🚨 The Problem

Running benchmarks repeatedly on third-party sites can:

- Trigger rate limiting
- Get your IP temporarily banned
- Potentially violate terms of service
- Be ethically questionable

## ✅ Safe Alternatives

### Option 1: Use Your Own Sites (Best)

If you have access to any websites (personal, client, or test sites):

```typescript
const TEST_SITES = [
  { name: "My Site 1", url: "https://yoursite.com/", expectedPages: 50 },
  { name: "My Site 2", url: "https://anothersite.com/", expectedPages: 75 },
  // etc.
];
```

**Pros:**

- ✅ No legal concerns
- ✅ No rate limiting issues
- ✅ Can test as much as you want
- ✅ More realistic for your use case

### Option 2: Reduce Test Frequency

Instead of running full benchmarks repeatedly:

**For Development:**

```bash
# Test just ONE site
npx tsx benchmark/verify-fix.ts
```

**For Final Metrics:**

```bash
# Run full benchmark ONCE when you're confident
npm run benchmark
```

### Option 3: Use Test/Demo Sites

Some sites are specifically designed for testing:

```typescript
const TEST_SITES = [
  { name: "Example.com", url: "https://example.com/", expectedPages: 1 },
  { name: "HTTPBin", url: "https://httpbin.org/", expectedPages: 1 },
  // Note: These won't have sitemaps, so limited usefulness
];
```

### Option 4: Mock/Stub for Unit Tests

For rapid iteration during development:

```typescript
// Create mock responses instead of hitting real sites
const mockScanResult = {
  results: [
    { url: "https://test.com/page1", scanStatus: "success", ... },
    { url: "https://test.com/page2", scanStatus: "success", ... },
  ]
};
```

## 📋 Recommended Testing Strategy

### Phase 1: Development (Many Runs)

Use **verify-fix.ts** with ONE site:

```bash
npx tsx benchmark/verify-fix.ts
```

- Fast (~30 seconds)
- Low impact (only 10 pages)
- Good for iterating

### Phase 2: Validation (Few Runs)

Run **full benchmark** 2-3 times max:

```bash
npm run benchmark
```

- Get average results
- Verify consistency
- Document variance

### Phase 3: Portfolio (One Final Run)

Run **one final benchmark** with:

- Clean system (no other apps)
- Stable network
- Document everything
- Use these results for portfolio

## 🎯 For Your Current Situation

### What You've Already Done

- ✅ Multiple diagnostic runs
- ✅ Several full benchmarks
- ✅ Individual site tests

**You probably have enough data already!**

### What to Do Now

1. **Stop running full benchmarks** for now
2. **Review existing results** - you have good data
3. **Use verify-fix.ts** if you need to test changes
4. **Run ONE final benchmark** when ready for portfolio

## 📊 Using Existing Data

You already have:

- ✅ Sitemap crawl: 468 p/s average
- ✅ Worker scaling: 100% success (safe), 98% (fast)
- ✅ Memory efficiency: ~1 MB/page
- ⚠️ Some inconsistent results (but we know why)

**This is enough for a portfolio!**

## 🔒 Legal/Ethical Best Practices

### DO:

- ✅ Use delays between requests
- ✅ Respect robots.txt
- ✅ Test during off-peak hours
- ✅ Use your own sites when possible
- ✅ Keep volume reasonable

### DON'T:

- ❌ Run benchmarks continuously
- ❌ Bypass rate limiting
- ❌ Ignore 429 (Too Many Requests) responses
- ❌ Test on sites with "no scraping" ToS
- ❌ Use for commercial purposes without permission

## 💡 Alternative: Synthetic Benchmarks

Create a **local test server** that simulates real sites:

```typescript
// benchmark/test-server.ts
import express from "express";

const app = express();

// Simulate slow responses
app.get("/page/:id", async (req, res) => {
  await new Promise((r) => setTimeout(r, 100)); // Simulate network delay
  res.send(`
    <html>
      <head><title>Test Page ${req.params.id}</title></head>
      <body><meta name="description" content="Test description"></body>
    </html>
  `);
});

app.listen(3001);
```

Then benchmark against `http://localhost:3001`

**Pros:**

- ✅ No legal concerns
- ✅ No rate limiting
- ✅ Consistent results
- ✅ Test as much as you want

**Cons:**

- ❌ Not "real world"
- ❌ Doesn't test network conditions
- ❌ Less impressive for portfolio

## 🎯 Bottom Line

**For your portfolio:**

- Use the data you already have
- Run ONE more benchmark if needed
- Consider using your own sites for future testing
- Document that you tested responsibly

**You're not going to get sued**, but it's good practice to be respectful of other people's servers! 👍
