import { Chess } from 'chess.js';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { GameId, IGameEngine, PlayerColor } from './games/types';
import { createGameEngine } from './games/factory';
import { prisma } from './prisma';
import { calculateElo } from './elo';
import { calculateMatchXp } from './progression';
import { getSessionFromRequest } from './auth-token';
import { createAdminClient } from './supabase/admin';

export interface RoomPlayer {
  id: string;
  handle: string;
  rating: number;
  color: PlayerColor;
  connected: boolean;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderHandle: string;
  role: PlayerColor;
  text?: string;
  emoji?: string;
  timestamp: number;
}

export interface RoomState {
  id: string;
  gameId: GameId;
  variant: string;
  engine: IGameEngine<any>;
  chess?: Chess;
  timeControlMinutes: number;
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
  lastMoveTimestamp: number;
  gameActive: boolean;
  history: string[];
  lastMove: any;
  moveSequence?: number;
  whitePlayer: RoomPlayer | null;
  blackPlayer: RoomPlayer | null;
  whitePlayerToken?: string;
  blackPlayerToken?: string;
  gameOver: { winner: PlayerColor | 'draw' | null; reason: string } | null;
  chatMessages: ChatMessage[];
  pendingDrawOffer: PlayerColor | null;
  pendingRematchOffer: PlayerColor | null;
  listeners: Set<(event: string, data: unknown) => void>;
  clockInterval?: NodeJS.Timeout;
  isRecorded?: boolean;
}

const globalForRooms = global as unknown as { rooms: Map<string, RoomState> };

export const activeRooms = globalForRooms.rooms || new Map<string, RoomState>();
if (process.env.NODE_ENV !== 'production') globalForRooms.rooms = activeRooms;

