import { NextResponse } from 'next/server';
import { activeRooms, resignGame, authenticateRoomPlayer } from '@/lib/room-manager';

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = activeRooms.get(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  try {
    const { playerId, playerToken } = await req.json();

    const role = authenticateRoomPlayer(room, req, playerId, playerToken);

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized: Player not authorized for this action' }, { status: 403 });
    }

    const ok = resignGame(room, role);
    return NextResponse.json({ success: ok, gameOver: room.gameOver });
  } catch (err) {
    console.error('Resignation error:', err);
    return NextResponse.json({ error: 'Failed to process resignation' }, { status: 500 });
  }
}
