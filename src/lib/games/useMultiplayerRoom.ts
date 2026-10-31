'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameId, PlayerColor } from './types';
import { getPlayerSession } from '../session';
import { ChatMessage } from '../room-manager';
import { createClient as createBrowserSupabaseClient } from '../supabase/client';

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
    sequence?: number;
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
  const [myPlayerToken, setMyPlayerTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !roomId) return null;
    try {
      return sessionStorage.getItem(`bibo_room_token_${roomId}`);
    } catch {
      return null;
    }
  });

  const setMyPlayerToken = useCallback(
    (token: string | null) => {
      setMyPlayerTokenState(token);
      if (typeof window !== 'undefined' && roomId) {
        try {
          if (token) {
            sessionStorage.setItem(`bibo_room_token_${roomId}`, token);
          } else {
            sessionStorage.removeItem(`bibo_room_token_${roomId}`);
          }
        } catch {}
      }
    },
    [roomId]
  );
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

  // Monotonically increasing sequence tracker to detect gaps
  const lastSequenceRef = useRef<number>(0);

  // Keep latest callbacks in refs to avoid stale closures in event listeners
  const callbacksRef = useRef({ onStateSync, onClockSync, onMoveMade, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onStateSync, onClockSync, onMoveMade, onGameOver };
  });

  // Keep track of locally-initiated command IDs to identify echoes
  const pendingCommandIdsRef = useRef<Set<string>>(new Set());
  // Active Supabase Realtime channel reference for direct peer broadcast
  const channelRef = useRef<any>(null);

  // Connect to Multiplayer Room via Supabase Realtime Channels (with SSE fallback)
  useEffect(() => {
    if (!roomId) {
      pendingCommandIdsRef.current.clear();
      lastSequenceRef.current = 0;
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

    // Fetch authoritative state from database
    const syncAuthoritativeState = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.state && isSubscribed) {
          if (data.state.moveSequence) {
            lastSequenceRef.current = data.state.moveSequence;
          }
          callbacksRef.current.onStateSync(data.state);
        }
      } catch {
        // Ignore
      }
    };

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
          if (s.moveSequence) lastSequenceRef.current = s.moveSequence;
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

    // 1. Subscribe to Supabase Realtime Channel
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const handleMoveMade = (payload: any) => {
      if (!isSubscribed) return;
      const curSession = getPlayerSession();
      const hasPendingId = Boolean(payload.commandId && pendingCommandIdsRef.current.has(payload.commandId));
      const isFromMe = Boolean(payload.originPlayerId && payload.originPlayerId === curSession.id);
      const isEcho = hasPendingId || isFromMe;

      if (payload.commandId) {
        pendingCommandIdsRef.current.delete(payload.commandId);
      }

      // Check for sequence gap (missed event recovery)
      if (payload.sequence !== undefined) {
        if (lastSequenceRef.current > 0 && payload.sequence > lastSequenceRef.current + 1) {
          syncAuthoritativeState();
        }
        lastSequenceRef.current = Math.max(lastSequenceRef.current, payload.sequence);
      }

      callbacksRef.current.onMoveMade({
        ...payload,
        isEcho,
      });
    };

    const handleClockSync = (payload: any) => {
      if (!isSubscribed) return;
      callbacksRef.current.onClockSync(payload.whiteTime, payload.blackTime, payload.activeTurn);
    };

    const handlePlayerJoined = (payload: any) => {
      if (!isSubscribed) return;
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
    };

    const handlePlayerDisconnected = (payload: any) => {
      if (!isSubscribed) return;
      if (payload.role !== myRole) {
        setIsOpponentConnected(false);
        setOpponentDisconnectedAt(payload.at || Date.now());
      }
    };

    const handlePlayerReconnected = (payload: any) => {
      if (!isSubscribed) return;
      if (payload.role !== myRole) {
        setIsOpponentConnected(true);
        setOpponentDisconnectedAt(null);
      }
    };

    const handleGameOver = (payload: any) => {
      if (!isSubscribed) return;
      if (payload.gameOver) {
        setDrawOfferPendingFrom(null);
        callbacksRef.current.onGameOver(payload.gameOver);
      }
    };

    const handleChatMessage = (message: ChatMessage) => {
      if (!isSubscribed) return;
      setChatMessages((prev) => [...prev, message]);
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
    };

    const handleDrawOffered = (payload: any) => {
      if (!isSubscribed) return;
      setDrawOfferPendingFrom(payload.by);
    };

    const handleDrawDeclined = (payload: any) => {
      if (!isSubscribed) return;
      setDrawOfferPendingFrom(null);
      setDrawOfferStatus(`${payload.by === 'w' ? 'White' : 'Black'} declined the draw offer`);
      setTimeout(() => setDrawOfferStatus(null), 4000);
    };

    const handleRematchOffered = (payload: any) => {
      if (!isSubscribed) return;
      setRematchOfferPendingFrom(payload.by);
    };

    const handleRematchAccepted = (payload: any) => {
      if (!isSubscribed) return;
      setRematchOfferPendingFrom(null);
      setDrawOfferPendingFrom(null);
      if (payload.state) {
        callbacksRef.current.onStateSync(payload.state);
        setMyRole((prev) => (prev === 'w' ? 'b' : prev === 'b' ? 'w' : prev));
      }
    };

    // Register Realtime channel broadcasts
    channel
      .on('broadcast', { event: 'move:made' }, ({ payload }) => handleMoveMade(payload))
      .on('broadcast', { event: 'clock:sync' }, ({ payload }) => handleClockSync(payload))
      .on('broadcast', { event: 'player:joined' }, ({ payload }) => handlePlayerJoined(payload))
      .on('broadcast', { event: 'player:disconnected' }, ({ payload }) => handlePlayerDisconnected(payload))
      .on('broadcast', { event: 'player:reconnected' }, ({ payload }) => handlePlayerReconnected(payload))
      .on('broadcast', { event: 'game:over' }, ({ payload }) => handleGameOver(payload))
      .on('broadcast', { event: 'chat:message' }, ({ payload }) => handleChatMessage(payload))
      .on('broadcast', { event: 'draw:offered' }, ({ payload }) => handleDrawOffered(payload))
      .on('broadcast', { event: 'draw:declined' }, ({ payload }) => handleDrawDeclined(payload))
      .on('broadcast', { event: 'rematch:offered' }, ({ payload }) => handleRematchOffered(payload))
      .on('broadcast', { event: 'rematch:accepted' }, ({ payload }) => handleRematchAccepted(payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && isSubscribed) {
          setIsConnected(true);
        }
      });

    // 2. Open Server-Sent Events stream as resilient fallback
    eventSource = new EventSource(`/api/rooms/${roomId}/stream?playerId=${session.id}`);

    eventSource.onopen = () => {
      if (isSubscribed) setIsConnected(true);
    };

    eventSource.onerror = () => {
      // SSE connection error handled gracefully
    };

    eventSource.addEventListener('clock:sync', (e) => {
      try {
        handleClockSync(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('move:made', (e) => {
      try {
        handleMoveMade(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('player:joined', (e) => {
      try {
        handlePlayerJoined(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('player:disconnected', (e) => {
      try {
        handlePlayerDisconnected(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('player:reconnected', (e) => {
      try {
        handlePlayerReconnected(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('game:over', (e) => {
      try {
        handleGameOver(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('chat:message', (e) => {
      try {
        handleChatMessage(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('draw:offered', (e) => {
      try {
        handleDrawOffered(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('draw:declined', (e) => {
      try {
        handleDrawDeclined(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('rematch:offered', (e) => {
      try {
        handleRematchOffered(JSON.parse(e.data));
      } catch {}
    });

    eventSource.addEventListener('rematch:accepted', (e) => {
      try {
        handleRematchAccepted(JSON.parse(e.data));
      } catch {}
    });

    // 3. Periodic state recovery poll (guarantees moves appear even if WebSockets/SSE drop)
    const pollInterval = setInterval(async () => {
      if (!isSubscribed) return;
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.state && isSubscribed) {
          const s = data.state;
          const remoteSeq = s.moveSequence ?? 0;
          if (remoteSeq > lastSequenceRef.current) {
            lastSequenceRef.current = remoteSeq;
            callbacksRef.current.onStateSync(s);
          }
          if (s.blackPlayer && !opponentInfo) {
            setOpponentInfo({ handle: s.blackPlayer.handle, rating: s.blackPlayer.rating, avatar: s.blackPlayer.avatar });
            setIsWaitingForOpponent(false);
          }
          if (s.gameOver) {
            callbacksRef.current.onGameOver(s.gameOver);
          }
        }
      } catch {
        // Ignore network blips during polling
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      channelRef.current = null;
      clearInterval(pollInterval);
      channel.unsubscribe();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [roomId, gameId, opponentInfo]);

  // Transmit move to server room with commandId and expected sequence
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
            expectedSequence: lastSequenceRef.current,
          }),
        });

        if (!res.ok) {
          pendingCommandIdsRef.current.delete(commandId);
          const errData = await res.json().catch(() => ({}));
          console.warn('Move rejected by room server:', errData.error);
          return false;
        }

        const data = await res.json();
        const nextSequence = data.state?.moveSequence ?? (lastSequenceRef.current + 1);
        lastSequenceRef.current = nextSequence;

        // Peer-to-peer fast broadcast via active Supabase Realtime channel
        if (channelRef.current) {
          try {
            channelRef.current.send({
              type: 'broadcast',
              event: 'move:made',
              payload: {
                move: { success: true },
                lastMove: move,
                state: data.state,
                originPlayerId: session.id,
                commandId,
                sequence: nextSequence,
              },
            });
          } catch {
            // direct broadcast error handled gracefully
          }
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
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': myPlayerToken || '',
        },
        body: JSON.stringify({
          action: 'offer',
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      if (res.ok) {
        if (myRole === 'w' || myRole === 'b') {
          setDrawOfferPendingFrom(myRole);
          if (channelRef.current) {
            try {
              channelRef.current.send({
                type: 'broadcast',
                event: 'draw:offered',
                payload: { by: myRole },
              });
            } catch {}
          }
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
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': myPlayerToken || '',
          },
          body: JSON.stringify({
            action: accept ? 'accept' : 'decline',
            playerId: session.id,
            playerToken: myPlayerToken,
          }),
        });
        if (res.ok) {
          setDrawOfferPendingFrom(null);
          if (accept) {
            const over = {
              winner: 'draw' as const,
              reason: 'Draw agreed by mutual agreement',
            };
            if (channelRef.current) {
              try {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'game:over',
                  payload: { gameOver: over },
                });
              } catch {}
            }
            callbacksRef.current.onGameOver(over);
          } else {
            if (channelRef.current && myRole) {
              try {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'draw:declined',
                  payload: { by: myRole },
                });
              } catch {}
            }
          }
        }
        return res.ok;
      } catch (err) {
        console.error('Draw response error:', err);
        return false;
      }
    },
    [roomId, myPlayerToken, myRole]
  );

  // Resign match
  const resignMatch = useCallback(async () => {
    if (!roomId) return false;
    const session = getPlayerSession();

    try {
      const res = await fetch(`/api/rooms/${roomId}/resign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': myPlayerToken || '',
        },
        body: JSON.stringify({
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      if (res.ok) {
        const winnerRole: PlayerColor = myRole === 'w' ? 'b' : 'w';
        const over = {
          winner: winnerRole,
          reason: `${myRole === 'w' ? 'White' : 'Black'} resigned`,
        };
        if (channelRef.current) {
          try {
            channelRef.current.send({
              type: 'broadcast',
              event: 'game:over',
              payload: { gameOver: over },
            });
          } catch {}
        }
        callbacksRef.current.onGameOver(over);
      }
      return res.ok;
    } catch (err) {
      console.error('Resignation error:', err);
      return false;
    }
  }, [roomId, myPlayerToken, myRole]);

  // Offer Rematch
  const offerRematch = useCallback(async () => {
    if (!roomId) return false;
    const session = getPlayerSession();

    try {
      const res = await fetch(`/api/rooms/${roomId}/rematch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': myPlayerToken || '',
        },
        body: JSON.stringify({
          action: 'offer',
          playerId: session.id,
          playerToken: myPlayerToken,
        }),
      });
      if (res.ok) {
        if (myRole === 'w' || myRole === 'b') {
          setRematchOfferPendingFrom(myRole);
          if (channelRef.current) {
            try {
              channelRef.current.send({
                type: 'broadcast',
                event: 'rematch:offered',
                payload: { by: myRole },
              });
            } catch {}
          }
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
          headers: {
            'Content-Type': 'application/json',
            'x-player-token': myPlayerToken || '',
          },
          body: JSON.stringify({
            action: accept ? 'accept' : 'decline',
            playerId: session.id,
            playerToken: myPlayerToken,
          }),
        });
        if (res.ok) {
          setRematchOfferPendingFrom(null);
          const data = await res.json().catch(() => ({}));
          if (accept && data.state) {
            if (channelRef.current) {
              try {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'rematch:accepted',
                  payload: { state: data.state },
                });
              } catch {}
            }
          }
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
