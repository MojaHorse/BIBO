import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDurableRoom, sanitizeRoomState, broadcastRealtimeEvent, startRoomClock } from '@/lib/room-manager';
import { getSessionFromRequest } from '@/lib/auth-token';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = await getDurableRoom(roomId);

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ state: sanitizeRoomState(room) });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = await getDurableRoom(roomId);

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { player } = await req.json();

  let effectiveUserId: string | null = null;
  let effectiveHandle = 'Opponent';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      effectiveUserId = user.id;
      effectiveHandle = user.user_metadata?.handle || user.email?.split('@')[0] || 'Opponent';
    }
  } catch (sbErr) {
    if (typeof sbErr === 'object' && sbErr !== null && 'digest' in sbErr) throw sbErr;
    // Ignore
  }

  if (!effectiveUserId) {
    const session = getSessionFromRequest(req);
    effectiveUserId = session?.userId || player?.id;
    effectiveHandle = session?.handle || player?.handle || 'Opponent';
  }

  // Enforce authenticated account requirement (guest accounts rejected)
  if (!effectiveUserId || typeof effectiveUserId !== 'string' || effectiveUserId.startsWith('guest_')) {
    return NextResponse.json(
      { error: 'Authenticated account required to join match rooms.' },
      { status: 401 }
    );
  }

  const playerId = effectiveUserId;

  let role: 'w' | 'b' | 'spectator' = 'spectator';
  let playerToken: string | null = null;

  // 1. Check if player is already White
  if (room.whitePlayer?.id === playerId) {
    role = 'w';
    if (room.whitePlayer) room.whitePlayer.connected = true;
    playerToken = room.whitePlayerToken || null;
  }
  // 2. Check if player is already Black
  else if (room.blackPlayer?.id === playerId) {
    role = 'b';
    if (room.blackPlayer) room.blackPlayer.connected = true;
    playerToken = room.blackPlayerToken || null;
  }
  // 3. If Black slot is open, claim it
  else if (!room.blackPlayer) {
    role = 'b';
    const blackToken = crypto.randomUUID();
    playerToken = blackToken;
    room.blackPlayerToken = blackToken;

    room.blackPlayer = {
      id: playerId,
      handle: effectiveHandle,
      rating: Number(player?.rating) || 1200,
      color: 'b',
      connected: true,
    };
    room.gameActive = true;

    try {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          blackPlayerId: playerId,
          blackPlayerHandle: effectiveHandle,
          blackPlayerRating: Number(player?.rating) || 1200,
          blackPlayerToken: blackToken,
          status: 'active',
        },
      });
    } catch (dbErr) {
      console.warn('Database update on room join notice:', dbErr);
    }

    startRoomClock(room);

    await broadcastRealtimeEvent(roomId, 'player:joined', {
      blackPlayer: room.blackPlayer,
      state: sanitizeRoomState(room),
    });
  }

  return NextResponse.json({
    role,
    playerToken,
    state: sanitizeRoomState(room),
  });
}
