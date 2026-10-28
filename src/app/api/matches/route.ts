import { NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { prisma } from '@/lib/prisma';
import { calculateElo } from '@/lib/elo';
import { calculateMatchXp } from '@/lib/progression';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth-token';

interface MatchesCacheEntry {
  data: any;
  timestamp: number;
}

// In-memory cache for high-throughput match archive queries
const matchesCache = new Map<string, MatchesCacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`match_create_${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Match archive rate limit reached. Retry in ${rateCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Authenticate caller via Supabase session or bearer token
    let authenticatedUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) authenticatedUserId = user.id;
    } catch (sbErr) {
      if (typeof sbErr === 'object' && sbErr !== null && 'digest' in sbErr) throw sbErr;
      // Ignore
    }

    if (!authenticatedUserId) {
      const session = getSessionFromRequest(req);
      if (session?.userId) authenticatedUserId = session.userId;
    }

    const {
      gameId = 'chess',
      variant = 'standard',
      whiteId,
      blackId,
      timeControl,
      winnerId,
      resultType,
      pgn,
      finalFen,
      rated = true,
      roomId,
    } = await req.json();

    if (!whiteId || !blackId || !timeControl || !resultType || !finalFen) {
      return NextResponse.json(
        { error: 'Missing required match parameters.' },
        { status: 400 }
      );
    }

    // Authorization check: Caller must be one of the participants if authenticated
    if (authenticatedUserId && authenticatedUserId !== whiteId && authenticatedUserId !== blackId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only record matches that you participated in.' },
        { status: 403 }
      );
    }

    // Cryptographic & Rule-based PGN Replay Verification (only for Chess)
    if (gameId === 'chess' && pgn && pgn.trim().length > 0) {
      try {
        const verifier = new Chess();
        verifier.loadPgn(pgn);

        if (verifier.history().length < 2) {
          return NextResponse.json(
            { error: 'Match must contain at least 2 plies to be archived.' },
            { status: 400 }
          );
        }

        const [vBoard] = verifier.fen().split(' ');
        const [fBoard] = finalFen.split(' ');

        if (vBoard !== fBoard) {
          return NextResponse.json(
            { error: 'Match verification failed: PGN moves do not produce claimed final position.' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Corrupt or illegal PGN notation.' },
          { status: 400 }
        );
      }
    }

    // Is this an official PvP rated match? (Bots and guest sessions cannot mutate competitive ELO)
    const isBotOrGuest =
      whiteId.startsWith('bot_') ||
      blackId.startsWith('bot_') ||
      whiteId.startsWith('guest_') ||
      blackId.startsWith('guest_');

    const shouldAdjustElo = Boolean(rated) && !isBotOrGuest;

    const ensureUser = async (id: string) => {
      // 1. Look for existing registered user
      const existing = await prisma.user.findUnique({ where: { id } });
      if (existing) return existing;

      // 2. If it is a known system bot ID, ensure the bot record exists
      if (id.startsWith('bot_')) {
        const botHandle = `Bot (${id.replace('bot_', '')})`;
        try {
          return await prisma.user.upsert({
            where: { id },
            update: { updatedAt: new Date() },
            create: {
              id,
              handle: botHandle,
              email: `${id}@bot.bibo.internal`,
              passwordHash: 'system_bot_account',
              bulletRating: 1200,
              blitzRating: 1200,
              rapidRating: 1200,
              checkersRating: 1200,
              morabarabaRating: 1200,
              xp: 0,
            },
          });
        } catch {
          return await prisma.user.findUnique({ where: { id } });
        }
      }

      return null;
    };

    const [whiteUser, blackUser] = await Promise.all([
      ensureUser(whiteId),
      ensureUser(blackId),
    ]);

    if (!whiteUser || !blackUser) {
      return NextResponse.json(
        { error: 'One or more match participants could not be resolved.' },
        { status: 400 }
      );
    }

    let ratingDelta = 0;

    // Determine discipline and time control rating field
    const minutes = parseInt(timeControl) || 5;
    const ratingField: 'bulletRating' | 'blitzRating' | 'rapidRating' | 'checkersRating' | 'morabarabaRating' =
      gameId === 'checkers'
        ? 'checkersRating'
        : gameId === 'morabaraba'
        ? 'morabarabaRating'
        : minutes < 3
        ? 'bulletRating'
        : minutes < 10
        ? 'blitzRating'
        : 'rapidRating';

    const whiteRating = (whiteUser as any)[ratingField] ?? 1200;
    const blackRating = (blackUser as any)[ratingField] ?? 1200;
    const movesCount = pgn ? (pgn.match(/\d+\./g) || []).length : 15;

    const whiteResult = winnerId === whiteId ? 'win' : winnerId === blackId ? 'loss' : 'draw';
    const blackResult = winnerId === blackId ? 'win' : winnerId === whiteId ? 'loss' : 'draw';

    const whiteXp = calculateMatchXp({
      playerRating: whiteRating,
      opponentRating: blackRating,
      result: whiteResult,
      movesCount,
    });

    const blackXp = calculateMatchXp({
      playerRating: blackRating,
      opponentRating: whiteRating,
      result: blackResult,
      movesCount,
    });

    let newRatingA = whiteRating;
    let newRatingB = blackRating;

    const updates: any[] = [];

    if (shouldAdjustElo && whiteUser && blackUser) {
      const scoreWhite = winnerId === whiteId ? 1 : winnerId === blackId ? 0 : 0.5;
      const eloResult = calculateElo(whiteRating, blackRating, scoreWhite);
      ratingDelta = Math.abs(eloResult.deltaA);
      newRatingA = eloResult.newRatingA;
      newRatingB = eloResult.newRatingB;

      updates.push(
        prisma.user.update({
          where: { id: whiteId },
          data: {
            [ratingField]: newRatingA,
            xp: { increment: whiteXp.totalXp },
          },
        }),
        prisma.user.update({
          where: { id: blackId },
          data: {
            [ratingField]: newRatingB,
            xp: { increment: blackXp.totalXp },
          },
        })
      );
    } else {
      updates.push(
        prisma.user.update({
          where: { id: whiteId },
          data: { xp: { increment: whiteXp.totalXp } },
        }),
        prisma.user.update({
          where: { id: blackId },
          data: { xp: { increment: blackXp.totalXp } },
        })
      );
    }

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    updates.push(
      prisma.match.create({
        data: {
          id: matchId,
          gameId,
          variant,
          whiteId,
          blackId,
          timeControl,
          winnerId: winnerId || null,
          resultType,
          pgn: pgn || '',
          finalFen,
          rated: Boolean(rated),
          ratingDelta,
          roomId: roomId || null,
        },
      })
    );

    const txResults = await prisma.$transaction(updates);
    const match = txResults[txResults.length - 1];

    // Invalidate match archive cache
    matchesCache.clear();

    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    console.error('Match creation error:', error);
    return NextResponse.json(
      { error: 'Failed to record match telemetry.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const cacheKey = `matches_${userId || 'all'}`;

  const cached = matchesCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  }

  try {
    const matches = await prisma.match.findMany({
      where: userId
        ? {
            OR: [{ whiteId: userId }, { blackId: userId }],
          }
        : undefined,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        white: { select: { handle: true, xp: true, blitzRating: true } },
        black: { select: { handle: true, xp: true, blitzRating: true } },
      },
    });

    const formatted = matches.map((m: any) => ({
      id: m.id,
      gameId: m.gameId,
      variant: m.variant,
      whiteId: m.whiteId,
      blackId: m.blackId,
      timeControl: m.timeControl,
      winnerId: m.winnerId,
      resultType: m.resultType,
      pgn: m.pgn,
      finalFen: m.finalFen,
      rated: m.rated,
      ratingDelta: m.ratingDelta,
      createdAt: m.createdAt,
      white: {
        handle: m.white?.handle || (m.whiteId?.startsWith('bot_') ? `Bot (${m.whiteId.replace('bot_', '')})` : (m.whiteId || 'White')),
        xp: m.white?.xp || 0,
        blitzRating: m.white?.blitzRating || 1200,
      },
      black: {
        handle: m.black?.handle || (m.blackId?.startsWith('bot_') ? `Bot (${m.blackId.replace('bot_', '')})` : (m.blackId || 'Black')),
        xp: m.black?.xp || 0,
        blitzRating: m.black?.blitzRating || 1200,
      },
    }));

    const payload = { matches: formatted };
    matchesCache.set(cacheKey, { data: payload, timestamp: now });

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'SUPABASE-POSTGRES',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Match retrieval error:', error);

    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'STALE-FALLBACK',
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      });
    }

    return NextResponse.json({ matches: [] }, { status: 200 });
  }
}
