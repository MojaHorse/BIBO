import { NextResponse } from 'next/server';
import { getDurableRoom, offerRematch, acceptRematch, sanitizeRoomState, authenticateRoomPlayer } from '@/lib/room-manager';

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = await getDurableRoom(roomId);
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
      const ok = await offerRematch(room, role);
      return NextResponse.json({ success: ok, pendingRematchOffer: room.pendingRematchOffer });
    }

    if (action === 'accept') {
      const ok = await acceptRematch(room, role);
      return NextResponse.json({ success: ok, state: sanitizeRoomState(room) });
    }

    if (action === 'decline') {
      room.pendingRematchOffer = null;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid rematch action' }, { status: 400 });
  } catch (err) {
    console.error('Rematch handler error:', err);
    return NextResponse.json({ error: 'Failed to process rematch request' }, { status: 500 });
  }
}
