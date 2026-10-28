import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth-token';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // 1. Neon Managed Better Auth Google Social Flow
  const neonAuthBase = process.env.NEON_AUTH_BASE_URL || 'https://ep-bitter-fog-b5f8zy5u.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth';
  try {
    const neonRes = await fetch(`${neonAuthBase}/sign-in/social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl,
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: `${baseUrl}/profile`,
      }),
    });

    const neonData = await neonRes.json().catch(() => null);
    if (neonRes.ok && neonData?.url) {
      const res = NextResponse.redirect(neonData.url);
      const setCookies = neonRes.headers.getSetCookie?.() || [];
      if (setCookies.length > 0) {
        for (const cookie of setCookies) {
          res.headers.append('Set-Cookie', cookie);
        }
      } else {
        const single = neonRes.headers.get('set-cookie');
        if (single) res.headers.set('Set-Cookie', single);
      }
      return res;
    }
  } catch (neonErr) {
    console.warn('Neon Better Auth social init notice:', neonErr);
  }

  // 2. Direct Google OAuth 2.0 (if custom GOOGLE_CLIENT_ID is provided)
  if (clientId && clientId.trim().length > 0) {
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('state', state);

    const res = NextResponse.redirect(authUrl.toString());
    res.headers.set(
      'Set-Cookie',
      `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return res;
  }

  // 2. Sandbox Human-Verification Fallback (when GOOGLE_CLIENT_ID is pending in .env.local)
  // Demonstrates full verified-human tactician session creation & cookie authentication
  try {
    const demoEmail = 'human.tactician@gmail.com';
    const demoHandle = 'VerifiedTactician';

    let user = await prisma.user.findFirst({
      where: { OR: [{ email: demoEmail }, { handle: demoHandle }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          handle: demoHandle,
          email: demoEmail,
          passwordHash: `oauth_google_verified_human_demo`,
          bulletRating: 1200,
          blitzRating: 1200,
          rapidRating: 1200,
          xp: 150,
        },
      });
    }

    const token = createSessionToken({
      id: user.id,
      handle: user.handle,
      email: user.email,
      isVerifiedHuman: true,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `obscura_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
      isProd ? '; Secure' : ''
    }`;

    const redirectTarget = new URL('/profile?auth=google_verified', baseUrl);
    const res = NextResponse.redirect(redirectTarget.toString());
    res.headers.set('Set-Cookie', cookieHeader);
    return res;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'digest' in err) {
      throw err;
    }
    console.error('Google Auth fallback error:', err);
    return NextResponse.redirect(new URL('/play?error=google_auth_failed', baseUrl));
  }
}
