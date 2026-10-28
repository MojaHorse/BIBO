import { Chess, Square, Color } from 'chess.js';
import crypto from 'crypto';
import { GameId, IGameEngine, PlayerColor } from './games/types';
import { createGameEngine } from './games/factory';
import { prisma } from './prisma';
import { calculateElo } from './elo';
import { calculateMatchXp } from './progression';
import { getSessionFromRequest } from './auth-token';

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
  chess?: Chess; // for backwards compatibility with any direct chess readers
  timeControlMinutes: number;
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
  lastMoveTimestamp: number;
  gameActive: boolean;
  history: string[];
  lastMove: any;
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

export function broadcastToRoom(room: RoomState, event: string, data: unknown) {
  for (const listener of room.listeners) {
    try {
      listener(event, data);
    } catch {
      // ignore closed stream
    }
  }
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

    updates.push(
      prisma.match.create({
        data: {
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
    gameActive: false, // Waits until Black joins
    history: [],
    lastMove: null,
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

  // Backwards compatibility for chess callers
  if (gameId === 'chess') {
    room.chess = (engine as any).getInternalEngine();
  }

  activeRooms.set(roomId, room);
  return room;
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

export function offerDraw(room: RoomState, byRole: PlayerColor) {
  if (room.gameOver || !room.gameActive) return false;
  room.pendingDrawOffer = byRole;
  broadcastToRoom(room, 'draw:offered', { by: byRole });
  return true;
}

export function respondDraw(room: RoomState, responderRole: PlayerColor, accept: boolean) {
  if (room.gameOver || !room.pendingDrawOffer || room.pendingDrawOffer === responderRole) {
    return false;
  }

  if (accept) {
    room.pendingDrawOffer = null;
    finalizeRoomMatch(room, { winner: 'draw', reason: 'Draw agreed by mutual agreement' });
  } else {
    room.pendingDrawOffer = null;
    broadcastToRoom(room, 'draw:declined', { by: responderRole });
  }
  return true;
}

export function resignGame(room: RoomState, resigningRole: PlayerColor) {
  if (room.gameOver) return false;
  const winnerRole: PlayerColor = resigningRole === 'w' ? 'b' : 'w';
  const resigningName = resigningRole === 'w' ? (room.whitePlayer?.handle || 'White') : (room.blackPlayer?.handle || 'Black');
  finalizeRoomMatch(room, {
    winner: winnerRole,
    reason: `${resigningName} resigned`,
  });
  return true;
}

export function offerRematch(room: RoomState, byRole: PlayerColor) {
  if (!room.gameOver) return false;
  room.pendingRematchOffer = byRole;
  broadcastToRoom(room, 'rematch:offered', { by: byRole });
  return true;
}

export function acceptRematch(room: RoomState, byRole: PlayerColor) {
  if (!room.gameOver || !room.pendingRematchOffer || room.pendingRematchOffer === byRole) {
    return false;
  }

  // Swap colors for rematch
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

  // Reset engine and clocks
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
  room.gameOver = null;
  room.pendingDrawOffer = null;
  room.pendingRematchOffer = null;

  startRoomClock(room);

  broadcastToRoom(room, 'rematch:accepted', {
    state: sanitizeRoomState(room),
  });

  // If new white player is a bot, trigger first move
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

        const moveRes = room.engine.makeMove(botMove);
        if (!moveRes.success) return;

        room.lastMove = botMove;
        room.lastMoveTimestamp = Date.now();
        const currentHist = (room.engine.getState() as any)?.history;
        if (Array.isArray(currentHist)) {
          room.history = [...currentHist];
        }

        const winner = room.engine.checkWinner();
        if (winner) {
          finalizeRoomMatch(room, { winner: winner.winner, reason: winner.headline });
        }

        broadcastToRoom(room, 'move:made', {
          move: moveRes,
          lastMove: botMove,
          state: sanitizeRoomState(room),
          originPlayerId: activePlayer.id,
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

  // Check White
  const isWhiteToken = Boolean(token && room.whitePlayerToken && token === room.whitePlayerToken);
  const isWhiteSession = Boolean(session && room.whitePlayer && session.userId === room.whitePlayer.id);
  if (isWhiteToken || isWhiteSession) {
    return 'w';
  }

  // Check Black
  const isBlackToken = Boolean(token && room.blackPlayerToken && token === room.blackPlayerToken);
  const isBlackSession = Boolean(session && room.blackPlayer && session.userId === room.blackPlayer.id);
  if (isBlackToken || isBlackSession) {
    return 'b';
  }

  return null;
}
