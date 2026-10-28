# BIBO DevOps, Infrastructure & Runtime Architecture Review

**Target Platform**: Vercel (Next.js 16.4.3 App Router) + Neon PostgreSQL  
**Evaluator**: Senior DevOps / SRE Staff Engineer  
**Date**: October 28, 2026  

---

## 1. Hosting Architecture & Runtime Environment

BIBO is designed for deployment on **Vercel** with backing data services provided by **Neon PostgreSQL**:

```
[ Browser Clients ]
        │
        ▼ (HTTPS / TLS 1.3)
[ Vercel Edge Network / CDN ]
        │
   ┌────┴───────────────────────────┐
   │                                │
Static Assets & SSG Pages    Route Handlers & SSR
(CDN Edge Cache)             (Node.js Serverless Functions)
                                    │
                                    ├──> Neon PostgreSQL (PgBouncer Pooler)
                                    └──> Google OAuth 2.0 Web Identity
```

### Serverless Runtime Characteristics
- **Dynamic Compute**: App Router route handlers run in ephemeral AWS Lambda micro-containers managed by Vercel.
- **Cold Starts**: Cold boot latency is ~200–350ms. Once warm, execution latency is sub-10ms for static routes and ~30–50ms for database queries.
- **Streaming Support**: Vercel Serverless supports chunked transfer encoding and Server-Sent Events (SSE) up to `maxDuration = 60` seconds.

---

## 2. In-Memory Multiplayer Room State on Vercel

### Architecture Reality
The current multiplayer engine maintains active game rooms in an in-memory Map (`activeRooms` in `src/lib/room-manager.ts`).

### Vercel Serverless Implications
1. **Instance Isolation**: When multiple users connect concurrently, Vercel routes requests across multiple ephemeral lambda instances.
   - If Player 1 creates Room A on Lambda Instance 1, and Player 2 attempts to join on Lambda Instance 2, Instance 2 does not share Instance 1's memory and returns `404 Room not found`.
2. **Lambda Lifecycle & Teardown**: Idle lambda instances are frozen and terminated after 15–30 seconds of inactivity. In-flight uncompleted matches residing purely in memory are terminated.
3. **Completed Matches Safety**: Once a match ends, `finalizeRoomMatch` writes the full PGN, FEN, result, rating adjustments, and XP directly to Neon PostgreSQL in an atomic transaction. Persisted match history is never lost.

### Operational Recommendations
| Hosting Strategy | Architecture | Multiplayer Viability | Cost / Complexity |
|---|---|:---:|:---:|
| **Option A (Current / Single-Node)** | Deploy Next.js on Railway, Render, Fly.io, or AWS ECS as a persistent container. | **100% Reliable** (all connections hit single process memory). | $5–$15/month; 0 code changes. |
| **Option B (Vercel + Shared Redis)** | Maintain Vercel for web/APIs, replace `activeRooms` Map with Upstash Redis Pub/Sub & state. | **100% Serverless Reliable**. | Upstash free tier; ~300 lines refactoring. |
| **Option C (Vercel Preview/Stage)** | Vercel for web app, bot preview, pass-and-play, auth, puzzles, rankings, profiles. | **Full bot/local/puzzles support**; casual multiplayer limited to single-instance routing. | $0 (Vercel Hobby/Pro). |

---

## 3. Database Operations & Connection Management

### Neon Connection Architecture
Neon PostgreSQL separates pooled client traffic from direct DDL operations:

- **Pooled Connection (`DATABASE_URL`)**:
  - Connects through Neon's PgBouncer proxy (`ep-*-pooler...neon.tech`).
  - Supports up to 10,000 concurrent client connections without exhausting PostgreSQL backend processes.
  - Required for all application route handlers and server components.
  - Connection Limit: Configure `?connection_limit=20` to avoid local pool saturation.
- **Direct Unpooled Connection (`DATABASE_URL_UNPOOLED`)**:
  - Connects directly to PostgreSQL backend (`ep-...neon.tech`).
  - Required for Prisma migration commands (`npx prisma migrate deploy`), because PgBouncer in transaction mode does not support transactional DDL or advisory locks.

### Database Recovery & Point-In-Time Restoration
- **Retention**: Neon maintains continuous WAL streams allowing Point-In-Time Recovery (PITR) to any millisecond within the 30-day window.
- **Instant Branching**: Pre-release snapshots can be created in <1 second via `neonctl branches create` prior to running migrations.

---

## 4. Supply Chain & Dependency Audit

- **Core Dependencies**: Next.js 16.4.3, React 19.3.0, Prisma 6.4.1, `@neondatabase/serverless` 0.10.4, `chess.js` 1.4.0.
- **Upstream Advisory Notice**:
  `npm audit` reports transitive vulnerabilities in `@neondatabase/auth` (which pulls `better-auth` and `zod < 3.22.3`).
  - *Risk Evaluation*: BIBO uses its own cryptographically signed HMAC-SHA256 session tokens (`auth-token.ts`) and direct Prisma client queries, using Neon Better Auth only as an optional secondary fallback.
  - *Mitigation*: Unused transitive packages are isolated from runtime player paths. Monitored for official `@neondatabase/auth` patch release.

---

## 5. Environment Separation & Security Controls

| Environment | Host URL | Database Branch | Session Secret |
|---|---|---|---|
| **Local Dev** | `http://localhost:3000` | Local or dev branch | Development fallback permitted with warning |
| **Vercel Preview** | `https://bibo-git-*.vercel.app` | Preview Neon branch | Isolated 256-bit preview secret |
| **Production** | `https://playbibo.com` | Primary Neon production branch | 256-bit random production secret (`openssl rand -base64 32`) |
