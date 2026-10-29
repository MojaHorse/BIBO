import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth-token';

export async function GET(req: Request) {
  try {
    let userId: string | null = null;
    let authEmail: string | null = null;
    let isOAuthUser = false;
    let avatarUrl: string | undefined;

    // 1. Try Supabase Auth session first
    try {
      const supabase = await createClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();

      if (sbUser) {
        userId = sbUser.id;
        authEmail = sbUser.email || null;
        avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture;
        isOAuthUser = Boolean(sbUser.app_metadata?.provider && sbUser.app_metadata.provider !== 'email');
      }
    } catch (sbErr) {
      if (typeof sbErr === 'object' && sbErr !== null && 'digest' in sbErr) {
        throw sbErr;
      }
      console.warn('Supabase session inspection notice:', sbErr);
    }

    // 2. Fallback check for session token
    if (!userId) {
      const session = getSessionFromRequest(req);
      if (session?.userId) {
        userId = session.userId;
        avatarUrl = session.avatarUrl;
        isOAuthUser = Boolean(session.isVerifiedHuman);
      }
    }

    if (!userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
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

    // If Supabase user exists but Prisma profile does not yet exist, create it idempotently
    if (!user && authEmail) {
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            email: authEmail,
            handle: authEmail.split('@')[0],
            passwordHash: 'supabase_auth',
            bulletRating: 1200,
            blitzRating: 1200,
            rapidRating: 1200,
            xp: 100,
          },
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
        // In case of conflict or constraint
        user = await prisma.user.findFirst({ where: { email: authEmail } });
      }
    }

    if (!user) {
      const res = NextResponse.json({ authenticated: false, user: null });
      res.cookies.delete('bibo_session');
      res.cookies.delete('obscura_session');
      return res;
    }

    const isVerifiedHuman =
      isOAuthUser || (user.passwordHash && (user.passwordHash.startsWith('oauth_') || user.passwordHash === 'supabase_auth'));

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
        avatarUrl,
        rating: user.blitzRating ?? 1200,
        chessRating: user.blitzRating ?? 1200,
        blitzRating: user.blitzRating ?? 1200,
        rapidRating: user.rapidRating ?? 1200,
        bulletRating: user.bulletRating ?? 1200,
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
