# BIBO Production Deployment Runbook

**Evaluated Git Commit**: `e8fb3dc2acaa9c8443ac442ef68e43c3566bdfef` (with hardening modifications)  
**Target Environment**: Production / Staging  

---

## 1. Prerequisites & Environment Configuration

### Required Production Environment Variables
The following environment variables must be populated in the production hosting dashboard (e.g. Vercel, Railway, Render, AWS ECS). **Never hardcode or log secret values.**

| Variable Name | Required | Purpose | Format / Verification |
|---|:---:|---|---|
| `DATABASE_URL` | **YES** | Pooled Neon PostgreSQL connection string (PgBouncer) | `postgresql://user:pass@ep-*-pooler.neon.tech/neondb?sslmode=require&connection_limit=20` |
| `DATABASE_URL_UNPOOLED` | **YES** | Direct unpooled Neon connection string for migrations | `postgresql://user:pass@ep-*.neon.tech/neondb?sslmode=require` |
| `SESSION_SECRET` | **YES** | Cryptographic key for HMAC-SHA256 session token signatures | High-entropy 256-bit random string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | **YES** | Canonical public origin URL | `https://playbibo.com` or `https://<domain>` |
| `GOOGLE_CLIENT_ID` | **YES** | Google OAuth 2.0 Web Client ID | `<id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **YES** | Google OAuth 2.0 Client Secret | High-entropy Google client secret string |
| `NEON_AUTH_BASE_URL` | OPTIONAL | Neon Managed Better Auth base URL (if enabled) | `https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth` |
| `NEON_AUTH_JWKS_URL` | OPTIONAL | Neon Auth JWKS public key endpoint | `https://<endpoint>.neonauth.<region>.aws.neon.tech/neondb/auth/.well-known/jwks.json` |
| `NEON_BRANCH` | OPTIONAL | Neon branch identifier for health telemetry | `production` |

---

## 2. Infrastructure & Hosting Architecture

### Room State & Multiplayer Concurrency
- **Current Implementation**: Multiplayer rooms are managed in Node.js server process memory (`activeRooms` Map in `src/lib/room-manager.ts`) and streamed to clients using Server-Sent Events (SSE).
- **Hosting Constraint**:
  - The hosting provider **must** route requests for the same room to the same Node.js process.
  - Multi-instance serverless deployments without sticky sessions (e.g. standard multi-region serverless lambdas) will fragment room state.
  - **Recommended Production Topology**: Run Next.js on a persistent single-instance container (e.g. Railway, Render, Fly.io, or AWS ECS with sticky sessions enabled).
  - **Horizontal Scaling Path**: If horizontal autoscaling across multiple distinct nodes is required in the future, room state and pub/sub events must be bridged via Redis Pub/Sub or a hosted websocket gateway (e.g. Ably/Pusher). Single-instance deployment requires no external dependencies and is sufficient for initial launch.

### Database Connection Pool Sizing
- Neon PgBouncer supports up to thousands of client connections, but backend compute connections are limited.
- Append `?connection_limit=20` to `DATABASE_URL` to prevent connection exhaustion.
- Use `DATABASE_URL_UNPOOLED` exclusively for Prisma CLI commands (`prisma migrate deploy`).

---

## 3. Pre-Deployment Verification Checklist

Before deploying a release to production:
1. **Type Check**: `npx tsc --noEmit` exits with code 0.
2. **Lint Check**: `npm run lint` exits with code 0 (0 errors).
3. **Automated Tests**: `npm test` runs 31/31 unit and integration tests with 0 failures.
4. **Build Verification**: `npm run build` compiles all 36 static and dynamic routes cleanly.
5. **Database Migration Verification**: Ensure migration sequence has been tested on a disposable schema and is ready for `npx prisma migrate deploy`.

---

## 4. Production Deployment Procedure (Vercel)

Execute the following sequential deployment workflow:

### Step 1: Pre-Flight Database Migration
Before triggering the Vercel production build, apply pending migrations using the direct unpooled connection:
```bash
npx prisma migrate deploy
```
Verify migration status:
```bash
npx prisma migrate status
```

### Step 2: Push Tested Commit to GitHub
Ensure all CI checks pass on `main`:
```bash
git push origin main
```

### Step 3: Vercel Project Setup & Deployment
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New -> Project**, select repository `MojaHorse/BIBO`.
3. Framework Preset: **Next.js**.
4. Configure Environment Variables in Vercel settings (Section 1).
5. Deploy: Vercel automatically runs `prisma generate && next build` and deploys to the edge network.

---

## 5. Post-Deployment Smoke Tests

Execute within 5 minutes of deploying:
1. **Visitor Landing Experience**:
   - Navigate to `/`.
   - Scroll to `#preview`.
   - Play 2 moves against Novice Bot in Chess, Checkers, and Morabaraba.
   - Verify zero cookies are created (`document.cookie` is empty).
   - Verify no user accounts are written to the database.
2. **Authentication Flow**:
   - Log in with valid credentials at `/login`.
   - Verify `obscura_session` cookie is present with `HttpOnly`, `SameSite=Lax`, and `Secure`.
3. **Canonical Route Verification**:
   - Access `/play/chess`, `/play/checkers`, and `/play/morabaraba`.
   - Access legacy `/checkers` and verify 308 permanent redirect to `/play/checkers`.
   - Access legacy `/morabaraba` and verify 308 permanent redirect to `/play/morabaraba`.
4. **Health Check Telemetry**:
   - Issue `GET /api/neon/health`.
   - In production (`NODE_ENV=production`), verify response status is `200 OK` and internal error strings, user counts, or function URLs are **not** exposed.
5. **Play Hub & Arena**:
   - Launch a 5-minute Casual match.
   - Verify board rendering, legal move highlights, acoustic tone synthesis, and turn transitions.

---

## 6. Backup, Recovery & Rollback Procedure

### Neon Point-in-Time Recovery (PITR) & Instant Branching
1. **Create Pre-Release Branch Snapshot**:
   Before executing database migrations on major releases, create an instantaneous Neon branch snapshot via the Neon CLI or Console:
   ```bash
   neonctl branches create --name pre-release-snapshot --project-id <project-id>
   ```
2. **Restore / Point-in-Time Recovery**:
   If catastrophic data corruption occurs, restore the database to any millisecond within the retention window (up to 30 days on Neon Pro) via the Neon Console.

### Application Rollback
- In your hosting platform (Vercel/Railway), trigger an instant rollback to the previous deployment.
- **Database Backward Compatibility**: Because all schema migrations in `prisma/migrations/` use non-destructive, additive definitions (`CREATE INDEX IF NOT EXISTS`), the previous application version runs with 100% compatibility against the migrated database. No database rollback is required.
