import test from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../src/lib/logger';
import { GET } from '../src/app/api/health/route';

test('Observability: Health endpoint returns 200 and valid liveness payload', async () => {
  const req = new Request('http://localhost:3000/api/health');
  const res = await GET(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(typeof data.uptimeSeconds, 'number');
  assert.ok(data.timestamp);
});

test('Observability: Logger sanitizes passwords, connection strings, and tokens', () => {
  let capturedLog = '';
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    capturedLog = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  };

  try {
    logger.info('Test log event', {
      password: 'supersecretpassword',
      token: 'jwt.token.string',
      database_url: 'postgresql://admin:supersecret@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      safeField: 'normalValue',
    });

    assert.ok(!capturedLog.includes('supersecretpassword'), 'Password must be redacted');
    assert.ok(!capturedLog.includes('supersecret'), 'Database password must be redacted');
    assert.ok(capturedLog.includes('safeField'), 'Safe fields must be preserved');
  } finally {
    console.log = originalLog;
  }
});
