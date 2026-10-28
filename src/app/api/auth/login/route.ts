import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { createSessionToken } from '@/lib/auth-token';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`login_${ip}`, 5, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please retry in ${rateCheck.resetInSeconds} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetInSeconds),
          },
        }
      );
    }

    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and passcode are required.' },
        { status: 400 }
      );
    }

    const clean = identifier.trim().toLowerCase();
    const neonAuthBase = process.env.NEON_AUTH_BASE_URL;
    let targetEmail = clean;

    // If identifier is handle, check if user exists in local DB to resolve email
    if (!clean.includes('@')) {
      const u = await prisma.user.findFirst({
        where: { handle: { equals: clean, mode: 'insensitive' } },
      });
      if (u) {
        targetEmail = u.email;
      }
    }

    let neonSetCookie: string | null = null;
    let neonUser: { id: string; email: string; name?: string } | null = null;

    // 1. Authenticate against Neon Managed Better Auth (if configured)
    if (neonAuthBase) {
      try {
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const neonRes = await fetch(`${neonAuthBase}/sign-in/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': origin,
          },
          body: JSON.stringify({ email: targetEmail, password }),
        });

        const neonData = await neonRes.json().catch(() => null);
        if (neonRes.ok && neonData?.user) {
          neonUser = neonData.user;
          neonSetCookie = neonRes.headers.get('set-cookie');
        }
      } catch (neonErr) {
        console.warn('Neon Better Auth sign-in notice:', neonErr);
      }
    }

    let user = null;

    if (neonUser) {
      // Find or synchronize with application User record
      user = await prisma.user.findFirst({
        where: { OR: [{ id: neonUser.id }, { email: neonUser.email }] },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: neonUser.id,
            email: neonUser.email,
            handle: neonUser.name || neonUser.email.split('@')[0],
            passwordHash: 'neon_better_auth',
            bulletRating: 1200,
            blitzRating: 1200,
            rapidRating: 1200,
            xp: 0,
          },
        });
      }
    } else {
      // 2. Legacy fallback check
      user = await prisma.user.findFirst({
        where: {
          OR: [{ handle: clean }, { email: clean }],
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid tactician credentials.' },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid tactician credentials.' },
          { status: 401 }
        );
      }
    }

    const token = createSessionToken({
      id: user.id,
      handle: user.handle,
      email: user.email,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `obscura_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
      isProd ? '; Secure' : ''
    }`;

    const res = NextResponse.json({
      token,
      neonAuth: Boolean(neonUser),
      user: {
        id: user.id,
        handle: user.handle,
        email: user.email,
        isPro: user.isPro,
        bulletRating: user.bulletRating,
        blitzRating: user.blitzRating,
        rapidRating: user.rapidRating,
        checkersRating: user.checkersRating ?? 1200,
        morabarabaRating: user.morabarabaRating ?? 1200,
        xp: user.xp,
        createdAt: user.createdAt,
      },
    });

    res.headers.set('Set-Cookie', cookieHeader);
    if (neonSetCookie) {
      res.headers.append('Set-Cookie', neonSetCookie);
    }
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
