import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const sbAuthCookie = allCookies.find((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  const sessionCookie = request.cookies.get('bibo_session')?.value || request.cookies.get('obscura_session')?.value;

  let isValid = false;

  if (sbAuthCookie && sbAuthCookie.value.length > 10) {
    isValid = true;
  } else if (sessionCookie) {
    try {
      const parts = sessionCookie.split('.');
      if (parts.length >= 2) {
        const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        const payloadStr = Buffer.from(base64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload.userId && !payload.userId.startsWith('guest_')) {
          isValid = true;
        }
      }
    } catch {
      isValid = false;
    }
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
