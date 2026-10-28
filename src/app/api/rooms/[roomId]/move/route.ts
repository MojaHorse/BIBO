import { NextResponse } from 'next/server';
import { submitDurableMove } from '@/lib/room-manager';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;

  // Rate limit moves per room (max 12 moves per 5s window)
  const rateCheck = checkRateLimit(`room_move_${roomId}`, 12, 5);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Move submission rate exceeded. Slow down.' },
      { status: 429 }
    );
  }

  try {
    const reqBody = await req.json();
    const { playerId, playerToken, commandId, expectedSequence } = reqBody;

    const moveInput = reqBody.move || {
      from: reqBody.from,
      to: reqBody.to,
      promotion: reqBody.promotion || 'q',
      type: reqBody.type,
      shot: reqBody.shot,
    };

    const tokenFromHeader = req.headers.get('x-player-token');
    const tokenToVerify = playerToken || tokenFromHeader;

    const result = await submitDurableMove({
      roomId,
      playerId,
      playerToken: tokenToVerify,
      moveInput,
      commandId,
      expectedSequence,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Move failed' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      state: result.state,
      commandId: commandId || null,
      idempotent: Boolean(result.idempotent),
    });
  } catch (err: unknown) {
    console.error('Move route error:', err);
    return NextResponse.json({ error: 'Move execution failed' }, { status: 500 });
  }
}
