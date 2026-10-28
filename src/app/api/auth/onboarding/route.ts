import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth-token';

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

    // Check if user is already authenticated via Supabase session or token
    let targetUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser?.id) {
        targetUserId = sbUser.id;
      }
    } catch (authErr) {
      if (typeof authErr === 'object' && authErr !== null && 'digest' in authErr) throw authErr;
      // Ignore
    }

    if (!targetUserId) {
      const currentSession = getSessionFromRequest(req);
      targetUserId = currentSession?.userId || null;
    }

    // Check handle collision
    const handleConflict = await prisma.user.findFirst({
      where: {
        handle: { equals: cleanHandle, mode: 'insensitive' },
        ...(targetUserId ? { id: { not: targetUserId } } : {}),
      },
      select: { id: true },
    });

    if (handleConflict) {
      return NextResponse.json({ error: 'Handle is already claimed by another tactician.' }, { status: 409 });
    }

    let user: any = null;

    if (targetUserId) {
      // Existing user updating their tactician dossier
      const existingUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, onboarded: true },
      });

      if (existingUser?.onboarded) {
        // Safe profile update only (ratings cannot be manipulated once onboarded)
        user = await prisma.user.update({
          where: { id: targetUserId },
          data: {
            handle: cleanHandle,
            displayName: cleanDisplayName,
            avatar: cleanAvatar,
            playStyle: cleanStyle,
          },
        });
      } else {
        // First-time onboarding only: calibrate initial ratings
        user = await prisma.user.update({
          where: { id: targetUserId },
          data: {
            handle: cleanHandle,
            displayName: cleanDisplayName,
            avatar: cleanAvatar,
            playStyle: cleanStyle,
            blitzRating: ratingValue,
            rapidRating: ratingValue,
            bulletRating: ratingValue,
            checkersRating: ratingValue,
            morabarabaRating: ratingValue,
            onboarded: true,
            ...(cleanXp > 0 ? { xp: { increment: cleanXp } } : {}),
          },
        });
      }
    } else {
      // New account onboarding
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail || !password || password.length < 6) {
        return NextResponse.json(
          { error: 'Email and passcode (min 6 chars) are required for new tactician enlistment.' },
          { status: 400 }
        );
      }

      // Check email collision
      const emailConflict = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });

      if (emailConflict) {
        return NextResponse.json({ error: 'Email is already registered. Please sign in.' }, { status: 409 });
      }

      // Register with Supabase Auth
      let supabaseUserId: string | null = null;
      try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              handle: cleanHandle,
              displayName: cleanDisplayName,
            },
          },
        });

        if (!authError && authData?.user?.id) {
          supabaseUserId = authData.user.id;
        }
      } catch (authErr) {
        if (typeof authErr === 'object' && authErr !== null && 'digest' in authErr) throw authErr;
        console.warn('Supabase onboarding signup notice:', authErr);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const generatedId = supabaseUserId || crypto.randomUUID();

      user = await prisma.user.upsert({
        where: { email: cleanEmail },
        update: {
          handle: cleanHandle,
          displayName: cleanDisplayName,
          avatar: cleanAvatar,
          playStyle: cleanStyle,
          onboarded: true,
        },
        create: {
          id: generatedId,
          handle: cleanHandle,
          displayName: cleanDisplayName,
          avatar: cleanAvatar,
          playStyle: cleanStyle,
          email: cleanEmail,
          passwordHash,
          blitzRating: ratingValue,
          rapidRating: ratingValue,
          bulletRating: ratingValue,
          checkersRating: ratingValue,
          morabarabaRating: ratingValue,
          xp: cleanXp,
          onboarded: true,
        },
      });
    }

    // Migrate guest matches if provided
    if (guestId && typeof guestId === 'string' && guestId.startsWith('guest_') && user) {
      try {
        await prisma.$transaction([
          prisma.match.updateMany({ where: { whiteId: guestId }, data: { whiteId: user.id } }),
          prisma.match.updateMany({ where: { blackId: guestId }, data: { blackId: user.id } }),
          prisma.match.updateMany({ where: { winnerId: guestId }, data: { winnerId: user.id } }),
        ]);
      } catch (migrationErr) {
        console.warn('Guest match migration notice:', migrationErr);
      }
    }

    return NextResponse.json({
      success: true,
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
  } catch (error) {
    console.error('Onboarding processing error:', error);
    return NextResponse.json({ error: 'Tactician onboarding could not be completed.' }, { status: 500 });
  }
}
