import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const results: Record<string, { status: 'healthy' | 'error'; latencyMs?: number; details?: unknown }> = {};

  // 1. Neon Postgres
  try {
    const start = Date.now();
    const dbRes = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const userCount = await prisma.user.count();
    const latency = Date.now() - start;

    const isProd = process.env.NODE_ENV === 'production';

    results.postgres = {
      status: 'healthy',
      latencyMs: latency,
      ...(isProd
        ? {}
        : {
            details: {
              server: dbRes[0]?.version?.split(' ')?.[0] || 'PostgreSQL',
              userCount,
              branch: process.env.NEON_BRANCH || 'production',
            },
          }),
    };
  } catch (err: unknown) {
    const isProd = process.env.NODE_ENV === 'production';
    results.postgres = {
      status: 'error',
      ...(isProd ? {} : { details: err instanceof Error ? err.message : String(err) }),
    };
  }

  // 2. Neon Auth
  try {
    const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
    if (!jwksUrl) throw new Error('NEON_AUTH_JWKS_URL not defined');

    const start = Date.now();
    const res = await fetch(jwksUrl, { cache: 'no-store' });
    const jwks = await res.json();
    const latency = Date.now() - start;

    const isProd = process.env.NODE_ENV === 'production';
    results.auth = {
      status: 'healthy',
      latencyMs: latency,
      ...(isProd ? {} : { details: { keysCount: jwks.keys?.length || 0, baseUrl: process.env.NEON_AUTH_BASE_URL } }),
    };
  } catch (err: unknown) {
    const isProd = process.env.NODE_ENV === 'production';
    results.auth = {
      status: 'error',
      ...(isProd ? {} : { details: err instanceof Error ? err.message : String(err) }),
    };
  }

  // 3. Neon Functions
  try {
    const functionUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
    if (!functionUrl) throw new Error('NEON_FUNCTION_HELLO_BASE_URL not defined');

    const start = Date.now();
    const res = await fetch(functionUrl, { cache: 'no-store' });
    const text = await res.text();
    const latency = Date.now() - start;
    const isProd = process.env.NODE_ENV === 'production';

    results.functions = {
      status: 'healthy',
      latencyMs: latency,
      ...(isProd ? {} : { details: { functionOutput: text.trim(), functionUrl } }),
    };
  } catch (err: unknown) {
    const isProd = process.env.NODE_ENV === 'production';
    results.functions = {
      status: 'error',
      ...(isProd ? {} : { details: err instanceof Error ? err.message : String(err) }),
    };
  }

  // 4. Neon Realtime
  try {
    const rtUrl = process.env.NEON_REALTIME_URL;
    const rtSecret = process.env.NEON_REALTIME_SECRET;

    if (!rtUrl || !rtSecret) throw new Error('Realtime URL or secret not configured');

    const isProd = process.env.NODE_ENV === 'production';
    results.realtime = {
      status: 'healthy',
      ...(isProd ? {} : { details: { websocketUrl: rtUrl, secretConfigured: rtSecret.startsWith('nrt_live_') } }),
    };
  } catch (err: unknown) {
    const isProd = process.env.NODE_ENV === 'production';
    results.realtime = {
      status: 'error',
      ...(isProd ? {} : { details: err instanceof Error ? err.message : String(err) }),
    };
  }

  const allHealthy = Object.values(results).every((r) => r.status === 'healthy');

  return NextResponse.json(
    {
      overall: allHealthy ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
