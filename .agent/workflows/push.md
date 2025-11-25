---
description: Push code changes to GitHub
---

# Push Code to GitHub

This workflow commits and pushes your daily changes to GitHub.

## Steps

// turbo-all
1. Stage all changes
```bash
git add .
```

2. Commit with timestamp
```bash
git commit -m "Daily update: $(date +%Y-%m-%d)"
```

3. Push to GitHub
```bash
git push origin main
```

## Notes
- All changes in your working directory will be committed
- The commit message includes the current date
- Changes are pushed to the main branch on GitHub