// Publish event to Supabase Realtime channel and local listeners
export async function broadcastRealtimeEvent(roomId: string, event: string, payload: unknown) {
  // 1. Supabase Realtime Channel broadcast via direct REST endpoint
  try {
    const admin = createAdminClient();
    const channel = admin.channel(`room:${roomId}`);
    if (typeof (channel as any).httpSend === 'function') {
      await (channel as any).httpSend(event, payload);
    } else {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  } catch (err) {
    // In local dev/test or offline mode, Realtime broadcast failure does not interrupt logic
    console.warn('[broadcastRealtimeEvent] Supabase broadcast notice:', err);
  }

  // 2. In-memory listeners (for active SSE streams or local tests)
  const room = activeRooms.get(roomId);
  if (room) {
    for (const listener of room.listeners) {
      try {
        listener(event, payload);
      } catch {
        // ignore closed stream
      }
    }
  }
}

export function broadcastToRoom(room: RoomState, event: string, data: unknown) {
  for (const listener of room.listeners) {
    try {
      listener(event, data);
    } catch {
      // ignore closed stream
    }
  }
  // Also forward to Realtime
  broadcastRealtimeEvent(room.id, event, data);
}

// Compute deterministic authoritative time from database room record
export function calculateAuthoritativeClocks(roomRecord: {
  status: string;
  currentTurn: string;
  lastMoveTimestamp: bigint | number;
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
}) {
  const now = Date.now();
  if (roomRecord.status !== 'active') {
    return {
      whiteTime: roomRecord.whiteTimeRemaining,
      blackTime: roomRecord.blackTimeRemaining,
      timedOutPlayer: null as PlayerColor | null,
    };
  }

  const elapsed = Math.max(0, Math.floor((now - Number(roomRecord.lastMoveTimestamp)) / 1000));
  let whiteTime = roomRecord.whiteTimeRemaining;
  let blackTime = roomRecord.blackTimeRemaining;
  let timedOutPlayer: PlayerColor | null = null;

  if (roomRecord.currentTurn === 'w') {
    whiteTime = Math.max(0, whiteTime - elapsed);
    if (whiteTime <= 0) timedOutPlayer = 'w';
  } else {
    blackTime = Math.max(0, blackTime - elapsed);
    if (blackTime <= 0) timedOutPlayer = 'b';
  }

  return { whiteTime, blackTime, timedOutPlayer };
}

export async function finalizeRoomMatch(
  room: RoomState,
  gameOver: { winner: PlayerColor | 'draw' | null; reason: string }
) {
  if (room.gameOver && room.isRecorded) return;
  room.gameOver = gameOver;
  room.gameActive = false;

  if (room.clockInterval) {
    clearInterval(room.clockInterval);
    room.clockInterval = undefined;
  }

  broadcastToRoom(room, 'game:over', { gameOver: room.gameOver });

  if (room.isRecorded) return;
  room.isRecorded = true;

  const wId = room.whitePlayer?.id;
  const bId = room.blackPlayer?.id;
  if (!wId || !bId) return;

  const isBotOrGuest =
    wId.startsWith('bot_') ||
    bId.startsWith('bot_') ||
    wId.startsWith('guest_') ||
    bId.startsWith('guest_');

  try {
    const [wUser, bUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: wId } }),
      prisma.user.findUnique({ where: { id: bId } }),
    ]);

    if (!wUser || !bUser) return;

    const minutes = room.timeControlMinutes || 5;
    const ratingField: 'bulletRating' | 'blitzRating' | 'rapidRating' | 'checkersRating' | 'morabarabaRating' =
      room.gameId === 'checkers'
        ? 'checkersRating'
        : room.gameId === 'morabaraba'
        ? 'morabarabaRating'
        : minutes < 3
        ? 'bulletRating'
        : minutes < 10
        ? 'blitzRating'
        : 'rapidRating';

    const wRating = (wUser as any)[ratingField] ?? 1200;
    const bRating = (bUser as any)[ratingField] ?? 1200;

    const scoreWhite = gameOver.winner === 'w' ? 1 : gameOver.winner === 'b' ? 0 : 0.5;
    const movesCount = room.history.length || 10;

    const whiteXp = calculateMatchXp({
      playerRating: wRating,
      opponentRating: bRating,
      result: gameOver.winner === 'w' ? 'win' : gameOver.winner === 'b' ? 'loss' : 'draw',
      movesCount,
    });

    const blackXp = calculateMatchXp({
      playerRating: bRating,
      opponentRating: wRating,
      result: gameOver.winner === 'b' ? 'win' : gameOver.winner === 'w' ? 'loss' : 'draw',
      movesCount,
    });

    let ratingDelta = 0;
    const updates: any[] = [];

    if (!isBotOrGuest) {
      const elo = calculateElo(wRating, bRating, scoreWhite);
      ratingDelta = Math.abs(elo.deltaA);

      updates.push(
        prisma.user.update({
          where: { id: wUser.id },
          data: {
            [ratingField]: elo.newRatingA,
            xp: { increment: whiteXp.totalXp },
          },
        }),
        prisma.user.update({
          where: { id: bUser.id },
          data: {
            [ratingField]: elo.newRatingB,
            xp: { increment: blackXp.totalXp },
          },
        })
      );
    } else {
      updates.push(
        prisma.user.update({
          where: { id: wUser.id },
          data: { xp: { increment: whiteXp.totalXp } },
        }),
        prisma.user.update({
          where: { id: bUser.id },
          data: { xp: { increment: blackXp.totalXp } },
        })
      );
    }

    const pgn = room.engine.serialize() || room.history.join(' ');
    const fen = room.engine.getFenOrSnapshot();

    // Idempotent match creation with roomId unique constraint
    updates.push(
      prisma.match.upsert({
        where: { roomId: room.id },
        update: {},
        create: {
          gameId: room.gameId,
          variant: room.variant,
          whiteId: wUser.id,
          blackId: bUser.id,
          timeControl: `${minutes}+0`,
          winnerId: gameOver.winner === 'w' ? wUser.id : gameOver.winner === 'b' ? bUser.id : null,
          resultType: (gameOver.reason || 'GAME OVER').toUpperCase(),
          pgn,
          finalFen: fen,
          rated: !isBotOrGuest,
          ratingDelta,
          roomId: room.id,
        },
      })
    );

    await prisma.$transaction(updates);
  } catch (err) {
    console.error('[room-manager] finalizeRoomMatch error:', err);
  }
}

