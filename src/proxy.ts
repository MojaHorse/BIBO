import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth-token';

export function proxy(request: NextRequest) {
  const obscuraToken = request.cookies.get('obscura_session')?.value;
  const neonToken = request.cookies.get('better-auth.session_token')?.value;

  let isValid = false;

  if (obscuraToken) {
    const session = verifySessionToken(obscuraToken);
    if (session && session.userId && !session.userId.startsWith('guest_')) {
      isValid = true;
    }
  } else if (neonToken && neonToken.length > 10) {
    isValid = true;
  }

  if (!isValid) {
    const redirectUrl = new URL('/login', request.url);
    const target = request.nextUrl.pathname + request.nextUrl.search;
    redirectUrl.searchParams.set('redirect', target);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home',
    '/home/:path*',
    '/play',
    '/play/:path*',
    '/puzzles',
    '/puzzles/:path*',
    '/compete',
    '/compete/:path*',
    '/rankings',
    '/rankings/:path*',
    '/friends',
    '/friends/:path*',
    '/archive',
    '/archive/:path*',
    '/settings',
    '/settings/:path*',
    '/profile',
    '/profile/:path*',
    '/checkers',
    '/checkers/:path*',
    '/morabaraba',
    '/morabaraba/:path*',
    '/tournaments',
    '/tournaments/:path*',
  ],
};
