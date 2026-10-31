import { NextResponse } from 'next/server';
import { getDurableRoom, offerDraw, respondDraw, authenticateRoomPlayer } from '@/lib/room-manager';
import { createClient } from '@/lib/supabase/server';

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

    let role = authenticateRoomPlayer(room, req, playerId, playerToken);

    if (!role) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          if (room.whitePlayer?.id === user.id) role = 'w';
          else if (room.blackPlayer?.id === user.id) role = 'b';
        }
      } catch {
        // ignore
      }
    }

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized: Player not authorized for this action' }, { status: 403 });
    }

    if (action === 'offer') {
      const ok = await offerDraw(room, role);
      return NextResponse.json({ success: ok, pendingDrawOffer: room.pendingDrawOffer });
    }

    if (action === 'accept') {
      const ok = await respondDraw(room, role, true);
      return NextResponse.json({ success: ok, gameOver: room.gameOver });
    }

    if (action === 'decline') {
      const ok = await respondDraw(room, role, false);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: 'Invalid draw action' }, { status: 400 });
  } catch (err) {
    console.error('Draw handler error:', err);
    return NextResponse.json({ error: 'Failed to process draw request' }, { status: 500 });
  }
}
