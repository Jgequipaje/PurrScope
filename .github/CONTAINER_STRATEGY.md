# Container Strategy for GitHub Actions

**Project:** PurrScope  
**Date:** May 2, 2026  
**Status:** Analysis & Recommendations

---

## 🤔 Should You Use Containers?

### Current Situation

Your project is a **Next.js application** with:

- Node.js/npm dependencies
- Playwright for E2E testing
- TypeScript compilation
- No existing Dockerfile

### Container Benefits vs. Drawbacks

| Aspect          | Without Containers (Current)      | With Containers               |
| --------------- | --------------------------------- | ----------------------------- |
| **Setup Time**  | ✅ Fast (~30s with cache)         | ⚠️ Slower (~1-2min first run) |
| **Consistency** | ⚠️ Depends on runner image        | ✅ Identical everywhere       |
| **Caching**     | ✅ Native GitHub Actions cache    | ⚠️ Docker layer caching       |
| **Complexity**  | ✅ Simple YAML                    | ⚠️ Dockerfile + YAML          |
| **Debugging**   | ✅ Easy to reproduce locally      | ✅ Identical to CI            |
| **Maintenance** | ✅ Low (GitHub maintains runners) | ⚠️ You maintain Dockerfile    |
| **Cost**        | ✅ Free tier friendly             | ⚠️ More minutes used          |
| **Playwright**  | ✅ Works great                    | ✅ Works great                |

---

## 📊 Recommendation

**For your project: Stick with GitHub-hosted runners (no containers)**

### Why?

1. **Next.js + Playwright work perfectly on GitHub runners** - No special dependencies needed
2. **Faster execution** - Native caching is more efficient than Docker layers
3. **Lower complexity** - No Dockerfile to maintain
4. **Cost effective** - Uses fewer CI minutes
5. **Easy debugging** - `npm ci && npm run build` works the same locally

### When You SHOULD Use Containers

Use containers if you have:

- ❌ Complex system dependencies (databases, Redis, etc.)
- ❌ Specific OS requirements (Alpine, specific Ubuntu version)
- ❌ Multiple services that need to run together
- ❌ Need exact production environment replication
- ❌ Custom compiled binaries or tools

Your project has **none of these** - it's a standard Node.js web app.

---

## 🎯 Three Approaches Compared

### Option 1: GitHub-Hosted Runners (RECOMMENDED ✅)

**Best for:** Your current project

```yaml
name: CI Pipeline

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
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npx playwright test
```

**Pros:**

- ✅ Simple and fast
- ✅ Great caching
- ✅ Low maintenance
- ✅ Works perfectly for Node.js

**Cons:**

- ⚠️ Less control over environment
- ⚠️ Runner image updates might break things (rare)

---

### Option 2: Container Jobs (If You Need Containers)

**Best for:** Projects with specific OS/dependency requirements

```yaml
name: CI Pipeline

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read

    # Run job inside a container
    container:
      image: node:20-slim
      options: --user root

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      # Install Playwright dependencies (needed in slim container)
      - name: Install system dependencies
        run: |
          apt-get update
          apt-get install -y \
            libnss3 \
            libnspr4 \
            libatk1.0-0 \
            libatk-bridge2.0-0 \
            libcups2 \
            libdrm2 \
            libdbus-1-3 \
            libxkbcommon0 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libasound2

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run tests
        run: npx playwright test
```

**Pros:**

- ✅ Consistent environment
- ✅ Control over Node version
- ✅ Can use custom images

**Cons:**

- ❌ Slower (no setup-node caching)
- ❌ More complex
- ❌ Need to install Playwright deps manually
- ❌ Uses more CI minutes

---

### Option 3: Service Containers (For Integration Tests)

**Best for:** Tests that need databases, Redis, etc.

```yaml
name: CI Pipeline

permissions:
  contents: read

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  integration-test:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read

    # Service containers run alongside the job
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v6.1.0
        with:
          node-version: lts/*
          cache: "npm"

      - run: npm ci
      - run: npm run build

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration
```

**Pros:**

- ✅ Perfect for database/service testing
- ✅ Isolated test environment
- ✅ Fast startup with health checks

**Cons:**

- ⚠️ Only needed if you have integration tests
- ⚠️ Your project doesn't need this (yet)

---

## 🎨 If You Still Want Containers...

Here's a production-ready setup:

### 1. Create Dockerfile

```dockerfile
# .github/Dockerfile
FROM node:20-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build application
RUN npm run build

# Default command
CMD ["npm", "test"]
```

### 2. Update Workflow

```yaml
name: CI Pipeline (Container)

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    name: Run Tests in Container
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: read

    container:
      image: node:20-slim

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v6.2.0

      - name: Install system dependencies
        run: |
          apt-get update
          apt-get install -y \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
            libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
            libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
            libgbm1 libasound2

      - name: Cache dependencies
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
```

---

## 📈 Performance Comparison

Based on typical Next.js + Playwright projects:

| Approach              | First Run | Cached Run | Complexity | Maintenance |
| --------------------- | --------- | ---------- | ---------- | ----------- |
| **GitHub Runners**    | ~2-3 min  | ~1-2 min   | Low        | Low         |
| **Container Jobs**    | ~4-5 min  | ~2-3 min   | Medium     | Medium      |
| **Custom Dockerfile** | ~5-7 min  | ~2-3 min   | High       | High        |

**Winner:** GitHub-hosted runners (your current approach)

---

## 🎯 Final Recommendation

**Keep your current approach (GitHub-hosted runners)** because:

1. ✅ **It's working perfectly** - No issues with your current setup
2. ✅ **Faster** - Better caching, less overhead
3. ✅ **Simpler** - Less code to maintain
4. ✅ **Cheaper** - Uses fewer CI minutes
5. ✅ **Standard** - Most Next.js projects use this approach

### When to Revisit Containers

Consider containers when you:

- Add a database (use service containers)
- Need specific OS dependencies
- Want to replicate production environment exactly
- Have reproducibility issues across different runners

---

## 📚 Resources

- [GitHub Actions: Running jobs in a container](https://docs.github.com/en/actions/using-jobs/running-jobs-in-a-container)
- [GitHub Actions: About service containers](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- [Playwright in Docker](https://playwright.dev/docs/docker)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)

---

**Conclusion:** Your current workflow is optimal. No changes needed! 🎉
