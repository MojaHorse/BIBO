import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getAppBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (url.origin && url.origin !== 'null') {
    return url.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://bibogames.vercel.app';
}

export async function GET(req: Request) {
  const baseUrl = getAppBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/callback`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
      },
    });

    if (!error && data?.url) {
      return NextResponse.redirect(data.url);
    }

    if (error) {
      console.error('Supabase Google OAuth error:', error.message);
    }
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'digest' in err) throw err;
    console.error('Supabase Google OAuth initiation exception:', err);
  }

  return NextResponse.redirect(new URL('/login?error=google_oauth_failed', baseUrl));
}
