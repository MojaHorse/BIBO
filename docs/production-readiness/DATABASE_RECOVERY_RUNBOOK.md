# BIBO Database Recovery & Incident Runbook

**Database Engine**: Neon Serverless PostgreSQL with PgBouncer  
**Target SLAs**:
- **Recovery Point Objective (RPO)**: < 1 minute (continuous WAL replication).
- **Recovery Time Objective (RTO)**: < 5 minutes (instant branch creation and endpoint swap).

---

## 1. Neon Backup & Point-In-Time Recovery (PITR)

Neon captures every transaction in a continuous Write-Ahead Log (WAL) stream. There are no daily backup batch windows; the database can be restored to any millisecond within the retention window (up to 30 days).

### Procedure: Restoring from Data Corruption or Accidental Deletion

1. **Identify the Incident Timestamp**:
   Determine the exact UTC timestamp immediately prior to data corruption (e.g. `2026-10-28T20:15:00Z`).
2. **Create a Restored Branch from PITR via Neon CLI**:
   ```bash
   neonctl branches create \
     --name recovery-pitr-$(date +%s) \
     --as-of 2026-10-28T20:15:00Z \
     --project-id <neon-project-id>
   ```
3. **Verify Integrity of Restored Branch**:
   Query the newly created branch using its connection string:
   ```bash
   npx tsx -e "
     import { Client } from '@neondatabase/serverless';
     const client = new Client(process.env.RECOVERY_DATABASE_URL);
     await client.connect();
     const res = await client.query('SELECT COUNT(*) FROM \"User\"');
     console.log('Restored user count:', res.rows[0].count);
     await client.end();
   "
   ```
4. **Swap Connection Strings**:
   In the Vercel hosting dashboard, update `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the restored branch endpoint, and trigger an instant deployment.

---

## 2. Handling Failed or Stalled Migrations

If a migration fails midway or becomes marked as "failed" in `_prisma_migrations`:

1. **Inspect Migration State**:
   ```bash
   npx prisma migrate status
   ```
2. **If migration was partially applied and rolled back manually**:
   Mark the migration as rolled back so Prisma will re-attempt it:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
3. **If migration was completed manually via SQL**:
   Mark the migration as applied without re-running the script:
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```
4. **Re-run Deployment**:
   ```bash
   npx prisma migrate deploy
   ```

---

## 3. Resolving Connection Pool Exhaustion

### Symptoms
- HTTP 500 / 503 errors with `Timed out fetching a new connection from the pool` or `remaining connection slots are reserved for non-replication superuser connections`.

### Immediate Mitigation
1. **Verify Client Connection Limit**:
   Ensure `DATABASE_URL` in Vercel environment variables appends `&connection_limit=20`.
2. **Switch Traffic to PgBouncer Pooler**:
   Verify the host domain in `DATABASE_URL` contains `-pooler`:
   `ep-bitter-fog-b5f8zy5u-pooler.c-7.us-east-2.aws.neon.tech`
3. **Terminate Hanging Connections via SQL Console**:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'neondb'
     AND pid <> pg_backend_pid()
     AND state = 'idle in transaction';
   ```
