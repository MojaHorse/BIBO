import { NextResponse } from 'next/server';
import { activeRooms, offerDraw, respondDraw, authenticateRoomPlayer } from '@/lib/room-manager';

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
    const { action = 'offer', playerId, playerToken } = await req.json();

    const role = authenticateRoomPlayer(room, req, playerId, playerToken);

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized: Player not authorized for this action' }, { status: 403 });
    }

    if (action === 'offer') {
      const ok = offerDraw(room, role);
      return NextResponse.json({ success: ok, pendingDrawOffer: room.pendingDrawOffer });
    }

    if (action === 'accept') {
      const ok = respondDraw(room, role, true);
      return NextResponse.json({ success: ok, gameOver: room.gameOver });
    }

    if (action === 'decline') {
      const ok = respondDraw(room, role, false);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: 'Invalid draw action' }, { status: 400 });
  } catch (err) {
    console.error('Draw handler error:', err);
    return NextResponse.json({ error: 'Failed to process draw request' }, { status: 500 });
  }
}