export function startRoomClock(room: RoomState) {
  if (room.clockInterval) return;

  room.clockInterval = setInterval(() => {
    if (!room.gameActive || room.gameOver) {
      if (room.clockInterval) clearInterval(room.clockInterval);
      room.clockInterval = undefined;
      return;
    }

    const turn = room.engine.getTurn();
    if (turn === 'w') {
      room.whiteTime = Math.max(0, room.whiteTime - 1);
      if (room.whiteTime <= 0) {
        finalizeRoomMatch(room, { winner: 'b', reason: 'White ran out of time' });
      }
    } else {
      room.blackTime = Math.max(0, room.blackTime - 1);
      if (room.blackTime <= 0) {
        finalizeRoomMatch(room, { winner: 'w', reason: 'Black ran out of time' });
      }
    }

    broadcastToRoom(room, 'clock:sync', {
      whiteTime: room.whiteTime,
      blackTime: room.blackTime,
      activeTurn: turn,
    });
  }, 1000);
}

// In-memory room creation (preserves compatibility with test harness)
export function createRoom(
  timeControlMinutes: number,
  creator: { id: string; handle: string; rating: number },
  gameId: GameId = 'chess',
  variant?: string
): RoomState {
  const roomId = Math.random().toString(36).substring(2, 9);
  const engine = createGameEngine(gameId, variant);

  const room: RoomState = {
    id: roomId,
    gameId,
    variant: variant || (gameId === 'chess' ? 'standard' : gameId === 'checkers' ? 'american-8x8' : 'standard-24'),
    engine,
    timeControlMinutes,
    whiteTime: timeControlMinutes * 60,
    blackTime: timeControlMinutes * 60,
    lastMoveTimestamp: Date.now(),
    gameActive: false,
    history: [],
    lastMove: null,
    moveSequence: 0,
    whitePlayer: {
      id: creator.id,
      handle: creator.handle,
      rating: creator.rating,
      color: 'w',
      connected: true,
    },
    blackPlayer: null,
    whitePlayerToken: crypto.randomUUID(),
    blackPlayerToken: undefined,
    gameOver: null,
    chatMessages: [],
    pendingDrawOffer: null,
    pendingRematchOffer: null,
    listeners: new Set(),
  };

  if (gameId === 'chess') {
    room.chess = (engine as any).getInternalEngine();
  }

  activeRooms.set(roomId, room);
  return room;
}

// Durable room creation with Supabase PostgreSQL persistence
export async function createDurableRoom(
  timeControlMinutes: number,
  creator: { id: string; handle: string; rating: number },
  gameId: GameId = 'chess',
  variant?: string
): Promise<RoomState> {
  const room = createRoom(timeControlMinutes, creator, gameId, variant);

  try {
    await prisma.room.create({
      data: {
        id: room.id,
        gameId: room.gameId,
        variant: room.variant,
        timeControlMinutes: room.timeControlMinutes,
        status: 'waiting',
        creatorId: creator.id,
        whitePlayerId: creator.id,
        whitePlayerHandle: creator.handle,
        whitePlayerRating: creator.rating,
        whitePlayerToken: room.whitePlayerToken,
        whiteTimeRemaining: room.whiteTime,
        blackTimeRemaining: room.blackTime,
        lastMoveTimestamp: BigInt(room.lastMoveTimestamp),
        currentTurn: 'w',
        moveSequence: 0,
        currentState: room.engine.getState() as any,
        history: [],
      },
    });
  } catch (dbErr) {
    console.warn('Durable room creation notice (using in-memory):', dbErr);
  }

  return room;
}

