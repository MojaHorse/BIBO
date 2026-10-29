import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

function getAppBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const detectedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  if (detectedOrigin && !detectedOrigin.includes('localhost')) {
    return detectedOrigin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || detectedOrigin;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/home';
  const baseUrl = getAppBaseUrl(req);

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.email) {
          const userEmail = user.email.toLowerCase();
          const baseHandle = (
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            userEmail.split('@')[0]
          )
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .slice(0, 14);

          const uniqueHandle = baseHandle.length >= 3 ? baseHandle : `Tactician_${user.id.slice(0, 5)}`;

          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              email: userEmail,
              updatedAt: new Date(),
            },
            create: {
              id: user.id,
              email: userEmail,
              handle: uniqueHandle,
              displayName: user.user_metadata?.full_name || user.user_metadata?.name || uniqueHandle,
              avatar: 'knight',
              passwordHash: 'supabase_oauth',
              bulletRating: 1200,
              blitzRating: 1200,
              rapidRating: 1200,
              xp: 200,
            },
          });
        }

        return NextResponse.redirect(new URL(next, baseUrl));
      } else {
        console.error('Supabase exchangeCodeForSession error:', error.message);
      }
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'digest' in err) throw err;
      console.error('Supabase OAuth callback exception:', err);
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth_callback_failed', baseUrl));
}
