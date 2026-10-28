import { NextResponse } from 'next/server';
import { createRoom, sanitizeRoomState } from '@/lib/room-manager';
import { GameId } from '@/lib/games/types';
import { getSessionFromRequest } from '@/lib/auth-token';

export async function POST(req: Request) {
  try {
    const { timeControlMinutes = 5, player, gameId = 'chess', variant } = await req.json();

    const session = getSessionFromRequest(req);
    const effectiveUserId = session?.userId || player?.id;
    const effectiveHandle = session?.handle || player?.handle || 'Tactician';

    // Enforce authenticated account requirement (guest accounts rejected)
    if (!effectiveUserId || typeof effectiveUserId !== 'string' || effectiveUserId.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'Authenticated account required to create match rooms.' },
        { status: 401 }
      );
    }

    const creator = {
      id: effectiveUserId,
      handle: effectiveHandle,
      rating: Number(player?.rating) || 1200,
    };

    const validGameId: GameId =
      gameId === 'checkers' ? 'checkers' : gameId === 'morabaraba' ? 'morabaraba' : 'chess';

    const room = createRoom(Number(timeControlMinutes) || 5, creator, validGameId, variant);

    const baseUrl = req.headers.get('origin') || 'http://localhost:3000';
    const path = validGameId === 'checkers' ? '/play/checkers' : validGameId === 'morabaraba' ? '/play/morabaraba' : '/play/chess';
    const inviteUrl = `${baseUrl}${path}?room=${room.id}`;

    return NextResponse.json({
      roomId: room.id,
      gameId: room.gameId,
      playerToken: room.whitePlayerToken,
      inviteUrl,
      state: sanitizeRoomState(room),
    });
  } catch (err: unknown) {
    console.error('Room creation error:', err);
    return NextResponse.json({ error: 'Failed to create match room' }, { status: 500 });
  }
}
