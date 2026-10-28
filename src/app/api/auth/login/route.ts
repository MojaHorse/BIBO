import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`login_${ip}`, 10, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please retry in ${rateCheck.resetInSeconds} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetInSeconds),
          },
        }
      );
    }

    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and passcode are required.' },
        { status: 400 }
      );
    }

    const clean = identifier.trim().toLowerCase();
    let targetEmail = clean;

    // If identifier is handle, resolve email from database
    if (!clean.includes('@')) {
      const u = await prisma.user.findFirst({
        where: { handle: { equals: clean, mode: 'insensitive' } },
      });
      if (u) {
        targetEmail = u.email;
      }
    }

    let supabaseUser: { id: string; email?: string } | null = null;

    // 1. Authenticate with Supabase Auth
    try {
      const supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (!authError && authData?.user) {
        supabaseUser = authData.user;
      }
    } catch (supabaseErr) {
      if (typeof supabaseErr === 'object' && supabaseErr !== null && 'digest' in supabaseErr) throw supabaseErr;
      console.warn('Supabase Auth sign-in notice:', supabaseErr);
    }

    let user = null;

    if (supabaseUser) {
      // Synchronize with application User record
      user = await prisma.user.findFirst({
        where: { OR: [{ id: supabaseUser.id }, { email: supabaseUser.email }] },
      });

      if (!user && supabaseUser.email) {
        user = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email,
            handle: supabaseUser.email.split('@')[0],
            passwordHash: 'supabase_auth',
            bulletRating: 1200,
            blitzRating: 1200,
            rapidRating: 1200,
            xp: 0,
          },
        });
      }
    } else {
      // 2. Fallback check for local password verification
      user = await prisma.user.findFirst({
        where: {
          OR: [{ handle: clean }, { email: clean }],
        },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: 'Invalid tactician credentials.' },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid tactician credentials.' },
          { status: 401 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid tactician credentials.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      supabaseAuth: Boolean(supabaseUser),
      user: {
        id: user.id,
        handle: user.handle,
        email: user.email,
        isPro: user.isPro,
        bulletRating: user.bulletRating,
        blitzRating: user.blitzRating,
        rapidRating: user.rapidRating,
        checkersRating: user.checkersRating ?? 1200,
        morabarabaRating: user.morabarabaRating ?? 1200,
        xp: user.xp,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
