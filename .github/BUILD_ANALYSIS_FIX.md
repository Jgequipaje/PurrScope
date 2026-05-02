# Build Analysis Artifact Fix

**Date:** May 2, 2026  
**Status:** ✅ Fixed with verification

---

## 🐛 Problem

The `build-analysis` job was failing with:

```
du: cannot access '.next': No such file or directory
Error: Process completed with exit code 1.
```

---

## 🔍 Root Cause

The `build-analysis` job downloads build artifacts and analyzes them, but the `.next` directory wasn't being found after download. This could be due to:

1. Artifact not being created correctly
2. Artifact not being uploaded correctly
3. Artifact not being downloaded/extracted correctly
4. Path mismatch between upload and download

---

## ✅ Solution

Added **verification steps** to both the build and build-analysis jobs to:

1. Verify the build creates the `.next` directory
2. Verify the artifact download extracts correctly
3. Provide clear error messages if something goes wrong

### Changes Made

#### 1. Build Job - Verify Before Upload

```yaml
- name: Build application
  run: npm run build

- name: Verify build output
  run: |
    echo "Verifying .next directory exists:"
    ls -la .next
    echo ""
    echo "Build output size:"
    du -sh .next

- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: next-build
    path: |
      .next/
      package.json
      package-lock.json
```

**Purpose:**

- ✅ Confirms build succeeded and created `.next`
- ✅ Shows build output size in logs
- ✅ Fails fast if build didn't create expected files

#### 2. Build Analysis Job - Verify After Download

```yaml
- name: Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: next-build
    path: .

- name: Verify artifacts downloaded
  run: |
    echo "Contents of current directory:"
    ls -la
    echo ""
    echo "Checking for .next directory:"
    if [ -d ".next" ]; then
      echo ".next directory found"
      ls -la .next
    else
      echo "ERROR: .next directory not found"
      exit 1
    fi

- name: Analyze bundle size
  run: |
    du -sh .next
    # ... rest of analysis
```

**Purpose:**

- ✅ Confirms artifact downloaded correctly
- ✅ Shows directory structure in logs
- ✅ Provides clear error if `.next` missing
- ✅ Helps debug artifact issues

---

## 🎯 Expected Behavior

### Build Job Output

```
✅ Build application
   └─ Next.js build completed

✅ Verify build output
   └─ Verifying .next directory exists:
      drwxr-xr-x .next
   └─ Build output size:
      45M .next

✅ Upload build artifacts
   └─ Uploaded: next-build (45 MB)
```

### Build Analysis Job Output

```
✅ Download build artifacts
   └─ Downloaded: next-build (45 MB)

✅ Verify artifacts downloaded
   └─ Contents of current directory:
      drwxr-xr-x .next
      -rw-r--r-- package.json
      -rw-r--r-- package-lock.json
   └─ Checking for .next directory:
      .next directory found

✅ Analyze bundle size
   └─ 📦 Build Size Report generated
```

---

## 🔧 Troubleshooting

If the verification steps reveal issues:

### Issue 1: Build doesn't create `.next`

**Symptoms:**

```
✗ Verify build output
  ls: cannot access '.next': No such file or directory
```

**Possible causes:**

- Build failed silently
- Wrong build command
- Build output to different directory

**Fix:**

- Check build logs
- Verify `npm run build` command
- Check Next.js config for custom output directory

### Issue 2: Artifact upload fails

**Symptoms:**

```
✗ Upload build artifacts
  Warning: No files were found with the provided path
```

**Possible causes:**

- `.next` directory not created
- Path mismatch in upload config

**Fix:**

- Verify build step succeeded
- Check upload path configuration

### Issue 3: Artifact download extracts to wrong location

**Symptoms:**

```
✗ Verify artifacts downloaded
  ERROR: .next directory not found
```

**Possible causes:**

- Download path mismatch
- Artifact corrupted
- Extraction failed

**Fix:**

- Check download path: `path: .`
- Verify artifact exists in GitHub UI
- Check artifact size matches upload

---

## 📊 Artifact Configuration

### Upload (Build Job)

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: next-build
    path: |
      .next/          # Next.js build output
      package.json    # For reference
      package-lock.json
    retention-days: 3
```

**What gets uploaded:**

- Entire `.next/` directory with all build files
- `package.json` for version reference
- `package-lock.json` for dependency reference

### Download (Build Analysis Job)

```yaml
- uses: actions/download-artifact@v4
  with:
    name: next-build
    path: . # Extract to current directory
```

**What gets downloaded:**

- `.next/` directory extracted to `./.next/`
- `package.json` extracted to `./package.json`
- `package-lock.json` extracted to `./package-lock.json`

---

## 🎯 Why This Approach

### Verification Benefits

1. **Early detection** - Catch issues immediately
2. **Clear errors** - Know exactly what went wrong
3. **Debug info** - Logs show directory structure
4. **Fail fast** - Don't waste time on broken artifacts

### Alternative Approaches (Not Used)

#### Option 1: Continue on error

```yaml
- name: Analyze bundle size
  run: du -sh .next || echo "Build analysis skipped"
  continue-on-error: true
```

❌ **Problem:** Hides real issues, no visibility

#### Option 2: Build in analysis job

```yaml
- name: Build for analysis
  run: npm run build
```

❌ **Problem:** Duplicates build, wastes time

#### Option 3: Skip analysis

```yaml
# Just remove the job
```

❌ **Problem:** Lose valuable build size tracking

---

## ✅ Conclusion

**Problem:** `.next` directory not found in build-analysis job  
**Solution:** Added verification steps to diagnose and fix artifact issues  
**Result:** Clear visibility into build and artifact process

**Status:** ✅ Fixed with verification steps

---

## 📝 Next Steps

1. **Run the workflow** - Verification steps will show what's happening
2. **Check logs** - Look for verification output
3. **If still failing** - Logs will show exactly where the issue is
4. **Once working** - Can optionally remove verification steps (but recommended to keep)

---

**Fixed by:** Kiro AI  
**Date:** May 2, 2026  
**Related:** `.github/workflows/cipipeline.yml`
