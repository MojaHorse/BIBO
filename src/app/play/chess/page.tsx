'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Square, PieceSymbol, Color, Chess } from 'chess.js';
import { ChessAdapter, ChessMoveInput } from '@/lib/games/chess-adapter';
import { PlayMode } from '@/lib/games/types';
import { useGameArena } from '@/lib/games/useGameArena';
import { useMultiplayerRoom } from '@/lib/games/useMultiplayerRoom';
import { MultiplayerModal } from '@/components/MultiplayerModal';
import { GameReviewModal } from '@/components/GameReviewModal';
import { stockfishClient, GameReviewReport, EvalResult } from '@/lib/stockfish';
import { chessCoach, CoachCommentary } from '@/lib/chess-coach';
import { getCapturedPieces } from '@/lib/chess-utils';
import { getPlayerSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useArenaMode } from '@/lib/arena-mode-context';
import { saveMatchToVault } from '@/lib/match-vault';
import { setActiveMatch, clearActiveMatch } from '@/lib/active-match';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { PlayDesktopView, PlayViewSharedProps } from '@/components/arena/PlayDesktopView';
import { PlayMobileView } from '@/components/arena/PlayMobileView';
import { PreMatchLobby } from '@/components/arena/PreMatchLobby';
import {
  RotateCcw,
  Eye,
  X,
  ArrowLeft,
  Swords,
} from 'lucide-react';

