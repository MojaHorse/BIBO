import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth-token';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (error || !code) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/play?error=google_denied', baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/play?error=google_config_missing', baseUrl));
  }

  try {
    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange failure:', errText);
      return NextResponse.redirect(new URL('/play?error=google_token_exchange', baseUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch verified Google user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/play?error=google_userinfo_failed', baseUrl));
    }

    const googleUser = await userRes.json();
    const { sub, email, email_verified, name, picture } = googleUser;

    // Enforce email verification to confirm genuine human identity
    if (!email || !email_verified) {
      return NextResponse.redirect(new URL('/play?error=unverified_google_email', baseUrl));
    }

    // Parse optional guest migration credentials
    const reqCookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      reqCookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    const migrationData = cookies['obscura_guest_migration'] || '';
    const [guestId, rawGuestXp] = migrationData.split(':');
    const guestXp = Math.max(0, Math.min(500_000, parseInt(rawGuestXp, 10) || 0));

    // 3. Find or create tactician in Neon PostgreSQL
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Generate clean unique handle from name or email
      const baseHandle = (name || email.split('@')[0])
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 14);

      let uniqueHandle = baseHandle.length >= 3 ? baseHandle : `Tactician_${sub.slice(-4)}`;

      // Check collision
      const collision = await prisma.user.findUnique({ where: { handle: uniqueHandle } });
      if (collision) {
        uniqueHandle = `${uniqueHandle.slice(0, 10)}_${Math.floor(Math.random() * 899 + 100)}`;
      }

      user = await prisma.user.create({
        data: {
          handle: uniqueHandle,
          email: email.toLowerCase(),
          passwordHash: `oauth_google_${sub}`,
          bulletRating: 1200,
          blitzRating: 1200,
          rapidRating: 1200,
          xp: 200 + guestXp, // Welcome verified human bonus + preserved guest XP
        },
      });

      // Re-link previous guest matches to new permanent tactician account
      if (guestId && guestId.startsWith('guest_')) {
        try {
          await prisma.$transaction([
            prisma.match.updateMany({ where: { whiteId: guestId }, data: { whiteId: user.id } }),
            prisma.match.updateMany({ where: { blackId: guestId }, data: { blackId: user.id } }),
            prisma.match.updateMany({ where: { winnerId: guestId }, data: { winnerId: user.id } }),
          ]);
        } catch {
          // ignore
        }
      }
    }

    // 4. Issue cryptographically signed session token
    const sessionToken = createSessionToken({
      id: user.id,
      handle: user.handle,
      email: user.email,
      isVerifiedHuman: true,
      avatarUrl: picture,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `obscura_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
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
    console.error('Google callback exception:', err);
    return NextResponse.redirect(new URL('/play?error=google_auth_exception', baseUrl));
  }
}
