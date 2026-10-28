# BIBO CI/CD Runbook & Automation Guide

**Continuous Integration Engine**: GitHub Actions  
**Continuous Delivery Engine**: Vercel Git Integration  

---

## 1. CI Pipeline Architecture (`.github/workflows/ci.yml`)

Every Pull Request and push to `main` executes the unified quality gate pipeline on `ubuntu-latest`:

```
[ Developer Push / PR ]
         │
         ▼
[ GitHub Actions: quality-gate ]
   ├── 1. Checkout (actions/checkout@v4)
   ├── 2. Node.js Setup (node-version: 22, cache: 'npm')
   ├── 3. npm ci (lockfile integrity verification)
   ├── 4. Prisma Schema Validation (npx prisma validate)
   ├── 5. Prisma Client Generation (npx prisma generate)
   ├── 6. TypeScript Typecheck (npx tsc --noEmit)
   ├── 7. ESLint Quality Check (npm run lint)
   ├── 8. Automated Tests (npm test -> 31 unit/integration tests)
   └── 9. Production Build (npm run build with Turbopack)
         │
         ▼
[ Pass: PR Mergeable / Fail: Merge Blocked ]
```

### Safety & Isolation Guarantees
- **Zero Production Database Access**: The CI pipeline runs against mock / in-memory environment variables (`DATABASE_URL=postgresql://ci_user:...`). It never touches the production Neon database.
- **Strict Exit Codes**: Any failed test, lint error, or compilation failure exits with non-zero code and blocks the pull request.
- **Pinned Actions**: Uses official pinned actions (`actions/checkout@v4`, `actions/setup-node@v4`).

---

## 2. Recommended GitHub Branch Protection Rules

Configure in GitHub: **Settings -> Branches -> Add branch protection rule** for `main`:

1. **Require status checks to pass before merging**:
   - Check `Build, Lint, Test & Validate` (from `.github/workflows/ci.yml`).
   - Require branches to be up to date before merging.
2. **Require a pull request before merging**:
   - Minimum 1 approving review.
   - Dismiss stale pull request approvals when new commits are pushed.
3. **Do not allow bypassing the above settings**:
   - Enforce for administrators.
4. **Restrict force pushes and deletions**:
   - Block `git push --force` and deletion of `main`.

---

## 3. Vercel Continuous Deployment Configuration

### Project Settings in Vercel Dashboard
1. **Framework Preset**: `Next.js`
2. **Root Directory**: `./`
3. **Build Command**:
   ```bash
   prisma generate && next build
   ```
4. **Install Command**:
   ```bash
   npm install
   ```
5. **Output Directory**: `.next`

### Deployment Triggers
- **Pull Requests**: Vercel automatically deploys an isolated preview environment at `https://bibo-<branch>-<team>.vercel.app`.
- **Merge to `main`**: Vercel triggers production deployment to canonical domain.
- **Pre-deployment Database Migrations**:
  Before triggering production deployments that include new database migrations, execute:
  ```bash
  npx prisma migrate deploy
  ```
  using the direct unpooled connection string (`DATABASE_URL_UNPOOLED`).
