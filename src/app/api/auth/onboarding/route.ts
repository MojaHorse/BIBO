import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sql } from '@/lib/neon-db';
import bcrypt from 'bcryptjs';
import { getSessionFromRequest, createSessionToken } from '@/lib/auth-token';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      handle,
      displayName,
      avatar,
      playStyle,
      initialRating,
      email,
      password,
      guestId,
      guestXp,
    } = body;

    const cleanHandle = handle?.trim();
    if (!cleanHandle || !HANDLE_REGEX.test(cleanHandle)) {
      return NextResponse.json(
        { error: 'Valid tactical handle (3-20 characters, alphanumeric & underscore) is required.' },
        { status: 400 }
      );
    }

    const cleanDisplayName = displayName?.trim() || cleanHandle;
    const cleanAvatar = avatar || 'knight';
    const cleanStyle = playStyle || 'Tactical';
    const ratingValue = Math.min(2400, Math.max(600, Number(initialRating) || 1200));
    const cleanXp = Math.max(0, Math.min(500_000, Number(guestXp) || 0));

    // Check if user is already authenticated via session cookie
    const currentSession = getSessionFromRequest(req);
    const targetUserId = currentSession?.userId;

    // Check handle collision via Neon HTTPS Serverless
    try {
      const conflicts = await sql`
        SELECT "id" FROM "User" 
        WHERE LOWER("handle") = LOWER(${cleanHandle})
        ${targetUserId ? sql`AND "id" != ${targetUserId}` : sql``}
        LIMIT 1
      `;
      if (conflicts.length > 0) {
        return NextResponse.json({ error: 'Handle is already claimed by another tactician.' }, { status: 409 });
      }
    } catch (checkErr) {
      console.warn('Handle check notice:', checkErr);
    }

    let user: any = null;
    let neonSetCookie: string | null = null;

    if (targetUserId) {
      // 1. Existing user updating their tactician dossier
      // SECURITY CHECK: If already onboarded, prevent arbitrary competitive rating alteration!
      const existingRows = await sql`SELECT "id", "onboarded" FROM "User" WHERE "id" = ${targetUserId} LIMIT 1`;
      const isAlreadyOnboarded = Boolean(existingRows[0]?.onboarded);

      if (isAlreadyOnboarded) {
        // Safe profile update only (ratings cannot be manipulated)
        await sql`
          UPDATE "User"
          SET "handle" = ${cleanHandle},
              "displayName" = ${cleanDisplayName},
              "avatar" = ${cleanAvatar},
              "playStyle" = ${cleanStyle}
          WHERE "id" = ${targetUserId}
        `;
      } else {
        // First-time onboarding only: set initial ratings
        await sql`
          UPDATE "User"
          SET "handle" = ${cleanHandle},
              "displayName" = ${cleanDisplayName},
              "avatar" = ${cleanAvatar},
              "playStyle" = ${cleanStyle},
              "blitzRating" = ${ratingValue},
              "rapidRating" = ${ratingValue},
              "bulletRating" = ${ratingValue},
              "checkersRating" = ${ratingValue},
              "morabarabaRating" = ${ratingValue},
              "onboarded" = true
              ${cleanXp > 0 ? sql`, "xp" = "xp" + ${cleanXp}` : sql``}
          WHERE "id" = ${targetUserId}
        `;
      }

      const rows = await sql`SELECT * FROM "User" WHERE "id" = ${targetUserId} LIMIT 1`;
      user = rows[0];
    } else {
      // 2. New account onboarding
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail || !password || password.length < 6) {
        return NextResponse.json(
          { error: 'Email and passcode (min 6 chars) are required for new tactician enlistment.' },
          { status: 400 }
        );
      }

      // Check email collision
      const emailConflicts = await sql`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${cleanEmail}) LIMIT 1`;
      if (emailConflicts.length > 0) {
        return NextResponse.json({ error: 'Email is already registered. Please sign in.' }, { status: 409 });
      }

      // Register with Neon Managed Better Auth (if configured)
      const neonAuthBase = process.env.NEON_AUTH_BASE_URL;
      let neonUserId: string | null = null;

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
              name: cleanDisplayName,
            }),
          });

          const neonData = await neonRes.json().catch(() => null);
          if (neonRes.ok && neonData?.user?.id) {
            neonUserId = neonData.user.id;
            neonSetCookie = neonRes.headers.get('set-cookie');
          }
        } catch (neonErr) {
          console.warn('Neon Better Auth onboarding signup notice:', neonErr);
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const generatedId = neonUserId || crypto.randomUUID();

      await sql`
        INSERT INTO "User" ("id", "handle", "displayName", "avatar", "playStyle", "email", "passwordHash", "blitzRating", "rapidRating", "bulletRating", "xp", "onboarded")
        VALUES (${generatedId}, ${cleanHandle}, ${cleanDisplayName}, ${cleanAvatar}, ${cleanStyle}, ${cleanEmail}, ${passwordHash}, ${ratingValue}, ${ratingValue}, ${ratingValue}, ${cleanXp}, true)
        ON CONFLICT ("email") DO UPDATE
        SET "handle" = EXCLUDED."handle", "displayName" = EXCLUDED."displayName", "avatar" = EXCLUDED."avatar", "playStyle" = EXCLUDED."playStyle", "onboarded" = true
      `;

      const rows = await sql`SELECT * FROM "User" WHERE "id" = ${generatedId} LIMIT 1`;
      user = rows[0];
    }

    // Migrate guest matches if provided
    if (guestId && typeof guestId === 'string' && guestId.startsWith('guest_') && user) {
      try {
        await sql`UPDATE "Match" SET "whiteId" = ${user.id} WHERE "whiteId" = ${guestId}`;
        await sql`UPDATE "Match" SET "blackId" = ${user.id} WHERE "blackId" = ${guestId}`;
        await sql`UPDATE "Match" SET "winnerId" = ${user.id} WHERE "winnerId" = ${guestId}`;
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

    const res = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName || user.handle,
        avatar: user.avatar || 'knight',
        playStyle: user.playStyle || 'Tactical',
        email: user.email,
        blitzRating: user.blitzRating,
        rapidRating: user.rapidRating,
        bulletRating: user.bulletRating,
        xp: user.xp,
        onboarded: user.onboarded,
      },
    });

    res.headers.set('Set-Cookie', cookieHeader);
    if (neonSetCookie) {
      res.headers.append('Set-Cookie', neonSetCookie);
    }

    return res;
  } catch (error) {
    console.error('Onboarding processing error:', error);
    return NextResponse.json({ error: 'Tactician onboarding could not be completed.' }, { status: 500 });
  }
}
