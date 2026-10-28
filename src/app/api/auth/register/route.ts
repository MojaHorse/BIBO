import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`register_${ip}`, 5, 60);

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

    // Check existing in database
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

    let supabaseUserId: string | null = null;

    try {
      const supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            handle: cleanHandle,
            displayName: cleanHandle,
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          return NextResponse.json(
            { error: 'An account with this email already exists in Supabase Auth.' },
            { status: 409 }
          );
        }
        console.warn('Supabase Auth signUp notice:', authError.message);
      } else if (authData?.user?.id) {
        supabaseUserId = authData.user.id;
      }
    } catch (supabaseErr) {
      if (typeof supabaseErr === 'object' && supabaseErr !== null && 'digest' in supabaseErr) throw supabaseErr;
      console.warn('Supabase Auth client notice:', supabaseErr);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = supabaseUserId || crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
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

    // Re-assign any matches played during guest session
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

    return NextResponse.json({ user, supabaseAuth: Boolean(supabaseUserId) }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create tactician account.' },
      { status: 500 }
    );
  }
}
