import { NextResponse } from 'next/server';
import { createDurableRoom, sanitizeRoomState } from '@/lib/room-manager';
import { GameId } from '@/lib/games/types';
import { getSessionFromRequest } from '@/lib/auth-token';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { timeControlMinutes = 5, player, gameId = 'chess', variant } = await req.json();

    let effectiveUserId: string | null = null;
    let effectiveHandle = 'Tactician';

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        effectiveUserId = user.id;
        effectiveHandle = user.user_metadata?.handle || user.email?.split('@')[0] || 'Tactician';
      }
    } catch (sbErr) {
      if (typeof sbErr === 'object' && sbErr !== null && 'digest' in sbErr) throw sbErr;
      // Ignore
    }

    if (!effectiveUserId) {
      const session = getSessionFromRequest(req);
      effectiveUserId = session?.userId || player?.id;
      effectiveHandle = session?.handle || player?.handle || 'Tactician';
    }

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

    const room = await createDurableRoom(Number(timeControlMinutes) || 5, creator, validGameId, variant);

    const baseUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
