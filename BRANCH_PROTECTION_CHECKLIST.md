# Branch Protection Checklist

## Settings → Branches → Add Rule (or Edit existing)

### Branch name pattern:
```
main
```

### Required Settings:

#### 1. Pull Request Requirements
- [x] Require a pull request before merging
- [x] Require approvals (set to 1)
- [x] Dismiss stale pull request approvals when new commits are pushed

#### 2. Status Checks
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Status checks that are required:
  - [x] Check Formatting
  - [x] Run Playwright Tests

#### 3. Additional Rules
- [x] Require conversation resolution before merging
- [x] Require linear history (optional but recommended)

#### 4. Admin Enforcement (CRITICAL!)
- [x] **Do not allow bypassing the above settings**
  - This is the key setting that prevents admin pushes!

#### 5. Restrictions
- [ ] Allow force pushes (LEAVE UNCHECKED)
- [ ] Allow deletions (LEAVE UNCHECKED)

## After Saving:

1. Click "Save changes" at the bottom
2. Verify the rule appears in the branch list with a green checkmark
3. Test by trying to push directly to main:
   ```bash
   git push origin main
   ```
   Should see: `remote: error: GH006: Protected branch update failed`

## Correct Workflow:

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to feature branch
git push origin feature/my-feature

# Create PR on GitHub
# Wait for checks to pass
# Get approval
# Merge via GitHub UI
```

## If You Still Can Push:

1. Double-check "Do not allow bypassing the above settings" is checked
2. Sign out and sign back in to GitHub
3. Clear git credentials cache
4. Try pushing again
