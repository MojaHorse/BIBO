# BIBO Monitoring, Observability & Alerting Guide

---

## 1. Health & Synthetic Probes

BIBO exposes three dedicated probe endpoints for uptime monitoring and load-balancer orchestration:

| Endpoint | Probe Type | Description | Expected HTTP Status |
|---|---|---|:---:|
| `GET /api/health` | **Liveness** | Verifies Next.js process is active and serving traffic. Does not call external dependencies. | `200 OK` |
| `GET /api/health?check=ready` | **Readiness** | Executes a lightweight `SELECT 1` query to verify database reachability with a 2.5s guard. | `200 OK` (or `503 Service Unavailable`) |
| `GET /api/neon/health` | **Deep Dependency** | Audits Neon Postgres, Auth, and Functions latency (sanitized in production; no error stack leaks). | `200 OK` (or `503 Service Unavailable`) |

### Recommended Synthetic Ping Frequency
- Configure external uptime monitor (e.g. BetterStack, UptimeRobot, or Checkly):
  - `GET https://<domain>/api/health` every 30 seconds.
  - `GET https://<domain>/api/health?check=ready` every 60 seconds.

---

## 2. Core Operational Metrics & Thresholds

| Metric | Target / Healthy SLA | Warning Threshold (SEV-2) | Critical Alert Threshold (SEV-1) |
|---|---|---|---|
| **HTTP 5xx Error Rate** | < 0.1% | > 1.0% over 5 minutes | > 5.0% over 2 minutes |
| **P95 Route Latency** | < 150ms | > 350ms over 5 minutes | > 1,000ms over 5 minutes |
| **Database Query Latency** | < 25ms | > 100ms over 5 minutes | > 500ms over 2 minutes |
| **Match Finalization Failure** | 0 failures | > 2 failures in 10 minutes | > 5 failures in 5 minutes |
| **Active SSE Reconnections** | Routine background rate | > 20 reconnections/min | Connection drop storm |

---

## 3. Structured Logging Standard

All system events, audit trails, and errors utilize `src/lib/logger.ts`. In production (`NODE_ENV=production`), output is single-line JSON:

```json
{
  "timestamp": "2026-10-28T20:25:00.123Z",
  "level": "error",
  "message": "Match finalization transaction failed",
  "commit": "e8fb3dc",
  "route": "/api/rooms/[roomId]/move",
  "roomId": "room_a1b2",
  "errorCategory": "DATABASE_TIMEOUT"
}
```

### Sensitive Data Redaction
The logger automatically redacts passwords, tokens, session cookies, database connection strings, and authorization headers before outputting to stdout.

---

## 4. Recommended Observability Stack

1. **Error Tracking**: **Sentry** (`@sentry/nextjs`).
   - Captures unhandled React render crashes and route handler exceptions with stack traces.
2. **Log Management**: **Vercel Log Drains** -> **Axiom** or **Datadog**.
   - Streams JSON logs for ingestion, aggregation, and querying.
3. **Web Vitals**: **Vercel Speed Insights**.
   - Monitors Core Web Vitals (LCP, INP, CLS) from real user desktop and mobile browsers.
