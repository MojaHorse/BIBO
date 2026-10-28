import { getDurableRoom, sanitizeRoomState, broadcastToRoom } from '@/lib/room-manager';

export const maxDuration = 60;

export async function GET(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get('playerId');
  const room = await getDurableRoom(roomId);

  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  // Determine connected player's role
  const playerRole =
    room.whitePlayer?.id === playerId
      ? 'w'
      : room.blackPlayer?.id === playerId
      ? 'b'
      : null;

  if (playerRole) {
    if (playerRole === 'w' && room.whitePlayer) room.whitePlayer.connected = true;
    if (playerRole === 'b' && room.blackPlayer) room.blackPlayer.connected = true;
    broadcastToRoom(room, 'player:reconnected', { role: playerRole });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial state
      const initialPayload = `event: init\ndata: ${JSON.stringify(sanitizeRoomState(room))}\n\n`;
      controller.enqueue(encoder.encode(initialPayload));

      // Listener for live room broadcasts
      const listener = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      };

      room.listeners.add(listener);

      // Heartbeat ping every 15s
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        room.listeners.delete(listener);

        if (playerRole && room.gameActive && !room.gameOver) {
          if (playerRole === 'w' && room.whitePlayer) room.whitePlayer.connected = false;
          if (playerRole === 'b' && room.blackPlayer) room.blackPlayer.connected = false;
          broadcastToRoom(room, 'player:disconnected', {
            role: playerRole,
            handle: playerRole === 'w' ? room.whitePlayer?.handle : room.blackPlayer?.handle,
            at: Date.now(),
          });
        }

        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
