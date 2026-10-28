# BIBO Application Security & Threat Model Review

**Status**: HARDENING IN PROGRESS  
**Standard**: OWASP Top 10 (2021) & API Security Top 10 (2023)  
**Scope**: Authentication, Authorization, Session Management, Real-time Multiplayer Transport, Game Engine Integrity, Secret Hygiene  

---

## 1. Threat Modeling Overview

BIBO operates in a competitive gaming context where key threats include:
1. **Rating Manipulation & ELO Fraud**: Unauthorized manipulation of competitive scores and leaderboards.
2. **Broken Object Level Authorization (BOLA/IDOR)**: Tampering with another user's profile, settings, or match history.
3. **Move Spoofing & Illegal Game States**: Submitting moves out of turn or bypassing game engine rules.
4. **Credential Stuffing & Brute Force**: Attacking authentication endpoints (`/api/auth/login`, `/api/auth/register`).
5. **Denial of Service (DoS) & SSE Resource Exhaustion**: Flooding game rooms, streaming connections, or rate limiters.
6. **Secret & Key Exposure**: Embedding database connection strings or signing keys in client bundles or public repositories.

---

## 2. Threat Vector Assessment & Mitigations

### 2.1. Authentication & Session Security (OWASP A07:2021)
- **Mechanism**: Cryptographically signed HMAC-SHA256 session tokens in `obscura_session` cookie alongside Neon Managed Better Auth (`better-auth.session_token`).
- **Audit Finding**: In `src/lib/auth-token.ts`, a fallback secret was present in code (`obscura_chess_secure_key_...`).
- **Remediation**: Hardcoded fallback removed. Strict runtime validation requires `SESSION_SECRET` in environment. Token verification enforces tamper-detection and 30-day expiration.
- **Cookie Flags**: Cookies are configured with `HttpOnly: true`, `SameSite: 'lax'`, `Path: '/'`, and `Secure: true` in production environments.

### 2.2. Broken Object Level Authorization & Data Access (OWASP API1:2023)
- **Audit Finding 1**: `/api/auth/onboarding` allowed an authenticated user to overwrite their ratings (`blitzRating`, `rapidRating`, `bulletRating`) at any time up to 2400.
  - **Mitigation**: Locked rating initialization to initial user creation (`onboarded === false`). Subsequent profile updates can only modify display name, avatar, and play style.
- **Audit Finding 2**: `POST /api/matches` accepted arbitrary `whiteId`, `blackId`, and `winnerId` without verifying session identity.
  - **Mitigation**: Enforce server-side session check. Require caller identity to match either `whiteId` or `blackId`. Prevent arbitrary rating deltas for unauthenticated or unrated matches.

### 2.3. Real-Time Multiplayer Authorization & Move Integrity (OWASP API2 & API3:2023)
- **Token Verification**: When players join a game room, the server issues a cryptographically secure `whitePlayerToken` or `blackPlayerToken`.
- **Move Validation**:
  - `POST /api/rooms/[roomId]/move` validates `playerToken` against the active turn's expected player token.
  - Every move is verified against the server-authoritative `IGameEngine` before being accepted.
  - Moves submitted for the wrong turn or with illegal parameters are rejected with HTTP 403 or 400.
- **Echo Defense**: Unique `commandId` parameters are relayed with SSE broadcasts, ensuring clients do not re-apply their own moves.

### 2.4. Rate Limiting & Abuse Defense (OWASP A04:2021)
- **Implementation**: Sliding-window rate limiting in `src/lib/rate-limiter.ts`:
  - Login: 5 requests per 60 seconds per IP (`/api/auth/login`).
  - Registration: 3 requests per 60 seconds per IP (`/api/auth/register`).
  - Room Moves: 10 moves per 5 seconds per room (`/api/rooms/[roomId]/move`).
  - Matches Archive: 6 requests per 60 seconds per IP (`/api/matches`).
- **Client IP Resolution**: Safely prioritizes `cf-connecting-ip`, `x-real-ip`, and the first entry of `x-forwarded-for` to prevent header spoofing.

### 2.5. Web Security Headers & CSP (OWASP A05:2021)
- **Next.js Headers Configuration** (`next.config.ts`):
  - `X-Frame-Options: DENY` (Anti-clickjacking)
  - `X-Content-Type-Options: nosniff` (MIME sniffing defense)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy`: Restricts scripts, frames, and connect sources.

---

## 3. Secret Hygiene Verification
- Hardcoded database URLs in `src/lib/neon-db.ts` have been removed.
- All database credentials must be provided via `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- Version control ignores `.env*` files containing actual production credentials.
