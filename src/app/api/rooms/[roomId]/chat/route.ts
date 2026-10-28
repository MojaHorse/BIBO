import { NextResponse } from 'next/server';
import { getDurableRoom, addChatMessage } from '@/lib/room-manager';
import { PlayerColor } from '@/lib/games/types';

export async function GET(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = await getDurableRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json({ messages: room.chatMessages });
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

  try {
    const { text, emoji, playerId, playerToken } = await req.json();

    let role: PlayerColor = 'w';
    let handle = 'Player';

    if (room.whitePlayer?.id === playerId || room.whitePlayerToken === playerToken) {
      role = 'w';
      handle = room.whitePlayer?.handle || 'White';
    } else if (room.blackPlayer?.id === playerId || room.blackPlayerToken === playerToken) {
      role = 'b';
      handle = room.blackPlayer?.handle || 'Black';
    } else {
      // Spectator
      role = 'w';
      handle = 'Spectator';
    }

    const msg = addChatMessage(room, {
      senderId: playerId || 'anon',
      senderHandle: handle,
      role,
      text: text ? String(text).trim().slice(0, 200) : undefined,
      emoji: emoji ? String(emoji).trim().slice(0, 10) : undefined,
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 400 });
  }
}