function ChessArenaContent() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  const modeParam = searchParams.get('mode');
  const difficultyParam = (searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';
  const minsParam = parseInt(searchParams.get('mins') || '5', 10);
  const playParam = searchParams.get('play') === 'true';

  const [isMatchActive, setIsMatchActive] = useState<boolean>(() => {
    return Boolean(roomIdFromUrl || modeParam || playParam);
  });

  const { setIsInActiveMatch } = useArenaMode();

  useEffect(() => {
    setIsInActiveMatch(isMatchActive);
    return () => setIsInActiveMatch(false);
  }, [isMatchActive, setIsInActiveMatch]);

  const [roomId, setRoomId] = useState<string | null>(roomIdFromUrl);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sound & Coach Engine State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [coachCommentary, setCoachCommentary] = useState<CoachCommentary | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintSquares, setHintSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [coachModeActive, setCoachModeActive] = useState(true);

  // Live Stockfish Evaluation
  const [showEvalBar, setShowEvalBar] = useState(true);
  const [evalResult, setEvalResult] = useState<EvalResult>({
    score: 0,
    isMate: false,
    depth: 10,
  });

  // Game Review State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Orientation
  const [orientation, setOrientation] = useState<Color>('w');

  // Initial Chess Engine
  const [initialEngine] = useState<ChessAdapter>(() => new ChessAdapter());

  const initialMode: PlayMode = roomIdFromUrl
    ? 'online'
    : modeParam === 'local' || modeParam === 'pass-and-play'
    ? 'local'
    : 'bot';

  const arena = useGameArena<ChessMoveInput, ReturnType<Chess['board']>, { fen: string; history: string[] }>({
    initialEngine,
    defaultMinutes: minsParam || 5,
    initialPlayMode: initialMode,
    initialBotDifficulty: difficultyParam,
    botColor: 'b',
  });

  const adapter = arena.engine as unknown as ChessAdapter;
  const chess = adapter.getInternalEngine();
  const captured = getCapturedPieces(chess);
  const rawSession = getPlayerSession();
  const currentUser = {
    id: rawSession.id,
    handle: rawSession.handle,
    blitzRating: rawSession.rating || 1200,
    xp: rawSession.xp || 0,
    isVerifiedHuman: rawSession.isVerifiedHuman,
  };

  // Real-Time P2P / Server Multiplayer Room
  const mp = useMultiplayerRoom({
    roomId,
    gameId: 'chess',
    onStateSync: (s) => {
      try {
        arena.setEngine(new ChessAdapter(s.fen));
      } catch {
        // ignore
      }
    },
    onClockSync: (wTime, bTime) => {
      arena.setWhiteTime(wTime);
      arena.setBlackTime(bTime);
    },
    onMoveMade: (payload) => {
      if (payload.isEcho) {
        return;
      }
      arena.executeMove(payload.lastMove, true);
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

  const matchSavedRef = useRef<boolean>(false);

  // Active match tracking
  useEffect(() => {
    if (arena.gameOver) {
      clearActiveMatch();
      return;
    }
    if (arena.isMatchInProgress) {
      setActiveMatch({
        gameId: 'chess',
        roomId: roomId || undefined,
        isOnline: Boolean(roomId),
        role: mp.myRole as any,
        opponentHandle: roomId ? mp.opponentInfo?.handle || 'Opponent' : `Bot (${arena.botDifficulty})`,
        opponentRating: roomId ? mp.opponentInfo?.rating : undefined,
        timeControlMinutes: arena.timeControlMinutes,
        url: window.location.pathname + window.location.search,
        startedAt: Date.now(),
      });
    }
  }, [arena.isMatchInProgress, arena.gameOver, roomId, mp.myRole, mp.opponentInfo, arena.botDifficulty, arena.timeControlMinutes]);

  // Handle Match Conclusion
  useEffect(() => {
    if (!arena.gameOver || matchSavedRef.current || arena.history.length === 0) return;
    matchSavedRef.current = true;
    clearActiveMatch();

    const isWhiteWinner = arena.gameOver.winner === 'w';
    const isBlackWinner = arena.gameOver.winner === 'b';
    const isDraw = arena.gameOver.winner === 'draw' || !arena.gameOver.winner;

    const opponentId = arena.playMode === 'bot' ? 'bot_chess' : arena.playMode === 'local' ? 'local_p2' : 'opponent';
    const opponentLabel = arena.playMode === 'bot' ? `Bot (${arena.botDifficulty})` : arena.playMode === 'local' ? 'Guest Player' : (mp.opponentInfo?.handle || 'Opponent');

    const whitePlayerId = orientation === 'w' ? currentUser.id : opponentId;
    const blackPlayerId = orientation === 'b' ? currentUser.id : opponentId;

    const winnerId = isWhiteWinner ? whitePlayerId : isBlackWinner ? blackPlayerId : null;
    const isUserWinner = winnerId === currentUser.id;

    saveMatchToVault({
      id: `chs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameId: 'chess',
      whiteId: whitePlayerId,
      blackId: blackPlayerId,
      whiteHandle: orientation === 'w' ? currentUser.handle : opponentLabel,
      blackHandle: orientation === 'b' ? currentUser.handle : opponentLabel,
      timeControl: `${arena.timeControlMinutes}+0`,
      winnerId,
      resultType: arena.gameOver.headline,
      pgn: arena.history.join(' '),
      finalFen: chess.fen(),
      rated: Boolean(roomId),
      ratingDelta: isUserWinner ? 16 : isDraw ? 0 : -12,
      createdAt: new Date().toISOString(),
    });
  }, [arena.gameOver, arena.history, orientation, arena.playMode, arena.botDifficulty, arena.timeControlMinutes, roomId, mp.opponentInfo, chess, currentUser]);

  // Live Stockfish Evaluation
  useEffect(() => {
    if (chess.isGameOver()) return;
    const currentFen = chess.fen();
    stockfishClient
      .evaluatePosition(currentFen, 10)
      .then((res: EvalResult) => setEvalResult(res))
      .catch(() => {});
  }, [arena.lastMove, chess]);

  // Ask for AI Coach hint
  const handleAskHint = () => {
    setLoadingHint(true);
    setTimeout(() => {
      const hint = chessCoach.generateHint(chess, evalResult.bestMove);
      setCoachCommentary(hint);
      if (hint?.suggestedMove) {
        setHintSquares({
          from: hint.suggestedMove.from as Square,
          to: hint.suggestedMove.to as Square,
        });
      }
      setLoadingHint(false);
    }, 250);
  };

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    setHintSquares(null);

    if (arena.playMode === 'online') {
      if (!mp.isMyTurn(arena.turn)) {
        arena.triggerAlert('Not your turn! Waiting for opponent.');
        return false;
      }
      const success = arena.executeMove({ from, to, promotion });
      if (!success) return false;

      // Asynchronously transmit to authoritative room
      mp.sendMove({ from, to, promotion: promotion || 'q' }).then((ok) => {
        if (!ok) {
          arena.triggerAlert('Move rejected by room server.');
        }
      });
      return true;
    }

    if (arena.playMode === 'bot' && arena.turn === arena.botColor) {
      return false;
    }

    return arena.executeMove({ from, to, promotion });
  };

  const handleStartGameReview = () => {
    setReviewModalOpen(true);
    setReviewLoading(true);

    const temp = new Chess();
    const fens: string[] = [temp.fen()];
    for (const m of arena.history) {
      try {
        temp.move(m);
        fens.push(temp.fen());
      } catch {
        break;
      }
    }

    stockfishClient
      .reviewGame(fens, arena.history)
      .then((report) => {
        setReviewReport(report);
      })
      .catch(() => {})
      .finally(() => setReviewLoading(false));
  };

  const copyRoomLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
  };

  const handleExitToLobby = useCallback(() => {
    clearActiveMatch();
    arena.cancelPendingBot();
    setRoomId(null);
    setIsMatchActive(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [arena]);

  const topPlayerColor: Color = orientation === 'w' ? 'b' : 'w';
  const bottomPlayerColor: Color = orientation === 'w' ? 'w' : 'b';

  const viewProps: PlayViewSharedProps = {
    chess,
    fen: chess.fen(),
    orientation,
    lastMove: arena.lastMove ? { from: (arena.lastMove as any).from, to: (arena.lastMove as any).to } : null,
    hintSquares,
    handleMove,
    isMyTurnInMultiplayer: mp.isMyTurn(arena.turn),
    myRole: mp.myRole,
    isBotThinking: arena.isBotThinking,
    gameOverResult: arena.gameOver
      ? {
          winner: arena.gameOver.winner as Color | 'draw' | null,
          headline: arena.gameOver.headline,
          subdeck: arena.gameOver.subdeck,
        }
      : null,
    dismissGameOverModal: arena.dismissGameOverModal,
    setDismissGameOverModal: arena.setDismissGameOverModal,
    handleStartGameReview,
    handleNewGame: (mins) => {
      matchSavedRef.current = false;
      arena.resetGame(mins);
    },
    handleFlipBoard,
    handleResign: () => arena.resign(bottomPlayerColor),
    handleDrawOffer: () => mp.offerDraw(),
    handleUndo: arena.canTakeBack ? () => arena.takeBack() : () => {},
    soundEnabled,
    setSoundEnabled,
    vsBot: arena.vsBot,
    setVsBot: arena.setVsBot,
    botDifficulty: arena.botDifficulty as 'easy' | 'medium' | 'hard',
    setBotDifficulty: (d) => arena.setBotDifficulty(d),
    showEvalBar,
    setShowEvalBar,
    evalResult,
    topPlayerColor,
    bottomPlayerColor,
    roomId,
    currentUser,
    opponentInfo: mp.opponentInfo,
    whiteTime: arena.whiteTime,
    blackTime: arena.blackTime,
    captured,
    timeControlMinutes: arena.timeControlMinutes,
    history: arena.history,
    currentStepIndex: arena.currentStepIndex,
    handleJumpToStep: arena.jumpToStep,
    coachCommentary,
    handleAskHint,
    loadingHint,
    coachModeActive,
    setCoachModeActive,
    copyRoomLink,
    copiedLink,
    setMultiplayerModalOpen: mp.setMultiplayerModalOpen,
    gameActive: arena.isMatchInProgress,
    chatDrawerOpen: mp.chatDrawerOpen,
    setChatDrawerOpen: mp.setChatDrawerOpen,
    chatMessages: mp.chatMessages,
    onSendMessage: mp.sendChat,
    incomingReaction: mp.incomingReaction,
    drawOfferPendingFrom: mp.drawOfferPendingFrom,
    onOfferDraw: mp.offerDraw,
    onRespondDraw: mp.respondDraw,
    onResignMatch: mp.resignMatch,
    rematchOfferPendingFrom: mp.rematchOfferPendingFrom,
    onOfferRematch: mp.offerRematch,
    onRespondRematch: mp.respondRematch,
    drawOfferStatus: mp.drawOfferStatus,
    isOpponentConnected: mp.isOpponentConnected,
    onOpenLobby: handleExitToLobby,
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <BiboCatMascot size={32} glow />
        <p className="text-sm font-bold text-zinc-400">Authenticating arena session...</p>
      </div>
    );
  }

  if (!isMatchActive) {
    return (
      <>
        <PreMatchLobby
          gameId="chess"
          title="Chess Arena"
          subtitle="Classic 8x8"
          tagline="Tactical warfare on 64 squares. Outthink opponents with Stockfish AI coach, depth evaluations, and grandmaster openings."
          icon={Swords}
          accentColor="#38bdf8"
          userRating={currentUser.blitzRating}
          rules={[
            { title: 'King Checkmate', desc: 'Trap enemy King so no legal escape or defense move exists.' },
            { title: 'Stockfish AI Coach', desc: 'Real-time depth evaluation and adaptive move suggestions.' },
            { title: 'Tactical Clocks', desc: 'Authoritative clocks with bullet, blitz, and rapid tempos.' },
          ]}
          botTiers={[
            { id: 'easy', label: 'ELO 450 (Novice)', desc: 'Friendly sparring with basic tactics' },
            { id: 'medium', label: 'ELO 1200 (Tactical)', desc: 'Balanced club-level positional game' },
            { id: 'hard', label: 'ELO 2200 (Master)', desc: 'Full Stockfish depth calculations' },
          ]}
          timePresets={[
            { mins: 1, label: '1 min', format: 'Bullet', badge: 'Ultra Fast' },
            { mins: 3, label: '3 min', format: 'Blitz', badge: 'Popular' },
            { mins: 5, label: '5 min', format: 'Blitz', badge: 'Standard' },
            { mins: 10, label: '10 min', format: 'Rapid', badge: 'Deep' },
          ]}
          onStartMatch={({ mode, botDifficulty, timeControlMinutes }) => {
            if (mode === 'bot') {
              arena.setPlayMode('bot');
              arena.setBotDifficulty(botDifficulty as 'easy' | 'medium' | 'hard');
            } else if (mode === 'pass-and-play') {
              arena.setPlayMode('local');
            }
            arena.resetGame(timeControlMinutes);
            setHintSquares(null);
            setCoachCommentary(null);
            matchSavedRef.current = false;
            setIsMatchActive(true);
          }}
          onOpenMultiplayerModal={() => mp.setMultiplayerModalOpen(true)}
        />
        <MultiplayerModal
          isOpen={mp.multiplayerModalOpen}
          onClose={() => mp.setMultiplayerModalOpen(false)}
          gameId="chess"
          gameTitle="BIBO Chess"
          currentUser={{ id: currentUser.id, handle: currentUser.handle }}
          onRoomCreated={(rId) => {
            setRoomId(rId);
            mp.setMultiplayerModalOpen(false);
            setIsMatchActive(true);
            router.replace(`/play/chess?room=${rId}`);
          }}
        />
      </>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      {/* 1. Tailored Desktop Workstation Arena (>= 768px) */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 w-full">
        <PlayDesktopView {...viewProps} />
      </div>

      {/* 2. Tailored Mobile Phone Native Arena (< 768px) */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 w-full">
        <PlayMobileView {...viewProps} />
      </div>

      {/* Game Over Dialog */}
      {arena.gameOver && !arena.dismissGameOverModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="relative bg-[#141624] border border-white/20 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-3.5">
            <button
              onClick={() => arena.setDismissGameOverModal(true)}
              title="Inspect Final Board Position"
              className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-xs uppercase font-extrabold tracking-widest text-[#ffcc00] px-3 py-1 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/30">
              CHESS MATCH COMPLETE
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {arena.gameOver.headline}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              {arena.gameOver.subdeck}
            </p>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={handleStartGameReview}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,224,128,0.4)] cursor-pointer"
              >
                <span>REVIEW GAME (STOCKFISH)</span>
              </button>

              <button
                onClick={() => arena.setDismissGameOverModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>INSPECT BOARD POSITION</span>
              </button>

              <button
                onClick={() => {
                  matchSavedRef.current = false;
                  arena.resetGame(arena.timeControlMinutes);
                }}
                className="w-full py-2.5 px-4 rounded-xl btn-bibo-primary text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>

              <button
                onClick={() => {
                  matchSavedRef.current = false;
                  clearActiveMatch();
                  setIsMatchActive(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>RETURN TO CHESS LOBBY</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Invite Modal */}
      <MultiplayerModal
        isOpen={mp.multiplayerModalOpen}
        onClose={() => mp.setMultiplayerModalOpen(false)}
        gameId="chess"
        gameTitle="BIBO Chess"
        currentUser={{ id: currentUser.id, handle: currentUser.handle }}
        onRoomCreated={(rId) => {
          setRoomId(rId);
          router.replace(`/play/chess?room=${rId}`);
        }}
      />

      {/* Stockfish Game Review Modal */}
      <GameReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        report={reviewReport}
        loading={reviewLoading}
        onSelectMove={(stepIdx) => arena.jumpToStep(stepIdx)}
      />
    </div>
  );
}

export default function PlayChessPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-[70vh] bg-[#171719] text-zinc-400 flex items-center justify-center font-mono text-xs">Loading Chess Arena...</div>}>
        <ChessArenaContent />
      </Suspense>
    </AppShell>
  );
}
