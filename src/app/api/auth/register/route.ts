import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { createSessionToken } from '@/lib/auth-token';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`register_${ip}`, 3, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Registration limit reached. Please wait ${rateCheck.resetInSeconds}s before retrying.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetInSeconds),
          },
        }
      );
    }

    const { handle, email, password, guestId, guestXp } = await req.json();

    if (!handle || !email || !password) {
      return NextResponse.json(
        { error: 'Handle, email, and passcode are required.' },
        { status: 400 }
      );
    }

    const cleanHandle = handle.trim();
    const cleanEmail = email.trim().toLowerCase();
    const initialXp = Math.max(0, Math.min(500_000, Number(guestXp) || 0));

    // Input sanitization & pattern validation
    if (!HANDLE_REGEX.test(cleanHandle)) {
      return NextResponse.json(
        { error: 'Handle must be 3-20 characters long and contain only letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passcode must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ handle: cleanHandle }, { email: cleanEmail }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Handle or email already in use.' },
        { status: 409 }
      );
    }

    // Provision user into Neon Managed Better Auth (if configured)
    const neonAuthBase = process.env.NEON_AUTH_BASE_URL;
    let neonUserId: string | null = null;
    let neonSetCookie: string | null = null;

    if (neonAuthBase) {
      try {
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const neonRes = await fetch(`${neonAuthBase}/sign-up/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': origin,
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: cleanHandle,
          }),
        });

        const neonData = await neonRes.json().catch(() => null);
        if (neonRes.ok && neonData?.user?.id) {
          neonUserId = neonData.user.id;
          neonSetCookie = neonRes.headers.get('set-cookie');
        } else if (!neonRes.ok && neonData?.code === 'USER_ALREADY_EXISTS') {
          return NextResponse.json(
            { error: 'An account with this email already exists in Neon Auth.' },
            { status: 409 }
          );
        }
      } catch (neonErr) {
        console.warn('Neon Better Auth provision notice:', neonErr);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        ...(neonUserId ? { id: neonUserId } : {}),
        handle: cleanHandle,
        email: cleanEmail,
        passwordHash,
        bulletRating: 1200,
        blitzRating: 1200,
        rapidRating: 1200,
        xp: initialXp,
      },
      select: {
        id: true,
        handle: true,
        email: true,
        isPro: true,
        bulletRating: true,
        blitzRating: true,
        rapidRating: true,
        checkersRating: true,
        morabarabaRating: true,
        xp: true,
        createdAt: true,
      },
    });

    // Seamlessly re-assign any recorded matches played during guest session
    if (guestId && typeof guestId === 'string' && guestId.startsWith('guest_')) {
      try {
        await prisma.$transaction([
          prisma.match.updateMany({
            where: { whiteId: guestId },
            data: { whiteId: user.id },
          }),
          prisma.match.updateMany({
            where: { blackId: guestId },
            data: { blackId: user.id },
          }),
          prisma.match.updateMany({
            where: { winnerId: guestId },
            data: { winnerId: user.id },
          }),
        ]);
      } catch (migrationErr) {
        console.warn('Guest match migration notice:', migrationErr);
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

    const res = NextResponse.json({ token, user, neonAuth: Boolean(neonUserId) }, { status: 201 });
    res.headers.set('Set-Cookie', cookieHeader);
    if (neonSetCookie) {
      res.headers.append('Set-Cookie', neonSetCookie);
    }
    return res;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create tactician account.' },
      { status: 500 }
    );
  }
}