// Hydrate game engine from snapshot or serialized state
export function hydrateEngine(gameId: GameId, variant?: string, currentState?: any): IGameEngine {
  let snapshotStr: string | undefined;
  if (currentState) {
    if (typeof currentState === 'string') {
      snapshotStr = currentState;
    } else if (gameId === 'chess' && currentState.fen) {
      snapshotStr = currentState.fen;
    } else {
      snapshotStr = JSON.stringify(currentState);
    }
  }
  return createGameEngine(gameId, variant, snapshotStr);
}

// Durable room lookup: reads from PostgreSQL and caches in memory
export async function getDurableRoom(roomId: string): Promise<RoomState | null> {
  const inMemory = activeRooms.get(roomId);

  try {
    const dbRoom = await prisma.room.findUnique({
      where: { id: roomId },
    }).catch(() => null);

    if (dbRoom) {
      const clocks = calculateAuthoritativeClocks(dbRoom);
      const engine = hydrateEngine(dbRoom.gameId as GameId, dbRoom.variant, dbRoom.currentState);

      let gameOver: { winner: PlayerColor | 'draw' | null; reason: string } | null = null;
      if (dbRoom.status === 'completed') {
        gameOver = {
          winner: (dbRoom.winner === 'w' || dbRoom.winner === 'b') ? dbRoom.winner : 'draw',
          reason: dbRoom.finishReason || 'Match completed',
        };
      } else if (clocks.timedOutPlayer) {
        const winnerRole: PlayerColor = clocks.timedOutPlayer === 'w' ? 'b' : 'w';
        gameOver = {
          winner: winnerRole,
          reason: `${clocks.timedOutPlayer === 'w' ? 'White' : 'Black'} ran out of time`,
        };
      }

      const whitePlayer: RoomPlayer | null = dbRoom.whitePlayerId
        ? {
            id: dbRoom.whitePlayerId,
            handle: dbRoom.whitePlayerHandle || 'White',
            rating: dbRoom.whitePlayerRating || 1200,
            color: 'w',
            connected: true,
          }
        : null;

      const blackPlayer: RoomPlayer | null = dbRoom.blackPlayerId
        ? {
            id: dbRoom.blackPlayerId,
            handle: dbRoom.blackPlayerHandle || 'Black',
            rating: dbRoom.blackPlayerRating || 1200,
            color: 'b',
            connected: true,
          }
        : null;

      const reconstructed: RoomState = {
        id: dbRoom.id,
        gameId: dbRoom.gameId as GameId,
        variant: dbRoom.variant,
        engine,
        timeControlMinutes: dbRoom.timeControlMinutes,
        whiteTime: clocks.whiteTime,
        blackTime: clocks.blackTime,
        lastMoveTimestamp: Number(dbRoom.lastMoveTimestamp),
        gameActive: dbRoom.status === 'active' && !gameOver,
        history: dbRoom.history || [],
        lastMove: dbRoom.lastMove || null,
        moveSequence: dbRoom.moveSequence,
        whitePlayer,
        blackPlayer,
        whitePlayerToken: dbRoom.whitePlayerToken || undefined,
        blackPlayerToken: dbRoom.blackPlayerToken || undefined,
        gameOver,
        chatMessages: inMemory?.chatMessages || [],
        pendingDrawOffer: (dbRoom.pendingDrawOffer as PlayerColor) || null,
        pendingRematchOffer: (dbRoom.pendingRematchOffer as PlayerColor) || null,
        listeners: inMemory?.listeners || new Set(),
      };

      activeRooms.set(roomId, reconstructed);
      return reconstructed;
    }
  } catch (err) {
    console.warn('Database room fetch notice, falling back to memory:', err);
  }

  return inMemory || null;
}

