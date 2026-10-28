import { NextResponse } from 'next/server';
import { joinQueue, pollQueue, cancelQueue } from '@/lib/matchmaking-manager';
import { GameId } from '@/lib/games/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'join', player, gameId = 'chess', timeControlMinutes = 5, variant } = body;

    // Enforce authenticated account requirement (guest accounts rejected)
    if (!player?.id || typeof player.id !== 'string' || player.id.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'Authenticated account required to participate in matchmaking.' },
        { status: 401 }
      );
    }

    const playerId = player.id;
    const validGameId: GameId =
      gameId === 'checkers' ? 'checkers' : gameId === 'morabaraba' ? 'morabaraba' : 'chess';

    if (action === 'join') {
      const result = joinQueue({
        player: {
          id: playerId,
          handle: player?.handle || 'Tactician',
          rating: player?.rating || 1200,
          avatar: player?.avatar,
        },
        gameId: validGameId,
        timeControlMinutes: Number(timeControlMinutes) || 5,
        variant,
      });

      return NextResponse.json({ ...result, playerId });
    }

    if (action === 'poll') {
      const result = pollQueue(playerId, true);
      return NextResponse.json(result);
    }

    if (action === 'cancel') {
      cancelQueue(playerId);
      return NextResponse.json({ success: true, status: 'cancelled' });
    }

    return NextResponse.json({ error: 'Invalid matchmaking action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Matchmaking route error:', err);
    return NextResponse.json({ error: 'Internal matchmaking error' }, { status: 500 });
  }
}
