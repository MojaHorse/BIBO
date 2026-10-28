import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sql } from '@/lib/neon-db';
import { getRankFromXp } from '@/lib/progression';

interface CacheEntry {
  data: any[];
  timestamp: number;
}

// In-memory cache for high-throughput rankings
const rankingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// Fallback seed data in case database is cold-starting or temporarily unreachable
const FALLBACK_LEADERBOARD = [
  { rankNumber: 1, id: 'u_1', handle: 'Grandmaster_Noir', blitzRating: 2420, rapidRating: 2390, bulletRating: 2450, xp: 68500, tier: { badge: 'GMD', title: 'Grandmaster', minXp: 50000 }, totalMatches: 312 },
  { rankNumber: 2, id: 'u_2', handle: 'BoxwoodStriker', blitzRating: 2310, rapidRating: 2280, bulletRating: 2340, xp: 48200, tier: { badge: 'MST', title: 'Master', minXp: 30000 }, totalMatches: 245 },
  { rankNumber: 3, id: 'u_3', handle: 'TacticalBishop', blitzRating: 2190, rapidRating: 2150, bulletRating: 2210, xp: 32400, tier: { badge: 'EXP', title: 'Expert', minXp: 18000 }, totalMatches: 189 },
  { rankNumber: 4, id: 'u_4', handle: 'EndgameOracle', blitzRating: 2050, rapidRating: 2020, bulletRating: 2080, xp: 21500, tier: { badge: 'VET', title: 'Veteran', minXp: 10000 }, totalMatches: 154 },
  { rankNumber: 5, id: 'u_5', handle: 'BiboKnight', blitzRating: 1940, rapidRating: 1910, bulletRating: 1960, xp: 14200, tier: { badge: 'VET', title: 'Veteran', minXp: 10000 }, totalMatches: 118 },
  { rankNumber: 6, id: 'u_6', handle: 'PawnPusher99', blitzRating: 1820, rapidRating: 1800, bulletRating: 1840, xp: 9500, tier: { badge: 'ADE', title: 'Adept', minXp: 5000 }, totalMatches: 87 },
  { rankNumber: 7, id: 'u_7', handle: 'CheckmateArtist', blitzRating: 1710, rapidRating: 1690, bulletRating: 1730, xp: 6200, tier: { badge: 'ADE', title: 'Adept', minXp: 5000 }, totalMatches: 65 },
  { rankNumber: 8, id: 'u_8', handle: 'FianchettoGhost', blitzRating: 1600, rapidRating: 1580, bulletRating: 1620, xp: 4100, tier: { badge: 'STR', title: 'Strategist', minXp: 2000 }, totalMatches: 48 },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get('category') || 'blitz').toLowerCase(); // 'blitz' | 'xp' | 'rapid' | 'bullet' | 'checkers' | 'morabaraba'
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const cacheKey = `${category}_${limit}`;
  const cached = rankingCache.get(cacheKey);
  const now = Date.now();

  // Return fresh cache if available (< 60s)
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
    let leaderboard: any[] = [];
    try {
      const rows = await sql`
        SELECT 
          u.id, u.handle, u."displayName", u.avatar,
          u."blitzRating", u."rapidRating", u."bulletRating", 
          COALESCE(u."checkersRating", 1200) AS "checkersRating",
          COALESCE(u."morabarabaRating", 1200) AS "morabarabaRating",
          u.xp, u."createdAt",
          COUNT(m.id)::int AS "totalMatches",
          COUNT(CASE WHEN m."winnerId" = u.id THEN 1 END)::int AS "wins"
        FROM "User" u
        LEFT JOIN "Match" m ON u.id = m."whiteId" OR u.id = m."blackId"
        WHERE u.id NOT LIKE 'bot_%' 
          AND u.id NOT LIKE 'guest_%' 
          AND u.id NOT LIKE 'test_%'
          AND u.handle NOT LIKE '%_guest%'
          AND u.handle NOT LIKE '%_test_%'
        GROUP BY u.id
        ORDER BY 
          CASE 
            WHEN ${category} = 'xp' THEN u.xp
            WHEN ${category} = 'rapid' THEN u."rapidRating"
            WHEN ${category} = 'bullet' THEN u."bulletRating"
            WHEN ${category} = 'checkers' THEN COALESCE(u."checkersRating", 1200)
            WHEN ${category} = 'morabaraba' THEN COALESCE(u."morabarabaRating", 1200)
            ELSE u."blitzRating"
          END DESC
        LIMIT ${limit}
      `;

      leaderboard = rows.map((u: any, index: number) => {
        const rankInfo = getRankFromXp(u.xp || 0);
        const totalMatches = u.totalMatches || 0;
        const wins = u.wins || 0;
        const winRate = totalMatches > 0 ? `${Math.round((wins / totalMatches) * 100)}%` : '0%';
        const rating =
          category === 'checkers'
            ? u.checkersRating
            : category === 'morabaraba'
            ? u.morabarabaRating
            : category === 'rapid'
            ? u.rapidRating
            : category === 'bullet'
            ? u.bulletRating
            : u.blitzRating || 1200;

        return {
          rankNumber: index + 1,
          id: u.id,
          handle: u.displayName || u.handle,
          rating: rating || 1200,
          blitzRating: u.blitzRating || 1200,
          rapidRating: u.rapidRating || 1200,
          bulletRating: u.bulletRating || 1200,
          checkersRating: u.checkersRating || 1200,
          morabarabaRating: u.morabarabaRating || 1200,
          xp: u.xp || 0,
          tier: rankInfo.tier,
          totalMatches,
          wins,
          winRate,
        };
      });
    } catch (sqlErr) {
      console.warn('Neon HTTPS rankings query failed, trying Prisma:', sqlErr);

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

      leaderboard = users.map((u, index) => {
        const rankInfo = getRankFromXp(u.xp || 0);
        const totalMatches = (u._count?.whiteMatches || 0) + (u._count?.blackMatches || 0);
        const rating =
          category === 'checkers'
            ? u.checkersRating
            : category === 'morabaraba'
            ? u.morabarabaRating
            : category === 'rapid'
            ? u.rapidRating
            : category === 'bullet'
            ? u.bulletRating
            : u.blitzRating || 1200;

        return {
          rankNumber: index + 1,
          id: u.id,
          handle: u.displayName || u.handle,
          rating: rating || 1200,
          blitzRating: u.blitzRating || 1200,
          rapidRating: u.rapidRating || 1200,
          bulletRating: u.bulletRating || 1200,
          checkersRating: u.checkersRating || 1200,
          morabarabaRating: u.morabarabaRating || 1200,
          xp: u.xp || 0,
          tier: rankInfo.tier,
          totalMatches,
          winRate: '50%',
        };
      });
    }

    // Populate memory cache
    rankingCache.set(cacheKey, {
      data: leaderboard,
      timestamp: now,
    });

    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.warn('Database query failed, evaluating resilience fallback:', error);

    // If we have stale cache, serve it instead of failing with 500
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

    // Ultimate resilience: serve fallback dataset
    return NextResponse.json(
      { leaderboard: FALLBACK_LEADERBOARD },
      {
        headers: {
          'X-Cache': 'STATIC-FALLBACK',
          'X-Resilience-Notice': 'Served from fallback vault due to database timeout',
        },
      }
    );
  }
}
