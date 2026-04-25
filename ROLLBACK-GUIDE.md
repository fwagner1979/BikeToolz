# BikeToolz - Rollback Guide

## Quick Rollback Commands

### View Your History
```bash
git log --oneline
```

### Roll Back to Last Working Version
```bash
# Option 1: Keep changes, just undo commit
git reset --soft HEAD~1

# Option 2: Delete everything, go back completely
git reset --hard HEAD~1

# Option 3: Safest - create a new "undo" commit
git revert HEAD
```

### Roll Back to Specific Version
```bash
# Find commit hash from 'git log'
# Then:
git reset --hard <commit-hash>

# Example: Go back to complete website
git reset --hard 0301958
```

### After Rolling Back, Update GitHub Pages
```bash
# Force push to update the deployed site
git push --force origin claude/continue-cycling-website-011CUKqaxsa2yAWtgC8bwMJL
```

## Important Saved Versions

- **0301958** - Complete BikeToolz website (all features working)
- **b46a33f** - With standalone test file

## Emergency: Recover Deleted Work

If you accidentally delete something:

```bash
# See all commits including "deleted" ones
git reflog

# Restore to any previous state
git reset --hard <reflog-hash>
```

Git keeps EVERYTHING for ~30 days, so you can always recover!
