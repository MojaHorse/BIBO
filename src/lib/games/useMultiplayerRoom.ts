'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameId, PlayerColor } from './types';
import { getPlayerSession } from '../session';
import { ChatMessage } from '../room-manager';

export interface UseMultiplayerRoomOptions {
  roomId: string | null;
  gameId: GameId;
  onStateSync: (state: any) => void;
  onClockSync: (whiteTime: number, blackTime: number, activeTurn: PlayerColor) => void;
  onMoveMade: (payload: {
    move: any;
    lastMove: any;
    state: any;
    originPlayerId?: string | null;
    commandId?: string | null;
    isEcho?: boolean;
  }) => void;
  onGameOver: (gameOver: { winner: PlayerColor | 'draw' | null; reason: string }) => void;
}

export function useMultiplayerRoom(options: UseMultiplayerRoomOptions) {
  const {
    roomId,
    gameId,
    onStateSync,
    onClockSync,
    onMoveMade,
    onGameOver,
  } = options;

  const [myRole, setMyRole] = useState<'w' | 'b' | 'spectator' | null>(null);
  const [myPlayerToken, setMyPlayerToken] = useState<string | null>(null);
  const [opponentInfo, setOpponentInfo] = useState<{ handle: string; rating: number; avatar?: string } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOpponentConnected, setIsOpponentConnected] = useState<boolean>(true);
  const [opponentDisconnectedAt, setOpponentDisconnectedAt] = useState<number | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);
  const [multiplayerModalOpen, setMultiplayerModalOpen] = useState<boolean>(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState<boolean>(false);

  // Online game interactive state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingReaction, setIncomingReaction] = useState<{ emoji: string; senderHandle: string; id: string } | null>(null);
  const [drawOfferPendingFrom, setDrawOfferPendingFrom] = useState<PlayerColor | null>(null);
  const [rematchOfferPendingFrom, setRematchOfferPendingFrom] = useState<PlayerColor | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<string | null>(null);

  // Keep latest callbacks in refs to avoid stale closures in event listeners
  const callbacksRef = useRef({ onStateSync, onClockSync, onMoveMade, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onStateSync, onClockSync, onMoveMade, onGameOver };
  });

  // Keep track of locally-initiated command IDs to identify echoes
  const pendingCommandIdsRef = useRef<Set<string>>(new Set());

  // Connect to Multiplayer Room via SSE
  useEffect(() => {
    if (!roomId) {
      pendingCommandIdsRef.current.clear();
      setMyRole(null);
      setMyPlayerToken(null);
      setOpponentInfo(null);
      setIsConnected(false);
      setIsWaitingForOpponent(false);
      setChatMessages([]);
      setDrawOfferPendingFrom(null);
      setRematchOfferPendingFrom(null);
      return;
    }

    const session = getPlayerSession();
    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    const joinRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player: session }),
        });

        if (!res.ok) {
          console.error('Failed to join room:', res.statusText);
          return;
        }

        const data = await res.json();
        if (!isSubscribed) return;

        if (data.role) {
          setMyRole(data.role);
        }
        if (data.playerToken) {
          setMyPlayerToken(data.playerToken);
        }

        if (data.state) {
          const s = data.state;
          callbacksRef.current.onStateSync(s);

          if (s.chatMessages && Array.isArray(s.chatMessages)) {
            setChatMessages(s.chatMessages);
          }
          if (s.pendingDrawOffer) {
            setDrawOfferPendingFrom(s.pendingDrawOffer);
          }
          if (s.pendingRematchOffer) {
            setRematchOfferPendingFrom(s.pendingRematchOffer);
          }

          const opp = data.role === 'w' ? s.blackPlayer : s.whitePlayer;
          if (opp) {
            setOpponentInfo({ handle: opp.handle, rating: opp.rating, avatar: opp.avatar });
            setIsWaitingForOpponent(false);
          } else {
            setIsWaitingForOpponent(true);
          }
        }
      } catch (err) {
        console.error('Error joining room:', err);
      }
    };

    joinRoom();

    // Open Server-Sent Events stream with identity query
    eventSource = new EventSource(`/api/rooms/${roomId}/stream?playerId=${session.id}`);

    eventSource.onopen = () => {
      if (isSubscribed) setIsConnected(true);
    };

    eventSource.onerror = () => {
      if (isSubscribed) setIsConnected(false);
    };

    eventSource.addEventListener('clock:sync', (event) => {
      try {
        const payload = JSON.parse(event.data);
        callbacksRef.current.onClockSync(payload.whiteTime, payload.blackTime, payload.activeTurn);
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('move:made', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const session = getPlayerSession();
        const hasPendingId = Boolean(payload.commandId && pendingCommandIdsRef.current.has(payload.commandId));
        const isFromMe = Boolean(payload.originPlayerId && payload.originPlayerId === session.id);
        const isEcho = hasPendingId || isFromMe;

        if (payload.commandId) {
          pendingCommandIdsRef.current.delete(payload.commandId);
        }

        callbacksRef.current.onMoveMade({
          ...payload,
          isEcho,
        });
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('player:joined', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const player = payload.blackPlayer || payload.player;
        if (player) {
          setOpponentInfo({ handle: player.handle, rating: player.rating, avatar: player.avatar });
          setIsWaitingForOpponent(false);
          setIsOpponentConnected(true);
          setOpponentDisconnectedAt(null);
        }
        if (payload.state) {
          callbacksRef.current.onStateSync(payload.state);
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('player:disconnected', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.role !== myRole) {
          setIsOpponentConnected(false);
          setOpponentDisconnectedAt(payload.at || Date.now());
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('player:reconnected', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.role !== myRole) {
          setIsOpponentConnected(true);
          setOpponentDisconnectedAt(null);
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('game:over', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.gameOver) {
          setDrawOfferPendingFrom(null);
          callbacksRef.current.onGameOver(payload.gameOver);
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('chat:message', (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setChatMessages((prev) => [...prev, message]);

        // If it's a reaction emoji from the opponent, trigger floating reaction animation
        if (message.emoji) {
          setIncomingReaction({
            emoji: message.emoji,
            senderHandle: message.senderHandle,
            id: message.id,
          });
          setTimeout(() => {
            setIncomingReaction((curr) => (curr?.id === message.id ? null : curr));
          }, 3200);
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('draw:offered', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setDrawOfferPendingFrom(payload.by);
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('draw:declined', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setDrawOfferPendingFrom(null);
        setDrawOfferStatus(`${payload.by === 'w' ? 'White' : 'Black'} declined the draw offer`);
        setTimeout(() => setDrawOfferStatus(null), 4000);
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('rematch:offered', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setRematchOfferPendingFrom(payload.by);
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('rematch:accepted', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setRematchOfferPendingFrom(null);
        setDrawOfferPendingFrom(null);
        if (payload.state) {
          callbacksRef.current.onStateSync(payload.state);
          // Invert local role because rematch swaps colors
          setMyRole((prev) => (prev === 'w' ? 'b' : prev === 'b' ? 'w' : prev));
        }
      } catch {
        // ignore
      }
    });

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [roomId, gameId]);

  // Transmit move to server room
  const sendMove = useCallback(
    async (move: any) => {
      if (!roomId) return false;

      const session = getPlayerSession();
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      pendingCommandIdsRef.current.add(commandId);

      try {
        const res = await fetch(`/api/rooms/${roomId}/move`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': myPlayerToken || '',
          },
          body: JSON.stringify({
            move,
            playerId: session.id,
            playerToken: myPlayerToken,
            commandId,
          }),
        });

        if (!res.ok) {
          pendingCommandIdsRef.current.delete(commandId);
          const errData = await res.json().catch(() => ({}));
          console.warn('Move rejected by room server:', errData.error);
          return false;
        }

        return true;
      } catch (err) {
        pendingCommandIdsRef.current.delete(commandId);
        console.error('Failed to submit move to room:', err);
        return false;
      }
    },
    [roomId, myPlayerToken]
  );

  // Send Chat message or Reaction emoji
  const sendChat = useCallback(
    async (text?: string, emoji?: string) => {
      if (!roomId) return false;
      const session = getPlayerSession();

      try {
        const res = await fetch(`/api/rooms/${roomId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            emoji,
            playerId: session.id,
            playerToken: myPlayerToken,
          }),
        });
        return res.ok;
      } catch (err) {
        console.error('Failed to send chat message:', err);
        return false;
      }
    },
    [roomId, myPlayerToken]
  );

  // Offer Draw
  const offerDraw = useCallback(async () => {
    if (!roomId) return false;
    const session = getPlayerSession();

    try {
      const res = await fetch(`/api/rooms/${roomId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offer',
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      if (res.ok) {
        if (myRole === 'w' || myRole === 'b') {
          setDrawOfferPendingFrom(myRole);
        }
      }
      return res.ok;
    } catch (err) {
      console.error('Draw offer error:', err);
      return false;
    }
  }, [roomId, myPlayerToken, myRole]);

  // Respond to Draw Offer
  const respondDraw = useCallback(
    async (accept: boolean) => {
      if (!roomId) return false;
      const session = getPlayerSession();

      try {
        const res = await fetch(`/api/rooms/${roomId}/draw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: accept ? 'accept' : 'decline',
            playerId: session.id,
            playerToken: myPlayerToken,
          }),
        });
        if (res.ok) {
          setDrawOfferPendingFrom(null);
        }
        return res.ok;
      } catch (err) {
        console.error('Draw response error:', err);
        return false;
      }
    },
    [roomId, myPlayerToken]
  );

  // Resign match
  const resignMatch = useCallback(async () => {
    if (!roomId) return false;
    const session = getPlayerSession();

    try {
      const res = await fetch(`/api/rooms/${roomId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('Resignation error:', err);
      return false;
    }
  }, [roomId, myPlayerToken]);

  // Offer Rematch
  const offerRematch = useCallback(async () => {
    if (!roomId) return false;
    const session = getPlayerSession();

    try {
      const res = await fetch(`/api/rooms/${roomId}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offer',
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      if (res.ok) {
        if (myRole === 'w' || myRole === 'b') {
          setRematchOfferPendingFrom(myRole);
        }
      }
      return res.ok;
    } catch (err) {
      console.error('Rematch offer error:', err);
      return false;
    }
  }, [roomId, myPlayerToken, myRole]);

  // Respond Rematch
  const respondRematch = useCallback(
    async (accept: boolean) => {
      if (!roomId) return false;
      const session = getPlayerSession();

      try {
        const res = await fetch(`/api/rooms/${roomId}/rematch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: accept ? 'accept' : 'decline',
            playerId: session.id,
            playerToken: myPlayerToken,
          }),
        });
        if (res.ok) {
          setRematchOfferPendingFrom(null);
        }
        return res.ok;
      } catch (err) {
        console.error('Rematch response error:', err);
        return false;
      }
    },
    [roomId, myPlayerToken]
  );

  return {
    isMultiplayer: Boolean(roomId),
    myRole,
    setMyRole,
    isMyTurn: (currentTurn: PlayerColor) => {
      if (!roomId) return true; // Local play: always allowed
      if (!myRole) return currentTurn === 'w'; // Connecting fallback: allowed for White
      return myRole === currentTurn;
    },
    myPlayerToken,
    opponentInfo,
    isConnected,
    isOpponentConnected,
    opponentDisconnectedAt,
    isWaitingForOpponent,
    multiplayerModalOpen,
    setMultiplayerModalOpen,
    chatDrawerOpen,
    setChatDrawerOpen,
    chatMessages,
    incomingReaction,
    drawOfferPendingFrom,
    rematchOfferPendingFrom,
    drawOfferStatus,
    sendMove,
    sendChat,
    offerDraw,
    respondDraw,
    resignMatch,
    offerRematch,
    respondRematch,
  };
}
