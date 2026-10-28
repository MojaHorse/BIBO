import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRankFromXp } from '@/lib/progression';

interface CacheEntry {
  data: any[];
  timestamp: number;
}

const rankingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') || 'blitz').toLowerCase();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const cacheKey = `${category}_${limit}`;
  const cached = rankingCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      { leaderboard: cached.data },
      {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }

  try {
    let orderBy: Record<string, 'desc'> = { blitzRating: 'desc' };
    if (category === 'xp') orderBy = { xp: 'desc' };
    else if (category === 'rapid') orderBy = { rapidRating: 'desc' };
    else if (category === 'bullet') orderBy = { bulletRating: 'desc' };
    else if (category === 'checkers') orderBy = { checkersRating: 'desc' };
    else if (category === 'morabaraba') orderBy = { morabarabaRating: 'desc' };

    const users = await prisma.user.findMany({
      where: {
        NOT: [
          { id: { startsWith: 'bot_' } },
          { id: { startsWith: 'guest_' } },
          { id: { startsWith: 'test_' } },
          { handle: { contains: '_guest' } },
          { handle: { contains: '_test_' } },
        ],
      },
      take: limit,
      orderBy,
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatar: true,
        blitzRating: true,
        rapidRating: true,
        bulletRating: true,
        checkersRating: true,
        morabarabaRating: true,
        xp: true,
        createdAt: true,
        _count: {
          select: {
            whiteMatches: true,
            blackMatches: true,
          },
        },
      },
    });

    const leaderboard = users.map((u, index) => {
      const rankInfo = getRankFromXp(u.xp || 0);
      const totalMatches = (u._count?.whiteMatches || 0) + (u._count?.blackMatches || 0);
      const rating =
        category === 'checkers'
          ? u.checkersRating ?? 1200
          : category === 'morabaraba'
          ? u.morabarabaRating ?? 1200
          : category === 'rapid'
          ? u.rapidRating
          : category === 'bullet'
          ? u.bulletRating
          : u.blitzRating || 1200;

      return {
        rankNumber: index + 1,
        id: u.id,
        handle: u.displayName || u.handle,
        rating,
        blitzRating: u.blitzRating || 1200,
        rapidRating: u.rapidRating || 1200,
        bulletRating: u.bulletRating || 1200,
        checkersRating: u.checkersRating ?? 1200,
        morabarabaRating: u.morabarabaRating ?? 1200,
        xp: u.xp || 0,
        tier: rankInfo.tier,
        totalMatches,
        winRate: '50%',
      };
    });

    rankingCache.set(cacheKey, {
      data: leaderboard,
      timestamp: now,
    });

    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          'X-Cache': 'SUPABASE-POSTGRES',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.warn('Rankings database query notice:', error);

    if (cached) {
      return NextResponse.json(
        { leaderboard: cached.data },
        {
          headers: {
            'X-Cache': 'STALE-FALLBACK',
            'X-Resilience-Notice': 'Served from stale cache due to database timeout',
          },
        }
      );
    }

    return NextResponse.json(
      { leaderboard: [] },
      {
        headers: {
          'X-Cache': 'EMPTY-FALLBACK',
          'X-Resilience-Notice': 'Zero ranked tacticians or database unreachable',
        },
      }
    );
  }
}