// Durable room move submission with unique command ID idempotency & row-locking transaction
export async function submitDurableMove(params: {
  roomId: string;
  playerId: string;
  playerToken?: string;
  moveInput: any;
  commandId?: string;
  expectedSequence?: number;
}): Promise<{
  success: boolean;
  state?: any;
  idempotent?: boolean;
  error?: string;
}> {
  const { roomId, playerId, playerToken, moveInput, commandId, expectedSequence } = params;

  // 1. Idempotency Check: if this command ID has already been committed, return cached state
  if (commandId) {
    try {
      const existingMove = await prisma.roomMove.findUnique({
        where: { roomId_commandId: { roomId, commandId } },
      }).catch(() => null);

      if (existingMove) {
        const room = await getDurableRoom(roomId);
        return {
          success: true,
          idempotent: true,
          state: room ? sanitizeRoomState(room) : null,
        };
      }
    } catch {
      // In-memory fallback if DB not available
    }
  }

  // 2. Fetch room record
  const room = await getDurableRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.gameOver) {
    return { success: false, error: 'Match is already concluded' };
  }

  const turn = room.engine.getTurn();
  const playerExpected = turn === 'w' ? room.whitePlayer : room.blackPlayer;
  const expectedToken = turn === 'w' ? room.whitePlayerToken : room.blackPlayerToken;

  if (expectedToken && playerToken && playerToken !== expectedToken) {
    return { success: false, error: 'Unauthorized: Invalid player authorization token for current turn' };
  }

  if (playerExpected && playerId && playerExpected.id !== playerId) {
    return { success: false, error: `Not your turn. Expected ${playerExpected.handle}` };
  }

  if (expectedSequence !== undefined && room.moveSequence !== undefined && expectedSequence !== room.moveSequence) {
    return { success: false, error: `Out-of-order move sequence. Expected ${room.moveSequence}, got ${expectedSequence}` };
  }

  // 3. Make move on engine
  const moveRes = room.engine.makeMove(moveInput);
  if (!moveRes.success) {
    return { success: false, error: 'Illegal move' };
  }

  room.lastMove = moveInput;
  room.gameActive = true;
  room.lastMoveTimestamp = Date.now();
  const newSequence = (room.moveSequence || 0) + 1;
  room.moveSequence = newSequence;

  const currentHist = (room.engine.getState() as any)?.history;
  if (Array.isArray(currentHist)) {
    room.history = [...currentHist];
  }

  const winner = room.engine.checkWinner();
  if (winner) {
    room.gameOver = { winner: winner.winner, reason: winner.headline };
    room.gameActive = false;
  }

  // 4. Atomic PostgreSQL commit
  try {
    await prisma.$transaction(async (tx) => {
      // Record move with unique commandId
      if (commandId) {
        await tx.roomMove.create({
          data: {
            roomId,
            sequence: newSequence,
            commandId,
            playerId,
            playerRole: turn,
            moveData: moveInput,
            resultingTurn: room.engine.getTurn(),
          },
        });
      }

      // Update room state
      await tx.room.update({
        where: { id: roomId },
        data: {
          currentTurn: room.engine.getTurn(),
          moveSequence: newSequence,
          currentState: room.engine.getState() as any,
          lastMove: moveInput,
          lastMoveTimestamp: BigInt(room.lastMoveTimestamp),
          whiteTimeRemaining: room.whiteTime,
          blackTimeRemaining: room.blackTime,
          history: room.history,
          status: room.gameOver ? 'completed' : 'active',
          winner: room.gameOver ? room.gameOver.winner : null,
          finishReason: room.gameOver ? room.gameOver.reason : null,
        },
      });
    });

    if (room.gameOver) {
      await finalizeRoomMatch(room, room.gameOver);
    }
  } catch (txErr) {
    console.warn('Durable move transaction notice (fallback to in-memory):', txErr);
  }

  const sanitized = sanitizeRoomState(room);

  // 5. Broadcast to Supabase Realtime channel and local listeners
  await broadcastRealtimeEvent(roomId, 'move:made', {
    move: moveRes,
    lastMove: moveInput,
    state: sanitized,
    originPlayerId: playerId || null,
    commandId: commandId || null,
    sequence: newSequence,
  });

  if (!room.gameOver) {
    triggerBotMoveIfNeeded(room);
  }

  return { success: true, state: sanitized };
}

