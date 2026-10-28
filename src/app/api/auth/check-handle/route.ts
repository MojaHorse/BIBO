import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sql } from '@/lib/neon-db';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const RESERVED_HANDLES = new Set([
  'admin',
  'system',
  'obscura',
  'stockfish',
  'bot',
  'guest',
  'anonymous',
  'verified',
  'support',
  'moderator',
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = url.searchParams.get('handle')?.trim();
  const userId = url.searchParams.get('userId')?.trim();
  const currentHandle = url.searchParams.get('currentHandle')?.trim();

  if (!handle) {
    return NextResponse.json({ valid: false, error: 'Handle cannot be empty' }, { status: 400 });
  }

  // Same as current handle for this user -> always valid & available
  if (currentHandle && handle.toLowerCase() === currentHandle.toLowerCase()) {
    return NextResponse.json({ valid: true, available: true, handle });
  }

  if (handle.length < 3) {
    return NextResponse.json({ valid: false, error: 'Must be at least 3 characters' });
  }

  if (handle.length > 20) {
    return NextResponse.json({ valid: false, error: 'Maximum 20 characters allowed' });
  }

  if (!HANDLE_REGEX.test(handle)) {
    return NextResponse.json({
      valid: false,
      error: 'Only letters, numbers, and underscores allowed',
    });
  }

  if (RESERVED_HANDLES.has(handle.toLowerCase())) {
    return NextResponse.json({ valid: false, error: 'This handle is reserved by system command' });
  }

  // Check collision excluding current user
  try {
    const rows = await sql`
      SELECT "id" FROM "User"
      WHERE LOWER("handle") = LOWER(${handle})
      ${userId ? sql`AND "id" != ${userId}` : sql``}
      LIMIT 1
    `;

    if (rows.length > 0) {
      const randomSuffix = Math.floor(Math.random() * 899 + 100);
      const suggestions = [
        `${handle}_${randomSuffix}`,
        `Grandmaster_${handle}`,
        `${handle}_Chess`,
      ];
      return NextResponse.json({
        valid: false,
        available: false,
        error: 'Handle is already taken',
        suggestions,
      });
    }
  } catch (sqlErr) {
    console.warn('Neon SQL handle check failed, using Prisma fallback:', sqlErr);

    const existing = await prisma.user.findFirst({
      where: {
        handle: { equals: handle, mode: 'insensitive' },
        ...(userId ? { id: { not: userId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      const randomSuffix = Math.floor(Math.random() * 899 + 100);
      const suggestions = [
        `${handle}_${randomSuffix}`,
        `Grandmaster_${handle}`,
        `${handle}_Chess`,
      ];
      return NextResponse.json({
        valid: false,
        available: false,
        error: 'Handle is already taken',
        suggestions,
      });
    }
  }

  return NextResponse.json({
    valid: true,
    available: true,
    handle,
  });
}
