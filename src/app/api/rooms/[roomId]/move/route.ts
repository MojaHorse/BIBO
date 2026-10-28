import { NextResponse } from 'next/server';
import { activeRooms, broadcastToRoom, sanitizeRoomState, triggerBotMoveIfNeeded, finalizeRoomMatch } from '@/lib/room-manager';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const room = activeRooms.get(roomId);

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Rate limit moves per room (max 10 moves per 5s window)
  const rateCheck = checkRateLimit(`room_move_${roomId}`, 10, 5);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Move submission rate exceeded. Slow down.' },
      { status: 429 }
    );
  }

  if (room.gameOver) {
    return NextResponse.json({ error: 'Match is already concluded' }, { status: 400 });
  }

  const reqBody = await req.json();
  const { playerId, playerToken } = reqBody;

  const turn = room.engine.getTurn();
  const playerExpected = turn === 'w' ? room.whitePlayer : room.blackPlayer;
  const expectedToken = turn === 'w' ? room.whitePlayerToken : room.blackPlayerToken;

  // Authorization token verification
  const tokenFromHeader = req.headers.get('x-player-token');
  const tokenToVerify = playerToken || tokenFromHeader;

  if (expectedToken && tokenToVerify !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid player authorization token for current turn' },
      { status: 403 }
    );
  }

  // Validate player identity
  if (playerExpected && playerId && playerExpected.id !== playerId) {
    return NextResponse.json(
      { error: `Not your turn. Expected ${playerExpected.handle}` },
      { status: 403 }
    );
  }

  // Build move input object based on game type
  const moveInput = reqBody.move || {
    from: reqBody.from,
    to: reqBody.to,
    promotion: reqBody.promotion || 'q',
    type: reqBody.type,
    shot: reqBody.shot,
  };

  // Attempt move on server engine
  try {
    const moveRes = room.engine.makeMove(moveInput);

    if (!moveRes.success) {
      return NextResponse.json({ error: 'Illegal move' }, { status: 400 });
    }

    room.lastMove = moveInput;
    room.gameActive = true;
    room.lastMoveTimestamp = Date.now();

    const currentHist = (room.engine.getState() as any)?.history;
    if (Array.isArray(currentHist)) {
      room.history = [...currentHist];
    }

    // Check game status
    const winner = room.engine.checkWinner();
    if (winner) {
      finalizeRoomMatch(room, { winner: winner.winner, reason: winner.headline });
    }

    const state = sanitizeRoomState(room);

    // Broadcast to opponent & spectators with originPlayerId and commandId for echo defense
    broadcastToRoom(room, 'move:made', {
      move: moveRes,
      lastMove: moveInput,
      state,
      originPlayerId: playerId || null,
      commandId: reqBody.commandId || null,
    });

    if (!room.gameOver) {
      // Trigger bot move if opponent is bot
      triggerBotMoveIfNeeded(room);
    }

    return NextResponse.json({ success: true, state, commandId: reqBody.commandId || null });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Move execution failed' }, { status: 400 });
  }
}