export function sanitizeRoomState(room: RoomState) {
  return {
    id: room.id,
    gameId: room.gameId,
    variant: room.variant,
    fen: room.engine.getFenOrSnapshot(),
    board: room.engine.getBoard(),
    history: room.history,
    lastMove: room.lastMove,
    moveSequence: room.moveSequence ?? 0,
    activeTurn: room.engine.getTurn(),
    whiteTime: room.whiteTime,
    blackTime: room.blackTime,
    timeControlMinutes: room.timeControlMinutes,
    gameActive: room.gameActive,
    whitePlayer: room.whitePlayer,
    blackPlayer: room.blackPlayer,
    gameOver: room.gameOver,
    chatMessages: room.chatMessages.slice(-50),
    pendingDrawOffer: room.pendingDrawOffer,
    pendingRematchOffer: room.pendingRematchOffer,
  };
}

export function addChatMessage(
  room: RoomState,
  msg: { senderId: string; senderHandle: string; role: PlayerColor; text?: string; emoji?: string }
): ChatMessage {
  const chatMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId: msg.senderId,
    senderHandle: msg.senderHandle,
    role: msg.role,
    text: msg.text,
    emoji: msg.emoji,
    timestamp: Date.now(),
  };
  room.chatMessages.push(chatMsg);
  if (room.chatMessages.length > 100) {
    room.chatMessages.shift();
  }
  broadcastToRoom(room, 'chat:message', chatMsg);
  return chatMsg;
}

export async function offerDraw(room: RoomState, byRole: PlayerColor) {
  if (room.gameOver || !room.gameActive) return false;
  room.pendingDrawOffer = byRole;

  try {
    await prisma.room.update({
      where: { id: room.id },
      data: { pendingDrawOffer: byRole },
    });
  } catch {
    // In-memory fallback
  }

  broadcastToRoom(room, 'draw:offered', { by: byRole });
  return true;
}

export async function respondDraw(room: RoomState, responderRole: PlayerColor, accept: boolean) {
  if (room.gameOver || !room.pendingDrawOffer || room.pendingDrawOffer === responderRole) {
    return false;
  }

  if (accept) {
    room.pendingDrawOffer = null;
    try {
      await prisma.room.update({
        where: { id: room.id },
        data: { pendingDrawOffer: null, status: 'completed', winner: 'draw', finishReason: 'Draw agreed by mutual agreement' },
      });
    } catch {
      // In-memory fallback
    }
    await finalizeRoomMatch(room, { winner: 'draw', reason: 'Draw agreed by mutual agreement' });
  } else {
    room.pendingDrawOffer = null;
    try {
      await prisma.room.update({
        where: { id: room.id },
        data: { pendingDrawOffer: null },
      });
    } catch {
      // In-memory fallback
    }
    broadcastToRoom(room, 'draw:declined', { by: responderRole });
  }
  return true;
}

export async function resignGame(room: RoomState, resigningRole: PlayerColor) {
  if (room.gameOver) return false;
  const winnerRole: PlayerColor = resigningRole === 'w' ? 'b' : 'w';
  const resigningName = resigningRole === 'w' ? (room.whitePlayer?.handle || 'White') : (room.blackPlayer?.handle || 'Black');
  const reason = `${resigningName} resigned`;

  try {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'completed', winner: winnerRole, finishReason: reason },
    });
  } catch {
    // In-memory fallback
  }

  await finalizeRoomMatch(room, {
    winner: winnerRole,
    reason,
  });
  return true;
}

export async function offerRematch(room: RoomState, byRole: PlayerColor) {
  if (!room.gameOver) return false;
  room.pendingRematchOffer = byRole;

  try {
    await prisma.room.update({
      where: { id: room.id },
      data: { pendingRematchOffer: byRole },
    });
  } catch {
    // In-memory fallback
  }

  broadcastToRoom(room, 'rematch:offered', { by: byRole });
  return true;
}

