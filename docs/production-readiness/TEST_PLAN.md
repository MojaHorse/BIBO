# BIBO Test Plan & Quality Assurance Strategy

## 1. Quality Objectives & Test Coverage

To ensure BIBO is reliable and resilient under production workloads, the automated test matrix spans four tiers:
1. **Unit Testing**: Legal move generation, turn order, phase transitions, and win/loss rules across all three game disciplines (Chess, Checkers, Morabaraba).
2. **State Isolation & Bot Testing**: Single-flight ref-guarded bot scheduler, stale calculation rejection, and PlayMode state boundaries.
3. **Security & Authorization Testing**: Session verification, rate limiting, rating tampering prevention, and IDOR protection.
4. **Integration & Multiplayer Testing**: Echo defense, room synchronization, multi-game match conclusion, and ELO calculations.

---

## 2. Test Suites Inventory

| Suite File | Scope | Key Assertions Covered | Status |
|---|---|---|---|
| `tests/game-engine-robustness.test.ts` | Game Engines & Bot Scheduling | Chess legality, Checkers mandatory jumps, Morabaraba kraal phases, bot generation counters, echo defense | Passed (6/6) |
| `tests/auth-guest-removal.test.ts` | Session & Auth Persistence | No ghost guest creation, logout purge, persistent session validity | Passed (4/4) |
| `tests/strict-auth-gate-and-real-data.test.ts` | Proxy & Route Gates | Unauthenticated 307 redirects to `/login`, legacy guest rejection, valid session passthrough | Passed (7/7) |
| `tests/security-rating-and-matches.test.ts` | Security & Competitive Integrity | Prevents rating tampering on `/api/auth/onboarding`, prevents unauthenticated match ingestion, verifies multi-game rating field mapping | Added in Stage B |
| `tests/landing-preview-isolation.test.ts` | Landing Page Preview | Proves preview runs in-memory without creating cookies or guest users, verifies moves and reset | Added in Stage B |

---

## 3. Test Execution Command

Run the complete test suite with:
```bash
npm test
```
Defined in `package.json` as:
```json
"test": "tsx --test tests/**/*.test.ts"
```
