# BIBO Incident Response & Disaster Recovery Playbook

## 1. Incident Severity Definitions

- **SEV-0 (Critical Disaster)**: Complete platform outage, database corruption, active security breach, rating tampering, or compromised credentials.
- **SEV-1 (High Impact)**: Real-time multiplayer failure (SSE disconnections), game engine crashes, or payment/auth failures.
- **SEV-2 (Medium)**: Degraded performance, high API latency, or broken secondary features (e.g. sound effects or move history replay).
- **SEV-3 (Low)**: Minor visual glitches, cosmetic typos, or non-blocking UI defects.

---

## 2. Response Procedures

### 2.1. SEV-0: Credential Leak or Session Forgery
1. **Rotate Credentials**:
   - Immediately regenerate database credentials in Neon console.
   - Update `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in hosting provider settings.
   - Rotate `SESSION_SECRET` to invalidate all active forged sessions.
2. **Purge Unauthorized State**:
   - Inspect database audit logs for any suspicious updates to `User` ratings or `Match` table.
   - Revert tainted rating updates via targeted SQL script.

### 2.2. SEV-1: Database Connectivity Degradation
1. **Diagnosis**: Check `GET /api/neon/health` to assess database latency and error details.
2. **Neon Serverless Branching**: If primary branch experiences issues, leverage Neon instant branching or failover to standby replica.
3. **Connection Saturation**: Verify whether connections to `DATABASE_URL` (PgBouncer) exceed pool thresholds. Increase pool limit in Neon dashboard if needed.

### 2.3. Emergency Feature Kill-Switch
If a specific game discipline or multiplayer mode experiences an unhandled engine vulnerability:
- Place the affected game into maintenance mode via client banner or routing redirect to prevent competitive integrity loss.

---

## 3. Post-Incident Review (PIR)
Within 48 hours of resolving any SEV-0 or SEV-1 incident, produce a written post-mortem detailing:
- Root cause analysis
- Timeline of detection and remediation
- Impact on active matches and player ratings
- Action items to prevent recurrence
