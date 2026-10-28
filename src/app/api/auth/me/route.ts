import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sql } from '@/lib/neon-db';
import { getSessionFromRequest } from '@/lib/auth-token';

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    let user: any = null;
    try {
      const rows = await sql`SELECT * FROM "User" WHERE "id" = ${session.userId} LIMIT 1`;
      user = rows[0] || null;
    } catch {
      try {
        user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatar: true,
            playStyle: true,
            onboarded: true,
            email: true,
            blitzRating: true,
            rapidRating: true,
            bulletRating: true,
            checkersRating: true,
            morabarabaRating: true,
            xp: true,
            passwordHash: true,
            createdAt: true,
          },
        });
      } catch {
        user = null;
      }
    }

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const isVerifiedHuman =
      Boolean(session.isVerifiedHuman) || (user.passwordHash && user.passwordHash.startsWith('oauth_google_'));

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName || user.handle,
        avatar: user.avatar || 'knight',
        playStyle: user.playStyle || 'Tactical',
        onboarded: Boolean(user.onboarded),
        email: user.email,
        isVerifiedHuman,
        avatarUrl: session.avatarUrl,
        blitzRating: user.blitzRating,
        rapidRating: user.rapidRating,
        bulletRating: user.bulletRating,
        checkersRating: user.checkersRating ?? 1200,
        morabarabaRating: user.morabarabaRating ?? 1200,
        xp: user.xp,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'digest' in err) {
      throw err;
    }
    console.error('Session retrieval error:', err);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
