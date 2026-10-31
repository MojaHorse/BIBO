'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import {
  Piece,
  Turn,
  Position,
  CheckersMove,
  CheckersGameState,
} from '@/lib/checkers-engine';
import { CheckersAdapter } from '@/lib/games/checkers-adapter';
import { PlayMode } from '@/lib/games/types';
import { useGameArena } from '@/lib/games/useGameArena';
import { useMultiplayerRoom } from '@/lib/games/useMultiplayerRoom';
import { MultiplayerModal } from '@/components/MultiplayerModal';
import { CoachCard } from '@/components/CoachCard';
import { MobileThumbBar } from '@/components/MobileThumbBar';
import { BottomSheet } from '@/components/BottomSheet';
import { ArenaPlayerStrip } from '@/components/arena/ArenaPlayerStrip';
import { PreMatchLobby } from '@/components/arena/PreMatchLobby';
import { ResignConfirmModal } from '@/components/arena/ResignConfirmModal';
import { useArenaMode } from '@/lib/arena-mode-context';
import { checkersCoach, CheckersCoachCommentary } from '@/lib/checkers-coach';
import { saveMatchToVault, VaultMatch } from '@/lib/match-vault';
import { getPlayerSession, savePlayerSession, addSessionXp } from '@/lib/session';
import { calculateElo } from '@/lib/elo';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { setActiveMatch, clearActiveMatch } from '@/lib/active-match';
import {
  RotateCcw,
  Bot,
  User,
  Crown,
  ArrowLeft,
  Flag,
  Lock,
  Users,
  Radio,
  Sparkles,
  AlertTriangle,
  Target,
  CircleDot,
} from 'lucide-react';

