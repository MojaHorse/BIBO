# BIBO Performance & Load Test Plan

**Auditor / Performance Engineer**: Staff SRE  
**Tooling**: `k6` (or `autocannon` / `artillery`)  
**Target Environment**: Staging / Preview Environment (*Never run destructive load tests against production*)  

---

## 1. Measurable Performance Targets (Initial Assumptions)

| Journey / Endpoint | Target Concurrency | P95 Latency SLA | Error Rate SLA | Target Throughput |
|---|:---:|:---:|:---:|:---:|
| **Landing Page & Preview** (`GET /`) | 500 VUs | < 80ms | 0.00% | 1,000 req/sec |
| **Liveness Probe** (`GET /api/health`) | 200 VUs | < 30ms | 0.00% | 2,500 req/sec |
| **Readiness Probe** (`GET /api/health?check=ready`) | 50 VUs | < 50ms | < 0.1% | 200 req/sec |
| **Authentication** (`POST /api/auth/login`) | 50 VUs | < 250ms | < 0.5% | 100 req/sec |
| **Room Creation** (`POST /api/rooms`) | 30 VUs | < 120ms | < 0.5% | 60 req/sec |
| **Move Submission** (`POST /api/rooms/*/move`) | 100 VUs | < 100ms | < 0.2% | 250 req/sec |
| **Match Finalization** (Prisma Transaction) | 20 VUs | < 200ms | < 0.1% | 40 req/sec |

---

## 2. Test Scenarios

### Scenario 1: Landing Page Spike Test
- **Purpose**: Verify CDN edge caching and static asset delivery under sudden viral traffic.
- **Profile**: Ramp from 0 to 500 Virtual Users (VUs) over 30s; hold for 2 minutes; ramp down over 15s.
- **Success Criteria**: 0% error rate; HTTP 200 responses served primarily from Vercel Edge Cache.

### Scenario 2: Bot Preview Memory & Compute Test
- **Purpose**: Measure client/browser-side bot search latency across Novice, Intermediate, and Master bots without backend calls.
- **Profile**: Execute 20 simulated games per game discipline (Chess, Checkers, Morabaraba).
- **Success Criteria**: Bot move calculated in <300ms; zero network requests sent to `/api/matches` or `/api/rooms`.

### Scenario 3: Database Concurrency & Connection Pool Saturation
- **Purpose**: Validate Neon PgBouncer stability during simultaneous match completions.
- **Profile**: 20 concurrent transactions writing to `Match` and updating `User` ratings.
- **Success Criteria**: 100% of Prisma transactions commit within 250ms; zero `pool timeout` errors.

---

## 3. k6 Test Script Example (`tests/load/k6-smoke.js`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check
  const resHealth = http.get(`${BASE_URL}/api/health`);
  check(resHealth, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Landing page
  const resLanding = http.get(`${BASE_URL}/`);
  check(resLanding, {
    'landing status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```
