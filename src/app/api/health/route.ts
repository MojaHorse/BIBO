import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkReadiness = url.searchParams.get('check') === 'ready' || url.searchParams.get('ready') === '1';
  const timestamp = new Date().toISOString();

  // 1. Basic Liveness Probe (process is alive and serving HTTP)
  if (!checkReadiness) {
    return NextResponse.json({
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    });
  }

  // 2. Readiness Probe (checks critical PostgreSQL dependency)
  try {
    const start = Date.now();
    // Query with 2.5s execution guard
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database ping timeout')), 2500)),
    ]);
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ready',
      database: 'connected',
      latencyMs,
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unreachable',
        timestamp,
      },
      { status: 503 }
    );
  }
}
