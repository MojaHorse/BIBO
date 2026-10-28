import crypto from 'crypto';
import { GameId, PlayerColor } from './games/types';
import { createRoom, startRoomClock, activeRooms } from './room-manager';

export interface QueuedPlayer {
  playerId: string;
  handle: string;
  rating: number;
  avatar?: string;
  gameId: GameId;
  variant: string;
  timeControlMinutes: number;
  queuedAt: number;
  matchedRoomId?: string;
  matchedRole?: PlayerColor;
  opponent?: {
    id: string;
    handle: string;
    rating: number;
    avatar?: string;
  };
}

const BOT_ROSTER = [
  { handle: 'BIBO Sentinel', rating: 1350 },
  { handle: 'Grandmaster Lynx', rating: 1580 },
  { handle: 'PawnProwler', rating: 1220 },
  { handle: 'WhiskerStrategist', rating: 1470 },
  { handle: 'ShadowFeline', rating: 1640 },
  { handle: 'CyberTabby', rating: 1390 },
];

const globalForMatchmaking = global as unknown as {
  matchQueue: Map<string, QueuedPlayer>;
};

export const matchQueue = globalForMatchmaking.matchQueue || new Map<string, QueuedPlayer>();
if (process.env.NODE_ENV !== 'production') {
  globalForMatchmaking.matchQueue = matchQueue;
}

export function joinQueue(params: {
  player: { id: string; handle: string; rating: number; avatar?: string };
  gameId: GameId;
  timeControlMinutes: number;
  variant?: string;
}): { status: 'queued' | 'matched'; roomId?: string; role?: PlayerColor; opponent?: any } {
  const { player, gameId, timeControlMinutes, variant } = params;
  const gameVariant = variant || (gameId === 'chess' ? 'standard' : gameId === 'checkers' ? 'american-8x8' : 'standard-24');

  // Check if player is already matched in queue
  const existing = matchQueue.get(player.id);
  if (existing && existing.matchedRoomId) {
    return {
      status: 'matched',
      roomId: existing.matchedRoomId,
      role: existing.matchedRole,
      opponent: existing.opponent,
    };
  }

  // Look for another waiting human opponent
  const now = Date.now();
  for (const [otherId, otherPlayer] of matchQueue.entries()) {
    // Purge stale or abandoned queue entries older than 8s
    if (now - otherPlayer.queuedAt > 8000 && !otherPlayer.matchedRoomId) {
      matchQueue.delete(otherId);
      continue;
    }

    if (
      otherId !== player.id &&
      otherPlayer.gameId === gameId &&
      !otherPlayer.matchedRoomId
    ) {
      // Human Match Found!
      const isPlayerWhite = Math.random() > 0.5;
      const whiteCandidate = isPlayerWhite ? player : otherPlayer;
      const blackCandidate = isPlayerWhite ? otherPlayer : player;

      const getCandidateId = (c: { playerId?: string; id?: string }) =>
        c.playerId || c.id || `u_${Math.random().toString(36).substring(2, 6)}`;

      const room = createRoom(
        timeControlMinutes || 5,
        {
          id: getCandidateId(whiteCandidate),
          handle: whiteCandidate.handle,
          rating: whiteCandidate.rating,
        },
        gameId,
        gameVariant
      );

      // Register Black player
      room.blackPlayerToken = crypto.randomUUID();
      room.blackPlayer = {
        id: getCandidateId(blackCandidate),
        handle: blackCandidate.handle,
        rating: blackCandidate.rating,
        color: 'b',
        connected: true,
      };
      room.gameActive = true;
      startRoomClock(room);

      // Update both in queue
      otherPlayer.matchedRoomId = room.id;
      otherPlayer.matchedRole = isPlayerWhite ? 'b' : 'w';
      otherPlayer.opponent = {
        id: player.id,
        handle: player.handle,
        rating: player.rating,
        avatar: player.avatar,
      };

      const queuedCurrent: QueuedPlayer = {
        playerId: player.id,
        handle: player.handle,
        rating: player.rating,
        avatar: player.avatar,
        gameId,
        variant: gameVariant,
        timeControlMinutes,
        queuedAt: Date.now(),
        matchedRoomId: room.id,
        matchedRole: isPlayerWhite ? 'w' : 'b',
        opponent: {
          id: otherPlayer.playerId,
          handle: otherPlayer.handle,
          rating: otherPlayer.rating,
          avatar: otherPlayer.avatar,
        },
      };
      matchQueue.set(player.id, queuedCurrent);

      // Clean up after 30 seconds
      setTimeout(() => {
        matchQueue.delete(player.id);
        matchQueue.delete(otherId);
      }, 30000);

      return {
        status: 'matched',
        roomId: room.id,
        role: queuedCurrent.matchedRole,
        opponent: queuedCurrent.opponent,
      };
    }
  }

  // No human opponent immediately found; enter queue
  const newQueued: QueuedPlayer = {
    playerId: player.id,
    handle: player.handle,
    rating: player.rating,
    avatar: player.avatar,
    gameId,
    variant: gameVariant,
    timeControlMinutes,
    queuedAt: Date.now(),
  };
  matchQueue.set(player.id, newQueued);

  return { status: 'queued' };
}

export function pollQueue(
  playerId: string,
  allowBotFallback: boolean = true
): { status: 'searching' | 'matched' | 'not_found'; roomId?: string; role?: PlayerColor; opponent?: any; elapsedMs?: number } {
  const queued = matchQueue.get(playerId);
  if (!queued) {
    return { status: 'not_found' };
  }

  // Already matched
  if (queued.matchedRoomId) {
    return {
      status: 'matched',
      roomId: queued.matchedRoomId,
      role: queued.matchedRole,
      opponent: queued.opponent,
    };
  }

  const elapsedMs = Date.now() - queued.queuedAt;

  // After 2.5 seconds, pair with tactical BOT opponent to guarantee instant matchmaking
  if (allowBotFallback && elapsedMs >= 2500) {
    const bot = BOT_ROSTER[Math.floor(Math.random() * BOT_ROSTER.length)];
    const room = createRoom(
      queued.timeControlMinutes || 5,
      {
        id: queued.playerId,
        handle: queued.handle,
        rating: queued.rating,
      },
      queued.gameId,
      queued.variant
    );

    room.blackPlayerToken = crypto.randomUUID();
    room.blackPlayer = {
      id: `bot_${bot.handle.toLowerCase().replace(/\s+/g, '_')}`,
      handle: bot.handle,
      rating: bot.rating,
      color: 'b',
      connected: true,
    };
    room.gameActive = true;
    startRoomClock(room);

    queued.matchedRoomId = room.id;
    queued.matchedRole = 'w';
    queued.opponent = {
      id: room.blackPlayer.id,
      handle: bot.handle,
      rating: bot.rating,
    };

    setTimeout(() => {
      matchQueue.delete(playerId);
    }, 30000);

    return {
      status: 'matched',
      roomId: room.id,
      role: 'w',
      opponent: queued.opponent,
      elapsedMs,
    };
  }

  return {
    status: 'searching',
    elapsedMs,
  };
}

export function cancelQueue(playerId: string) {
  matchQueue.delete(playerId);
}