function CheckersContent() {
  const { isAuthenticated } = useRequireAuth();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  const modeParam = searchParams.get('mode');
  const playParam = searchParams.get('play') === 'true';

  const [roomId, setRoomId] = useState<string | null>(roomIdFromUrl);
  const matchSavedRef = useRef<boolean>(false);

  const [isMatchActive, setIsMatchActive] = useState<boolean>(() => {
    return Boolean(roomIdFromUrl || modeParam || playParam);
  });

  const { setIsInActiveMatch } = useArenaMode();
  useEffect(() => {
    setIsInActiveMatch(isMatchActive);
    return () => setIsInActiveMatch(false);
  }, [isMatchActive, setIsInActiveMatch]);

  const [mobileMoveSheetOpen, setMobileMoveSheetOpen] = useState(false);
  const [mobileCoachSheetOpen, setMobileCoachSheetOpen] = useState(false);
  const [mobileActionsSheetOpen, setMobileActionsSheetOpen] = useState(false);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);

  const mobileBoardAreaRef = useRef<HTMLDivElement>(null);
  const [mobileBoardDim, setMobileBoardDim] = useState<number>(320);

  useEffect(() => {
    const el = mobileBoardAreaRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const maxSquare = Math.floor(Math.min(rect.width, rect.height)) - 4;
        setMobileBoardDim(Math.max(180, Math.min(maxSquare, 560)));
      }
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const maxSquare = Math.floor(Math.min(width, height)) - 4;
          setMobileBoardDim(Math.max(180, Math.min(maxSquare, 560)));
        }
      }
    });
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [mandatoryJumps, setMandatoryJumps] = useState<boolean>(true);
  const [desktopTab, setDesktopTab] = useState<'moves' | 'coach' | 'settings'>('moves');

  // Coaching Engine & Hint State
  const [coachModeActive, setCoachModeActive] = useState<boolean>(true);
  const [coachCommentary, setCoachCommentary] = useState<CheckersCoachCommentary | null>({
    type: 'good',
    title: 'Checkers Coach Ready',
    message: 'Welcome to Draughts! I will analyze forced jumps, king-row defenses, and tactical promotions.',
  });
  const [loadingHint, setLoadingHint] = useState<boolean>(false);
  const [hintMove, setHintMove] = useState<{ from: Position; to: Position } | null>(null);

  // Initial Engine
  const [initialEngine] = useState<CheckersAdapter>(() => new CheckersAdapter(undefined, 'american-8x8'));

  const initialMode: PlayMode = roomIdFromUrl
    ? 'online'
    : modeParam === 'local' || modeParam === 'pass-and-play'
    ? 'local'
    : 'bot';

  // BIBO Universal Game Arena Hook
  const arena = useGameArena<CheckersMove, Piece[][], CheckersGameState>({
    initialEngine,
    defaultMinutes: 5,
    initialPlayMode: initialMode,
    botColor: 'b',
    onSpecialMove: (specialType) => {
      if (specialType === 'king') {
        arena.triggerAlert('King Crowned! Can now move and jump backwards.');
      } else if (specialType === 'multiJump') {
        arena.triggerAlert('Mandatory Multi-Jump! Continue capturing with the active piece.');
      }
    },
  });

  const adapter = arena.engine as CheckersAdapter;
  const activeMultiJumpPiece = arena.engineState?.activeMultiJumpPiece;

  // Real-Time P2P Multiplayer Room Hook
  const mp = useMultiplayerRoom({
    roomId,
    gameId: 'checkers',
    onStateSync: (s) => {
      try {
        if (s.fen) {
          const raw = typeof s.fen === 'string' ? JSON.parse(s.fen) : s.fen;
          const nextEngine = new CheckersAdapter(raw, 'american-8x8');
          arena.setEngine(nextEngine);
        }
        if (s.whiteTime !== undefined && s.blackTime !== undefined) {
          arena.setWhiteTime(s.whiteTime);
          arena.setBlackTime(s.blackTime);
        }
        if (s.gameActive !== undefined) {
          arena.setGameActive(s.gameActive);
        }
        if (s.history && Array.isArray(s.history)) {
          arena.setHistory(s.history);
        }
        if (s.lastMove) {
          arena.setLastMove(s.lastMove);
        }
      } catch {
        // ignore
      }
    },
    onClockSync: (whiteTime, blackTime) => {
      arena.setWhiteTime(whiteTime);
      arena.setBlackTime(blackTime);
    },
    onMoveMade: (payload) => {
      if (payload.isEcho) {
        return;
      }
      const ok = arena.executeMove(payload.lastMove, true);
      if (!ok && payload.state?.fen) {
        try {
          const raw = typeof payload.state.fen === 'string' ? JSON.parse(payload.state.fen) : payload.state.fen;
          arena.setEngine(new CheckersAdapter(raw, 'american-8x8'));
        } catch {}
      }
      if (payload.state) {
        if (payload.state.whiteTime !== undefined && payload.state.blackTime !== undefined) {
          arena.setWhiteTime(payload.state.whiteTime);
          arena.setBlackTime(payload.state.blackTime);
        }
        if (payload.state.gameActive !== undefined) {
          arena.setGameActive(payload.state.gameActive);
        }
        if (payload.state.history && Array.isArray(payload.state.history)) {
          arena.setHistory(payload.state.history);
        }
        if (payload.lastMove) {
          arena.setLastMove(payload.lastMove);
        }
      }
    },
    onGameOver: (over) => {
      arena.triggerAlert(`Match Concluded: ${over.reason}`);
      arena.setGameOver({
        isOver: true,
        winner: (over.winner === 'w' || over.winner === 'b') ? over.winner : 'draw',
        headline: over.reason || (over.winner === 'draw' ? 'Match Drawn' : `${over.winner === 'w' ? 'White' : 'Black'} Wins`),
        subdeck: 'Match concluded.',
      });
      arena.setGameActive(false);
      clearActiveMatch();
    },
  });

  useEffect(() => {
    if (mp.isMultiplayer) {
      arena.setPlayMode('online');
      if (mp.myRole === 'b') {
        setOrientation('b');
      }
    }
  }, [mp.isMultiplayer, mp.myRole]);

  // Sync active match session for global reconnection banner (ONLINE HUMAN MATCHES ONLY)
  useEffect(() => {
    if (arena.gameOver || arena.vsBot || !roomId || !mp.isMultiplayer || !arena.gameActive) {
      clearActiveMatch();
      return;
    }
    setActiveMatch({
      gameId: 'checkers',
      roomId: roomId,
      isOnline: true,
      role: mp.myRole || undefined,
      opponentHandle: mp.opponentInfo?.handle || 'Opponent',
      opponentRating: mp.opponentInfo?.rating || 1200,
      timeControlMinutes: arena.timeControlMinutes,
      url: `/play/checkers?room=${roomId}`,
      startedAt: Date.now(),
    });
  }, [
    arena.gameActive,
    arena.gameOver,
    roomId,
    mp.myRole,
    mp.opponentInfo,
    arena.vsBot,
    arena.timeControlMinutes,
    mp.isMultiplayer,
  ]);

  const handleRoomCreated = (newRoomId: string) => {
    setRoomId(newRoomId);
    window.history.pushState(null, '', `?room=${newRoomId}`);
  };

  const handleExitToLobby = () => {
    clearActiveMatch();
    arena.cancelPendingBot();
    setRoomId(null);
    setIsMatchActive(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleUserMove = async (from: Position, to: Position) => {
    if (arena.playMode === 'bot' && arena.turn === arena.botColor) return;

    if (arena.playMode === 'online') {
      if (!mp.isMyTurn(arena.turn)) {
        arena.triggerAlert('Not your turn! Waiting for opponent.');
        return;
      }
      const engineBefore = adapter.getInternalEngine().clone();
      const success = arena.executeMove({ from, to });
      if (!success) return;

      setHintMove(null);

      mp.sendMove({ from, to }).then((ok) => {
        if (!ok) {
          arena.triggerAlert('Move rejected by room server.');
        }
      });

      if (coachModeActive) {
        const commentary = checkersCoach.analyzeMove(
          engineBefore,
          adapter.getInternalEngine(),
          { from, to },
          arena.history.length + 1
        );
        setCoachCommentary(commentary);
      }
      return;
    }

    const engineBefore = adapter.getInternalEngine().clone();
    const success = arena.executeMove({ from, to });
    if (!success) return;

    setHintMove(null);

    if (coachModeActive) {
      const commentary = checkersCoach.analyzeMove(
        engineBefore,
        adapter.getInternalEngine(),
        { from, to },
        arena.history.length + 1
      );
      setCoachCommentary(commentary);
    }
  };

  const handleSetMandatoryJumps = (val: boolean) => {
    if (arena.isMatchInProgress) {
      arena.triggerAlert('Rule is locked once match has begun. Restart to change.');
      return;
    }
    setMandatoryJumps(val);
    adapter.setMandatoryJumps(val);
    arena.resetGame(5);
    setHintMove(null);
  };

  const handleAskHint = () => {
    setLoadingHint(true);
    setTimeout(() => {
      const hint = checkersCoach.getHint(adapter.getInternalEngine());
      setCoachCommentary(hint);
      if (hint.suggestedMove) {
        setHintMove(hint.suggestedMove);
      }
      setLoadingHint(false);
    }, 200);
  };

  const handleFlip = () => {
    setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const topColor: Turn = orientation === 'w' ? 'b' : 'w';
  const bottomColor: Turn = orientation === 'w' ? 'w' : 'b';

  // Match conclusion, vault archiving, and XP award
  useEffect(() => {
    if (!arena.gameOver || matchSavedRef.current || arena.history.length === 0) return;
    matchSavedRef.current = true;
    clearActiveMatch();

    const session = getPlayerSession();
    const isWhiteWinner = arena.gameOver.winner === 'w';
    const isBlackWinner = arena.gameOver.winner === 'b';
    const isDraw = arena.gameOver.winner === 'draw' || !arena.gameOver.winner;

    const opponentId =
      arena.playMode === 'bot'
        ? `bot_checkers_${arena.botDifficulty || 'medium'}`
        : arena.playMode === 'local'
        ? 'local_p2'
        : 'opponent';
    const opponentLabel =
      arena.playMode === 'bot'
        ? `Bot (${arena.botDifficulty.toUpperCase()})`
        : arena.playMode === 'local'
        ? 'Guest Player'
        : (mp.opponentInfo?.handle || 'Opponent');

    const whitePlayerId = orientation === 'w' ? session.id : opponentId;
    const blackPlayerId = orientation === 'b' ? session.id : opponentId;

    const winnerId = isWhiteWinner ? whitePlayerId : isBlackWinner ? blackPlayerId : null;
    const isUserWinner = winnerId === session.id;

    const earnedXp = isUserWinner ? 25 : isDraw ? 10 : 5;
    addSessionXp(earnedXp);

    const isRated = arena.playMode === 'bot' || Boolean(roomId);
    const playerRating = session.checkersRating || 1200;
    const opponentRating =
      arena.playMode === 'bot'
        ? (arena.botDifficulty === 'easy' ? 450 : arena.botDifficulty === 'hard' ? 2000 : 1200)
        : (mp.opponentInfo?.rating || 1200);

    const userScore: 1 | 0.5 | 0 = isUserWinner ? 1 : isDraw ? 0.5 : 0;
    const eloCalc = calculateElo(playerRating, opponentRating, userScore);
    const ratingDelta = Math.abs(eloCalc.deltaA);
    const newCheckersRating = eloCalc.newRatingA;

    if (isRated && session.id && !session.id.startsWith('guest_')) {
      savePlayerSession({ checkersRating: newCheckersRating });
    }

    const matchPayload: Omit<VaultMatch, 'synced'> = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameId: 'checkers',
      variant: 'american-8x8',
      whiteId: whitePlayerId,
      blackId: blackPlayerId,
      whiteHandle: orientation === 'w' ? session.handle : opponentLabel,
      blackHandle: orientation === 'b' ? session.handle : opponentLabel,
      timeControl: `${arena.timeControlMinutes}+0`,
      winnerId,
      resultType: arena.gameOver.headline,
      pgn: arena.history.join(' '),
      finalFen: JSON.stringify(adapter.getState().board),
      rated: isRated,
      ratingDelta,
      createdAt: new Date().toISOString(),
    };

    saveMatchToVault(matchPayload);
  }, [arena.gameOver, arena.history, orientation, arena.playMode, arena.botDifficulty, arena.timeControlMinutes, roomId, mp.opponentInfo, adapter]);

  // Identify pieces belonging to the human player that currently have a mandatory capture
  const userCapturePieces = React.useMemo(() => {
    if (arena.turn !== bottomColor) return [];
    const list: Position[] = [];
    for (const m of arena.legalMoves) {
      if (m.captured && !list.some((p) => p.row === m.from.row && p.col === m.from.col)) {
        list.push(m.from);
      }
    }
    return list;
  }, [arena.turn, bottomColor, arena.legalMoves]);

  const formattedHistory = React.useMemo(() => {
    const rounds: { round: number; white: string; black: string }[] = [];
    for (let i = 0; i < arena.history.length; i += 2) {
      rounds.push({
        round: Math.floor(i / 2) + 1,
        white: arena.history[i] || '',
        black: arena.history[i + 1] || '',
      });
    }
    return rounds;
  }, [arena.history]);

  const desktopBoardSize = 'min(calc(100dvh - 210px), calc(100vw - 420px), 680px)';
  const mobileBoardSize = 'min(calc(100vw - 16px), calc(100dvh - 240px), 720px)';

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-bold text-zinc-400">Authenticating Checkers arena session...</p>
      </div>
    );
  }

  if (!isMatchActive) {
    return (
      <>
        <PreMatchLobby
          gameId="checkers"
          title="Checkers Arena"
          subtitle="American 8x8"
          tagline="Rapid diagonal strikes, mandatory multi-jumps, and king crowning promotions. Pure positional calculation."
          icon={Crown}
          accentColor="#f59e0b"
          userRating={arena.session.rating || 1200}
          rules={[
            { title: 'Mandatory Captures', desc: 'If a jump is available, it must be taken. Multi-jumps continue in one turn.' },
            { title: 'King Crowning', desc: 'Reaching the opposite back rank crowns your piece, allowing backward slides.' },
            { title: 'Victory Conditions', desc: 'Capture all opposing pieces or trap all enemy moves completely.' },
          ]}
          botTiers={[
            { id: 'easy', label: 'Novice', desc: 'Introductory sparring with simple slides' },
            { id: 'medium', label: 'Tactical', desc: 'Active hunter seeking king promotions' },
            { id: 'hard', label: 'Master', desc: 'Minimax engine with multi-jump foresight' },
          ]}
          timePresets={[
            { mins: 3, label: '3 min', format: 'Blitz Draughts', badge: 'Fast' },
            { mins: 5, label: '5 min', format: 'Standard 8x8', badge: 'Popular' },
            { mins: 10, label: '10 min', format: 'Classic Match', badge: 'Strategy' },
          ]}
          onStartMatch={({ mode, botDifficulty, timeControlMinutes }) => {
            if (mode === 'bot') {
              arena.setPlayMode('bot');
              arena.setBotDifficulty(botDifficulty as 'easy' | 'medium' | 'hard');
            } else if (mode === 'pass-and-play') {
              arena.setPlayMode('local');
            }
            arena.resetGame(timeControlMinutes);
            setHintMove(null);
            matchSavedRef.current = false;
            setIsMatchActive(true);
          }}
          onOpenMultiplayerModal={() => mp.setMultiplayerModalOpen(true)}
        />
        <MultiplayerModal
          isOpen={mp.multiplayerModalOpen}
          onClose={() => mp.setMultiplayerModalOpen(false)}
          gameId="checkers"
          gameTitle="BIBO Checkers"
          currentUser={{ id: arena.session.handle, handle: arena.session.handle }}
          onRoomCreated={(rId) => {
            setRoomId(rId);
            mp.setMultiplayerModalOpen(false);
            setIsMatchActive(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 select-none pb-6 md:pb-0">
      {/* 1. Tailored Desktop Workstation View (>= 768px) */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 w-full gap-2">
        {/* Precision Toolbar */}
        <div className="bg-[#16171b] border border-white/[0.06] rounded-xl px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 h-9">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleExitToLobby}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition text-xs font-bold shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>LOBBY</span>
            </button>

            <span className="text-zinc-600">|</span>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-pulse shrink-0" />
              <h1 className="font-black text-sm text-white tracking-wide truncate">
                BIBO CHECKERS · 8X8 AMERICAN DRAUGHTS
              </h1>
            </div>

            {arena.isBotThinking && (
              <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] font-bold animate-pulse shrink-0">
                <Bot className="w-3.5 h-3.5 text-[#38bdf8]" />
                BOT CALCULATING...
              </span>
            )}

            {mp.isMultiplayer && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>ROOM {roomId}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <button
              onClick={() => mp.setMultiplayerModalOpen(true)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                mp.isMultiplayer
                  ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40'
                  : 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/25'
              }`}
            >
              {mp.isMultiplayer ? <Radio className="w-3 h-3 animate-pulse" /> : <Users className="w-3 h-3" />}
              <span>{mp.isMultiplayer ? (mp.isWaitingForOpponent ? 'Waiting...' : 'Live Match') : 'Play Online'}</span>
            </button>

            <button
              onClick={handleFlip}
              className="px-2 py-1 rounded bg-[#1c1d22] text-zinc-300 hover:text-white border border-white/[0.08] text-[10px] font-bold uppercase transition cursor-pointer"
            >
              Flip Board
            </button>
            <span className="text-zinc-600">|</span>
            <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded uppercase">
              Turn: {arena.turn === 'w' ? 'White' : 'Black'}
            </span>
          </div>
        </div>

        {/* Main Workstation 2-Column Grid */}
        <div className="flex flex-1 min-h-0 w-full gap-4 items-stretch justify-center">
          {/* Left Column: Board Area */}
          <div className="flex flex-col gap-1.5 items-center justify-between shrink-0 h-full">
            {/* Top Player Strip */}
            <div
              style={{ width: desktopBoardSize }}
              className="flex items-center justify-between px-3 py-1 rounded-xl bg-[#16171b] border border-white/[0.06] text-xs h-8 shrink-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full shadow ${
                    topColor === 'w'
                      ? 'bg-slate-200 border border-amber-300'
                      : 'bg-zinc-900 border border-red-500'
                  }`}
                />
                <span className="font-bold text-white">
                  {mp.isMultiplayer
                    ? mp.opponentInfo
                      ? `${mp.opponentInfo.handle} (${mp.opponentInfo.rating})`
                      : 'Awaiting Opponent...'
                    : arena.vsBot
                    ? `Bot (${arena.botDifficulty})`
                    : topColor === 'w'
                    ? 'White'
                    : 'Black'}
                </span>
                {arena.turn === topColor && !arena.gameOver && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-zinc-500 text-[10px]">
                  CAPTURES: {topColor === 'w' ? adapter.getState().capturedW : adapter.getState().capturedB}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/40 text-white font-bold text-xs">
                  {formatTimer(topColor === 'w' ? arena.whiteTime : arena.blackTime)}
                </span>
              </div>
            </div>

            {/* Board */}
            <div style={{ width: desktopBoardSize, height: desktopBoardSize }} className="aspect-square shrink-0">
              <CheckersBoard
                board={arena.board}
                turn={arena.turn}
                orientation={orientation}
                onMove={handleUserMove}
                lastMove={arena.lastMove ? { from: arena.lastMove.from, to: arena.lastMove.to } : null}
                activeMultiJumpPiece={activeMultiJumpPiece}
                legalMoves={arena.legalMoves}
                disabled={Boolean(arena.gameOver) || arena.isBotThinking || (arena.playMode === 'online' && !mp.isMyTurn(arena.turn))}
                onMandatoryJumpAlert={(msg: string) => arena.triggerAlert(msg)}
                hintMove={hintMove}
              />
            </div>

            {/* Directive Alert Banner */}
            <div
              style={{ width: desktopBoardSize }}
              className={`flex items-center justify-between px-3 py-1 rounded-xl border text-xs font-bold shadow-md transition-all h-8 shrink-0 ${
                arena.tacticalAlert
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                  : userCapturePieces.length > 0
                  ? 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse'
                  : 'bg-[#16171b] border-white/[0.08] text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="flex items-center justify-center shrink-0">
                  {arena.tacticalAlert ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : userCapturePieces.length > 0 ? (
                    <Target className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <CircleDot className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </span>
                <span className="truncate">
                  {arena.tacticalAlert ||
                    (userCapturePieces.length > 0
                      ? 'Mandatory Capture Active! You must jump opponent pieces.'
                      : activeMultiJumpPiece
                      ? 'Multi-Jump Locked! Continue jumping with active piece.'
                      : 'Control the dark center squares and advance with backup.')}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 shrink-0">
                {userCapturePieces.length > 0 ? 'Jump Required' : 'Standard'}
              </span>
            </div>

            {/* Bottom Player Strip */}
            <div
              style={{ width: desktopBoardSize }}
              className="flex items-center justify-between px-3 py-1 rounded-xl bg-[#16171b] border border-white/[0.06] text-xs h-8 shrink-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full shadow ${
                    bottomColor === 'w'
                      ? 'bg-slate-200 border border-amber-300'
                      : 'bg-zinc-900 border border-red-500'
                  }`}
                />
                <span className="font-bold text-white">{arena.session.handle} (You)</span>
                {arena.turn === bottomColor && !arena.gameOver && (
                  <span className="px-1.5 py-0.2 rounded bg-[#22c55e]/20 text-[#22c55e] text-[9px] font-bold animate-pulse">
                    YOUR TURN
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-zinc-500 text-[10px]">
                  CAPTURES: {bottomColor === 'w' ? adapter.getState().capturedW : adapter.getState().capturedB}
                </span>
                <span className="px-2 py-0.5 rounded bg-black/40 text-white font-bold text-xs">
                  {formatTimer(bottomColor === 'w' ? arena.whiteTime : arena.blackTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls Column: Clean Tabbed Utility Panel */}
          <div className="flex flex-1 min-w-[280px] max-w-[420px] flex-col gap-2 overflow-y-auto pr-1 w-full h-full min-h-0">
            {/* Segmented Tab Control */}
            <div className="flex items-center p-1 rounded-xl bg-[#16171b] border border-white/[0.08] gap-1 shrink-0">
              <button
                onClick={() => setDesktopTab('moves')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'moves'
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Moves & Match</span>
                {arena.history.length > 0 && (
                  <span className="text-[10px] opacity-80 font-mono">({arena.history.length})</span>
                )}
              </button>

              <button
                onClick={() => setDesktopTab('coach')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'coach'
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Coach</span>
                {coachModeActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>

              <button
                onClick={() => setDesktopTab('settings')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'settings'
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Rules & Mode</span>
              </button>
            </div>

            {/* Tab 1: Moves & Match Controls */}
            {desktopTab === 'moves' && (
              <div className="flex flex-col gap-2 flex-1 min-h-0 animate-in fade-in">
                {/* Move Log */}
                <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-2 shadow-lg flex-1 min-h-[160px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                    <span className="text-xs font-bold text-zinc-300">Move Log ({arena.history.length} ply)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Turn: {arena.turn === 'w' ? 'White' : 'Black'}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[220px] no-scrollbar">
                    {formattedHistory.length === 0 ? (
                      <span className="text-xs text-zinc-500 italic">Game ready · First move awaits</span>
                    ) : (
                      <div className="flex flex-col gap-1 text-xs font-mono">
                        {formattedHistory.map((r, idx) => (
                          <div
                            key={r.round}
                            className={`grid grid-cols-[24px_1fr_1fr] gap-2 items-center px-2 py-1 rounded transition ${
                              idx === formattedHistory.length - 1 ? 'bg-white/10 font-bold' : 'text-zinc-300'
                            }`}
                          >
                            <span className="text-zinc-500 font-bold text-[10px]">{r.round}.</span>
                            <span className="truncate flex items-center gap-1.5 text-zinc-200">
                              <span className="w-2 h-2 rounded-full bg-slate-200 shadow-sm shrink-0 inline-block" />
                              <span className="truncate">{r.white || '—'}</span>
                            </span>
                            <span className="truncate flex items-center gap-1.5 text-zinc-400">
                              <span className="w-2 h-2 rounded-full bg-zinc-900 border border-red-500 shadow-sm shrink-0 inline-block" />
                              <span className="truncate">{r.black || '—'}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleFlip}
                    className="py-2 px-3 rounded-xl bg-[#222226] hover:bg-[#2a2a30] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>
                  <button
                    onClick={() => {
                      clearActiveMatch();
                      arena.resetGame(5);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#222226] hover:bg-[#2a2a30] text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/[0.08]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restart</span>
                  </button>
                  <button
                    onClick={() => arena.resign('w')}
                    disabled={Boolean(arena.gameOver)}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Checkers Coach */}
            {desktopTab === 'coach' && (
              <div className="flex flex-col gap-2 flex-1 min-h-0 animate-in fade-in">
                <CoachCard
                  title="CHECKERS COACH"
                  subtitle="Tactical Draughts Advisor"
                  commentary={coachCommentary}
                  onAskHint={handleAskHint}
                  onTakeBack={arena.canTakeBack ? arena.takeBack : undefined}
                  loadingHint={loadingHint}
                  coachModeActive={coachModeActive}
                  onToggleCoachMode={() => setCoachModeActive(!coachModeActive)}
                />
              </div>
            )}

            {/* Tab 3: Rules & Settings */}
            {desktopTab === 'settings' && (
              <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-3 shadow-lg flex-1 min-h-0 animate-in fade-in">
                {/* Mandatory Capture Toggle */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-200 font-bold text-xs">Capture Rule</span>
                      {arena.isMatchInProgress && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {mandatoryJumps ? 'Mandatory Jump (Official)' : 'Optional Jumps (Casual)'}
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 p-1 bg-[#121316] border border-white/[0.08] rounded-xl gap-1 text-[11px] font-bold ${
                    arena.isMatchInProgress ? 'opacity-65' : ''
                  }`}>
                    <button
                      disabled={arena.isMatchInProgress}
                      onClick={() => handleSetMandatoryJumps(true)}
                      className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                        arena.isMatchInProgress ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        mandatoryJumps
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Forced Jump</span>
                      {mandatoryJumps && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>

                    <button
                      disabled={arena.isMatchInProgress}
                      onClick={() => handleSetMandatoryJumps(false)}
                      className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                        arena.isMatchInProgress ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        !mandatoryJumps
                          ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>Optional Jump</span>
                      {!mandatoryJumps && <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />}
                    </button>
                  </div>
                </div>

                {/* Bot Mode & Difficulty */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => arena.setVsBot(!arena.vsBot)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      arena.vsBot ? 'bg-[#38bdf8] text-black font-bold' : 'bg-white/10 text-white'
                    }`}
                  >
                    {arena.vsBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{arena.vsBot ? 'VS BOT' : 'LOCAL'}</span>
                  </button>

                  {arena.vsBot && (
                    <div className="flex items-center gap-0.5 bg-[#1c1d22] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => arena.setBotDifficulty(d)}
                          className={`px-2 py-0.5 rounded-md font-bold uppercase transition cursor-pointer ${
                            arena.botDifficulty === d ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Unified Flexible Mobile Arena View (< 768px) */}
      <div className="flex md:hidden flex-col h-full w-full justify-between items-center select-none overflow-hidden max-w-lg mx-auto px-2 py-1 gap-1">
        {/* Mobile Toolbar */}
        <div className="bg-[#16171b] border border-white/[0.08] rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 text-xs shrink-0 h-8 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={handleExitToLobby}
              title="Return to Game Lobby"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#222226] border border-white/[0.08] text-[10px] font-bold text-zinc-300 hover:text-white shrink-0 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3 text-[#FF6A00]" />
              <span>GAMES</span>
            </button>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse shrink-0" />
            <h1 className="font-black text-xs text-white tracking-wide truncate">
              CHECKERS
            </h1>
            {arena.isBotThinking && (
              <span className="flex items-center gap-1 text-zinc-300 font-mono text-[9px] font-bold animate-pulse shrink-0">
                <Bot className="w-3 h-3 text-[#38bdf8]" />
                THINKING...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => mp.setMultiplayerModalOpen(true)}
              className="px-2 py-0.5 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
            >
              <Users className="w-2.5 h-2.5" />
              <span>{mp.isMultiplayer ? 'Online' : 'Play'}</span>
            </button>
            <button
              onClick={() => arena.resetGame(5)}
              className="px-2 py-0.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-black text-[10px] font-extrabold cursor-pointer active:scale-95 transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Top Player Card Mobile */}
        <ArenaPlayerStrip
          name={
            mp.isMultiplayer
              ? mp.opponentInfo
                ? mp.opponentInfo.handle
                : 'Awaiting Opponent...'
              : arena.vsBot
              ? `Bot (${arena.botDifficulty})`
              : topColor === 'w'
              ? 'White'
              : 'Black'
          }
          colorRole={topColor === 'w' ? 'white' : 'black'}
          rating={mp.isMultiplayer ? mp.opponentInfo?.rating : arena.vsBot ? undefined : 1200}
          badge={arena.vsBot ? `BOT · ${arena.botDifficulty.toUpperCase()}` : undefined}
          isActive={arena.turn === topColor && !arena.gameOver}
          timeLeft={topColor === 'w' ? arena.whiteTime : arena.blackTime}
          scoreOrCaptured={`+${topColor === 'w' ? adapter.getState().capturedW : adapter.getState().capturedB}`}
          isThinking={arena.isBotThinking && arena.turn === topColor}
          containerWidth={mobileBoardDim}
        />

        {/* Mobile Directive Alert Banner (Compact) */}
        <div
          style={{ width: mobileBoardDim, maxWidth: '100%' }}
          className={`flex items-center justify-between px-2.5 py-0.5 rounded-lg border text-[10px] font-bold shadow shrink-0 transition-all ${
            arena.tacticalAlert
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
              : userCapturePieces.length > 0
              ? 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse'
              : 'bg-[#16171b] border-white/[0.08] text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {arena.tacticalAlert ? (
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            ) : userCapturePieces.length > 0 ? (
              <Target className="w-3 h-3 text-red-400 shrink-0" />
            ) : (
              <CircleDot className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            <span className="truncate">
              {arena.tacticalAlert ||
                (userCapturePieces.length > 0
                  ? 'Mandatory Capture Active! You must jump.'
                  : 'Slide diagonally along dark squares.')}
            </span>
          </div>
          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/10 text-zinc-400 shrink-0">
            {arena.turn === 'w' ? 'White' : 'Black'}
          </span>
        </div>

        {/* Board Container: Automatically scales to available viewport height without scroll */}
        <div
          ref={mobileBoardAreaRef}
          className="flex-1 min-h-0 min-w-0 w-full flex items-center justify-center p-0.5 overflow-hidden"
        >
          <div
            style={{ width: mobileBoardDim, height: mobileBoardDim }}
            className="aspect-square shrink-0 transition-all duration-100"
          >
            <CheckersBoard
              board={arena.board}
              turn={arena.turn}
              orientation={orientation}
              onMove={handleUserMove}
              lastMove={arena.lastMove ? { from: arena.lastMove.from, to: arena.lastMove.to } : null}
              activeMultiJumpPiece={activeMultiJumpPiece}
              legalMoves={arena.legalMoves}
              disabled={Boolean(arena.gameOver) || arena.isBotThinking || (arena.playMode === 'online' && !mp.isMyTurn(arena.turn))}
              onMandatoryJumpAlert={(msg: string) => arena.triggerAlert(msg)}
              hintMove={hintMove}
            />
          </div>
        </div>

        {/* Bottom Player Card Mobile */}
        <ArenaPlayerStrip
          name={`${arena.session.handle} (You)`}
          colorRole={bottomColor === 'w' ? 'white' : 'black'}
          rating={arena.session.rating || 1200}
          isVerifiedHuman={Boolean(getPlayerSession().isVerifiedHuman)}
          isActive={arena.turn === bottomColor && !arena.gameOver}
          timeLeft={bottomColor === 'w' ? arena.whiteTime : arena.blackTime}
          scoreOrCaptured={`+${bottomColor === 'w' ? adapter.getState().capturedW : adapter.getState().capturedB}`}
          containerWidth={mobileBoardDim}
        />

        {/* 4-Slot Mobile Thumb Bar (Coach | Moves | Flip | Actions) with safe area padding */}
        <div
          style={{ width: mobileBoardDim, maxWidth: '100%' }}
          className="shrink-0 w-full pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-0.5"
        >
          <MobileThumbBar
            onFlip={handleFlip}
            onOpenCoach={() => setMobileCoachSheetOpen(true)}
            hasCoach={true}
            coachHasTip={Boolean(coachCommentary)}
            onOpenScorebook={() => setMobileMoveSheetOpen(true)}
            moveCount={arena.history.length}
            onOpenActions={() => setMobileActionsSheetOpen(true)}
            onNewGame={() => {
              matchSavedRef.current = false;
              arena.resetGame(5);
            }}
            gameActive={arena.isMatchInProgress}
            gameOver={Boolean(arena.gameOver)}
          />
        </div>

        {/* Bottom Sheet: Move Scorebook Archive */}
        <BottomSheet
          isOpen={mobileMoveSheetOpen}
          onClose={() => setMobileMoveSheetOpen(false)}
          title="Checkers Scorebook"
          subtitle={`Match ply ${arena.history.length} · ${formattedHistory.length} rounds`}
        >
          <div className="flex flex-col gap-2 py-1 max-h-[60vh] overflow-y-auto">
            {formattedHistory.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">No moves recorded yet.</div>
            ) : (
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {formattedHistory.map((r) => (
                  <div key={r.round} className="flex items-center py-2 px-3 text-xs font-mono justify-between">
                    <span className="text-zinc-500 w-8">{r.round}.</span>
                    <span className="font-bold text-white flex-1">{r.white}</span>
                    <span className="font-bold text-zinc-300 flex-1">{r.black}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>

        {/* Bottom Sheet: Checkers Coach Intel */}
        <BottomSheet
          isOpen={mobileCoachSheetOpen}
          onClose={() => setMobileCoachSheetOpen(false)}
          title="Checkers Tactician Coach"
          subtitle="Real-time advice on king-row control & forced captures"
        >
          <div className="flex flex-col gap-3 py-1">
            <CoachCard
              title="CHECKERS COACH"
              subtitle="Tactical Draughts Advisor"
              commentary={coachCommentary}
              onAskHint={() => {
                handleAskHint();
                setMobileCoachSheetOpen(false);
              }}
              onTakeBack={arena.canTakeBack ? () => {
                arena.takeBack();
                setMobileCoachSheetOpen(false);
              } : undefined}
              loadingHint={loadingHint}
              coachModeActive={coachModeActive}
              onToggleCoachMode={() => setCoachModeActive(!coachModeActive)}
            />
          </div>
        </BottomSheet>

        {/* Bottom Sheet: Checkers Actions & Settings */}
        <BottomSheet
          isOpen={mobileActionsSheetOpen}
          onClose={() => setMobileActionsSheetOpen(false)}
          title="Actions & Settings"
          subtitle="Mandatory jump rule, bot difficulty & surrender"
        >
          <div className="flex flex-col gap-3 py-1">
            {/* Resign Button */}
            {!arena.gameOver && (
              <button
                onClick={() => {
                  setMobileActionsSheetOpen(false);
                  setResignConfirmOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Flag className="w-4 h-4 text-red-500" />
                <span>Resign Match</span>
              </button>
            )}

            {/* Mandatory Capture Rule */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1c1d22] border border-white/[0.06]">
              <span className="text-xs font-bold text-white">Capture Rule</span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  disabled={arena.isMatchInProgress}
                  onClick={() => handleSetMandatoryJumps(true)}
                  className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                    mandatoryJumps
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 bg-white/5'
                  }`}
                >
                  <span>Forced Jump (Official)</span>
                </button>
                <button
                  disabled={arena.isMatchInProgress}
                  onClick={() => handleSetMandatoryJumps(false)}
                  className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                    !mandatoryJumps
                      ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40'
                      : 'text-zinc-400 bg-white/5'
                  }`}
                >
                  <span>Casual (Optional)</span>
                </button>
              </div>
            </div>

            {/* Bot Difficulty */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1d22] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-xs font-bold text-white">Bot Difficulty</span>
              </div>
              <div className="flex items-center gap-1">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => arena.setBotDifficulty(d)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                      arena.botDifficulty === d ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Return to Lobby */}
            <Link
              href="/play"
              className="w-full py-2 px-3 rounded-xl bg-[#222226] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF6A00]" />
              <span>Switch Game / Return to Lobby</span>
            </Link>
          </div>
        </BottomSheet>

        {/* Resign Confirmation Modal */}
        <ResignConfirmModal
          isOpen={resignConfirmOpen}
          onClose={() => setResignConfirmOpen(false)}
          onConfirm={() => arena.resign('w')}
        />
      </div>

      {/* Game Over Modal */}
      {arena.gameOver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#141624] border border-white/20 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#f59e0b] px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              CHECKERS MATCH COMPLETE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {arena.gameOver.headline}
            </h2>
            <p className="text-xs text-zinc-300 font-medium">
              {arena.gameOver.subdeck}
            </p>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{arena.gameOver.winner === orientation ? 25 : arena.gameOver.winner === 'draw' ? 10 : 5} XP Earned</span>
            </div>
            <button
              onClick={() => {
                matchSavedRef.current = false;
                arena.resetGame(5);
              }}
              className="w-full mt-2 py-2.5 px-4 rounded-xl btn-primary-red text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
            <button
              onClick={handleExitToLobby}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>RETURN TO CHECKERS LOBBY</span>
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Invite Modal */}
      <MultiplayerModal
        isOpen={mp.multiplayerModalOpen}
        onClose={() => mp.setMultiplayerModalOpen(false)}
        gameId="checkers"
        gameTitle="Checkers"
        currentUser={{ id: arena.session.handle, handle: arena.session.handle }}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
}

export default function CheckersPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-12 text-center text-zinc-500 font-mono text-xs">Loading Checkers Arena...</div>}>
        <CheckersContent />
      </Suspense>
    </AppShell>
  );
}