export async function acceptRematch(room: RoomState, byRole: PlayerColor) {
  if (!room.gameOver || !room.pendingRematchOffer || room.pendingRematchOffer === byRole) {
    return false;
  }

  const oldWhite = room.whitePlayer;
  const oldBlack = room.blackPlayer;
  const oldWhiteToken = room.whitePlayerToken;
  const oldBlackToken = room.blackPlayerToken;

  if (oldWhite && oldBlack) {
    room.whitePlayer = { ...oldBlack, color: 'w' };
    room.blackPlayer = { ...oldWhite, color: 'b' };
    room.whitePlayerToken = oldBlackToken;
    room.blackPlayerToken = oldWhiteToken;
  }

  room.engine.reset(room.variant);
  if (room.gameId === 'chess') {
    room.chess = (room.engine as any).getInternalEngine();
  }
  room.whiteTime = room.timeControlMinutes * 60;
  room.blackTime = room.timeControlMinutes * 60;
  room.lastMoveTimestamp = Date.now();
  room.gameActive = true;
  room.history = [];
  room.lastMove = null;
  room.moveSequence = 0;
  room.gameOver = null;
  room.pendingDrawOffer = null;
  room.pendingRematchOffer = null;

  try {
    await prisma.room.update({
      where: { id: room.id },
      data: {
        status: 'active',
        whitePlayerId: room.whitePlayer?.id,
        whitePlayerHandle: room.whitePlayer?.handle,
        whitePlayerToken: room.whitePlayerToken,
        blackPlayerId: room.blackPlayer?.id,
        blackPlayerHandle: room.blackPlayer?.handle,
        blackPlayerToken: room.blackPlayerToken,
        whiteTimeRemaining: room.whiteTime,
        blackTimeRemaining: room.blackTime,
        lastMoveTimestamp: BigInt(room.lastMoveTimestamp),
        currentTurn: 'w',
        moveSequence: 0,
        currentState: room.engine.getState() as any,
        lastMove: Prisma.DbNull,
        history: [],
        winner: null,
        finishReason: null,
        pendingDrawOffer: null,
        pendingRematchOffer: null,
      },
    });
  } catch {
    // In-memory fallback
  }

  startRoomClock(room);

  broadcastToRoom(room, 'rematch:accepted', {
    state: sanitizeRoomState(room),
  });

  triggerBotMoveIfNeeded(room);
  return true;
}

export function triggerBotMoveIfNeeded(room: RoomState) {
  if (!room.gameActive || room.gameOver) return;
  const currentTurn = room.engine.getTurn();
  const activePlayer = currentTurn === 'w' ? room.whitePlayer : room.blackPlayer;

  if (activePlayer && activePlayer.id.startsWith('bot_')) {
    setTimeout(async () => {
      if (!room.gameActive || room.gameOver) return;
      if (room.engine.getTurn() !== currentTurn) return;

      try {
        const botMove = await room.engine.findBotMove('medium');
        if (!botMove) return;

        await submitDurableMove({
          roomId: room.id,
          playerId: activePlayer.id,
          moveInput: botMove,
          commandId: `bot_${Date.now()}`,
        });
      } catch (err) {
        console.error('Bot move execution error in room:', err);
      }
    }, 700 + Math.random() * 600);
  }
}

export function authenticateRoomPlayer(
  room: RoomState,
  req: Request,
  _bodyPlayerId?: string,
  bodyPlayerToken?: string
): PlayerColor | null {
  const tokenFromHeader = req.headers.get('x-player-token');
  const token = bodyPlayerToken || tokenFromHeader;
  const session = getSessionFromRequest(req);

  const isWhiteToken = Boolean(token && room.whitePlayerToken && token === room.whitePlayerToken);
  const isWhiteSession = Boolean(session && room.whitePlayer && session.userId === room.whitePlayer.id);
  if (isWhiteToken || isWhiteSession) {
    return 'w';
  }

  const isBlackToken = Boolean(token && room.blackPlayerToken && token === room.blackPlayerToken);
  const isBlackSession = Boolean(session && room.blackPlayer && session.userId === room.blackPlayer.id);
  if (isBlackToken || isBlackSession) {
    return 'b';
  }

  return null;
}
