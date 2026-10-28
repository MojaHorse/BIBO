'use client';

import React from 'react';
import Link from 'next/link';
import { Chess, Square, Color, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/ChessBoard';
import { PlayerCard } from '@/components/PlayerCard';
import { MoveHistory } from '@/components/MoveHistory';
import { GameControls } from '@/components/GameControls';
import { EvalBar } from '@/components/EvalBar';
import { CoachCard } from '@/components/CoachCard';
import { EvalResult } from '@/lib/stockfish';
import { CoachCommentary } from '@/lib/chess-coach';
import { CapturedPieces } from '@/lib/chess-utils';
import { ChatMessage } from '@/lib/room-manager';
import { PlayerColor } from '@/lib/games/types';
import {
  AlertCircle,
  RotateCcw,
  Bot,
  Users,
  Gamepad2,
  Copy,
  Check,
  Radio,
  Trophy,
  ArrowLeft,
  MessageSquare,
  Handshake,
  Flag,
} from 'lucide-react';
import { InGameChatDrawer } from './InGameChatDrawer';
import { DrawOfferModal } from './DrawOfferModal';
import { ResignConfirmModal } from './ResignConfirmModal';

export interface PlayViewSharedProps {
  chess: Chess;
  fen: string;
  orientation: Color;
  lastMove: { from: Square; to: Square } | null;
  hintSquares: { from: Square; to: Square } | null;
  handleMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  isMyTurnInMultiplayer: boolean;
  myRole: 'w' | 'b' | 'spectator' | null;
  isBotThinking: boolean;
  gameOverResult: {
    winner: Color | 'draw' | null;
    headline: string;
    subdeck: string;
  } | null;
  dismissGameOverModal: boolean;
  setDismissGameOverModal: (d: boolean) => void;
  handleStartGameReview: () => void;
  handleNewGame: (mins: number) => void;
  handleFlipBoard: () => void;
  handleResign: () => void;
  handleDrawOffer: () => void;
  handleUndo: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
  vsBot: boolean;
  setVsBot: (v: boolean) => void;
  botDifficulty: 'easy' | 'medium' | 'hard';
  setBotDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  showEvalBar: boolean;
  setShowEvalBar: (e: boolean) => void;
  evalResult: EvalResult;
  topPlayerColor: Color;
  bottomPlayerColor: Color;
  roomId: string | null;
  currentUser: {
    id: string;
    handle: string;
    blitzRating: number;
    xp: number;
    isVerifiedHuman?: boolean;
  } | null;
  opponentInfo: { handle: string; rating: number } | null;
  whiteTime: number;
  blackTime: number;
  captured: CapturedPieces;
  timeControlMinutes: number;
  history: string[];
  currentStepIndex: number;
  handleJumpToStep: (step: number) => void;
  coachCommentary: CoachCommentary | null;
  handleAskHint: () => void;
  loadingHint: boolean;
  coachModeActive: boolean;
  setCoachModeActive: (c: boolean) => void;
  copyRoomLink: () => void;
  copiedLink: boolean;
  setMultiplayerModalOpen: (m: boolean) => void;
  gameActive: boolean;
  onOpenLobby?: () => void;
  chatDrawerOpen?: boolean;
  setChatDrawerOpen?: (open: boolean) => void;
  chatMessages?: ChatMessage[];
  onSendMessage?: (text?: string, emoji?: string) => Promise<boolean>;
  incomingReaction?: { emoji: string; senderHandle: string; id: string } | null;
  drawOfferPendingFrom?: PlayerColor | null;
  onOfferDraw?: () => void;
  onRespondDraw?: (accept: boolean) => void;
  onResignMatch?: () => void;
  rematchOfferPendingFrom?: PlayerColor | null;
  onOfferRematch?: () => void;
  onRespondRematch?: (accept: boolean) => void;
  drawOfferStatus?: string | null;
  isOpponentConnected?: boolean;
}

export const PlayDesktopView: React.FC<PlayViewSharedProps> = (props) => {
  const [resignConfirmOpen, setResignConfirmOpen] = React.useState(false);
  const [desktopTab, setDesktopTab] = React.useState<'moves' | 'coach' | 'room'>('moves');

  const {
    chess,
    fen,
    orientation,
    lastMove,
    hintSquares,
    handleMove,
    isMyTurnInMultiplayer,
    myRole,
    isBotThinking,
    gameOverResult,
    dismissGameOverModal,
    setDismissGameOverModal,
    handleStartGameReview,
    handleNewGame,
    handleFlipBoard,
    handleResign,
    handleDrawOffer,
    handleUndo,
    soundEnabled,
    setSoundEnabled,
    vsBot,
    setVsBot,
    botDifficulty,
    setBotDifficulty,
    showEvalBar,
    setShowEvalBar,
    evalResult,
    topPlayerColor,
    bottomPlayerColor,
    roomId,
    currentUser,
    opponentInfo,
    whiteTime,
    blackTime,
    captured,
    timeControlMinutes,
    history,
    currentStepIndex,
    handleJumpToStep,
    coachCommentary,
    handleAskHint,
    loadingHint,
    coachModeActive,
    setCoachModeActive,
    copyRoomLink,
    copiedLink,
    setMultiplayerModalOpen,
    chatDrawerOpen,
    setChatDrawerOpen,
    chatMessages,
    onSendMessage,
    incomingReaction,
    drawOfferPendingFrom,
    onOfferDraw,
    onRespondDraw,
    onResignMatch,
    rematchOfferPendingFrom,
    onOfferRematch,
    onRespondRematch,
    drawOfferStatus,
    isOpponentConnected = true,
  } = props;

  // Tailored Desktop Sizing: Fills viewport height completely, eliminating any dead void beneath board
  const baseSize = 'min(calc(100dvh - 165px), calc(100vw - 420px), 760px)';
  const boardSize = showEvalBar ? `calc(${baseSize} - 22px)` : baseSize;
  const boardWithEval = baseSize;

  return (
    <div className="w-full flex flex-col gap-2 select-none h-full min-h-0">
      {/* Desktop Precision Arena Toolbar */}
      <div className="bg-[#16171b] border border-white/[0.06] rounded-xl px-4 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 h-9">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (props.onOpenLobby) props.onOpenLobby();
              else window.location.href = '/play';
            }}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition text-xs font-bold shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>LOBBY</span>
          </button>
          <span className="text-zinc-600">|</span>

          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
            <h1 className="font-black text-sm text-white tracking-wide truncate">
              {roomId
                ? 'P2P MULTIPLAYER ARENA'
                : vsBot
                ? `MACHINE ARENA · ${botDifficulty.toUpperCase()}`
                : 'LOCAL DUEL'}
            </h1>
          </div>

          {chess.inCheck() && !gameOverResult && (
            <span className="flex items-center gap-1 bg-[#e60012] text-white px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider animate-pulse shrink-0 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5" />
              CHECK
            </span>
          )}

          {isBotThinking && (
            <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] font-bold animate-pulse shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#38bdf8]" />
              CALCULATING...
            </span>
          )}
        </div>

        {/* Action Controls & Telemetry */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          {currentUser?.xp !== undefined && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#1c1d22] border border-white/[0.06] text-xs font-mono text-zinc-300">
              <span className="text-[#ffcc00] font-bold">{(currentUser.xp || 0).toLocaleString()} XP</span>
            </div>
          )}

          {roomId ? (
            <div className="flex items-center gap-2 bg-[#1c1d22] border border-white/[0.06] px-3 py-1 rounded-lg">
              <Radio className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
              <span className="font-bold text-[11px] text-white">
                {myRole ? `ROLE: ${myRole === 'w' ? 'WHITE' : myRole === 'b' ? 'BLACK' : 'SPECTATOR'}` : 'CONNECTING...'}
              </span>
              <span className="text-zinc-600">·</span>
              <button
                onClick={copyRoomLink}
                title="Copy room link"
                className="flex items-center gap-1 text-[11px] font-bold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'COPIED' : 'INVITE'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (props.onOpenLobby) props.onOpenLobby();
                  else window.location.href = '/play';
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition cursor-pointer shadow-sm"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Find Game</span>
              </button>
              <button
                onClick={() => setMultiplayerModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg btn-tactile text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Invite</span>
              </button>
            </div>
          )}

          {roomId && (
            <div className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              isMyTurnInMultiplayer
                ? 'bg-[#22c55e] text-black animate-pulse'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {isMyTurnInMultiplayer ? 'YOUR TURN' : "OPPONENT'S TURN"}
            </div>
          )}

          {/* Online Match Interactive Actions */}
          {roomId && (
            <>
              <button
                onClick={() => setChatDrawerOpen && setChatDrawerOpen(!chatDrawerOpen)}
                title="Toggle In-Game Chat"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  chatDrawerOpen
                    ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/50'
                    : 'bg-[#1c1d22] text-zinc-300 border-white/[0.06] hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>CHAT</span>
                {chatMessages && chatMessages.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                )}
              </button>

              {!gameOverResult && (
                <>
                  <button
                    onClick={onOfferDraw}
                    title="Offer Draw to Opponent"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.06] bg-[#1c1d22] hover:bg-[#23252c] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    <Handshake className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>DRAW</span>
                  </button>

                  <button
                    onClick={() => setResignConfirmOpen(true)}
                    title="Resign Match"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-500" />
                    <span>RESIGN</span>
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => setShowEvalBar(!showEvalBar)}
            title="Toggle Live Stockfish Eval Bar"
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              showEvalBar
                ? 'bg-[#22242b] text-white border-white/20'
                : 'bg-transparent text-zinc-500 border-white/[0.06] hover:text-zinc-300'
            }`}
          >
            {showEvalBar ? 'EVAL ON' : 'EVAL OFF'}
          </button>

          <button
            onClick={handleFlipBoard}
            title="Flip Board Orientation"
            className="px-3 py-1 rounded-lg border border-white/[0.06] bg-[#1c1d22] hover:bg-[#23252c] text-xs font-semibold text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>FLIP</span>
          </button>
        </div>
      </div>

      {/* Tailored Desktop Side-by-Side Arena */}
      <div className="flex flex-row gap-3 items-stretch justify-start flex-1 min-h-0 w-full">
        {/* Left Board Column: Maximized to height with zero bottom void */}
        <div className="flex flex-col gap-1 items-center shrink-0">
          {/* Top Player Card */}
          <div style={{ width: showEvalBar ? boardWithEval : boardSize, maxWidth: '100%' }}>
            <PlayerCard
              name={
                roomId
                  ? topPlayerColor === 'b'
                    ? myRole === 'b'
                      ? currentUser?.handle || 'You (Black)'
                      : opponentInfo?.handle || 'Awaiting Opponent...'
                    : myRole === 'w'
                    ? currentUser?.handle || 'You (White)'
                    : opponentInfo?.handle || 'Opponent'
                  : topPlayerColor === 'b'
                  ? vsBot
                    ? `Bot (${botDifficulty})`
                    : 'Black'
                  : 'White'
              }
              color={topPlayerColor}
              rating={
                roomId
                  ? topPlayerColor === myRole
                    ? currentUser?.blitzRating || 1200
                    : opponentInfo?.rating || 1200
                  : vsBot
                  ? botDifficulty === 'easy'
                    ? 450
                    : botDifficulty === 'hard'
                    ? 2200
                    : 1200
                  : 1200
              }
              isActive={chess.turn() === topPlayerColor && !gameOverResult}
              timeLeft={topPlayerColor === 'w' ? whiteTime : blackTime}
              capturedPieces={captured[topPlayerColor]}
              materialAdvantage={topPlayerColor === 'w' ? Math.max(0, captured.scoreDiff) : Math.max(0, -captured.scoreDiff)}
              isThinking={isBotThinking && vsBot && topPlayerColor === (orientation === 'w' ? 'b' : 'w')}
              isVerifiedHuman={topPlayerColor === orientation ? Boolean(currentUser?.isVerifiedHuman) : false}
              xp={vsBot ? (botDifficulty === 'easy' ? 450 : botDifficulty === 'medium' ? 4500 : 24000) : 1200}
              floatingReaction={topPlayerColor !== myRole ? incomingReaction?.emoji : undefined}
            />
          </div>

          {/* Draw Offer Notification Alert */}
          {drawOfferStatus && (
            <div className="w-full py-1 px-3 rounded-lg bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-center text-xs font-medium text-white animate-in fade-in">
              {drawOfferStatus}
            </div>
          )}

          {/* Opponent Disconnected Grace Pill */}
          {roomId && !isOpponentConnected && !gameOverResult && (
            <div className="w-full py-1 px-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-center text-xs font-bold text-amber-300 animate-pulse flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Opponent disconnected • Waiting for reconnection (60s)...</span>
            </div>
          )}

          {/* Board + EvalBar */}
          <div className="flex gap-2 items-stretch justify-center">
            <EvalBar
              score={evalResult.score}
              isMate={evalResult.isMate}
              mateIn={evalResult.mateIn}
              orientation={orientation}
              visible={showEvalBar}
            />
            <div style={{ width: boardSize, height: boardSize }} className="aspect-square shrink-0">
              <ChessBoard
                chess={chess}
                orientation={orientation}
                lastMove={lastMove}
                onMove={handleMove}
                hintSquares={hintSquares}
                playerColor={roomId ? myRole : null}
                disabled={
                  Boolean(gameOverResult) ||
                  isBotThinking ||
                  (Boolean(roomId) && myRole === 'spectator') ||
                  (Boolean(roomId) && Boolean(myRole) && myRole !== chess.turn())
                }
              />
            </div>
          </div>

          {/* Bottom Player Card */}
          <div style={{ width: boardWithEval, maxWidth: '100%' }}>
            <PlayerCard
              name={
                roomId
                  ? bottomPlayerColor === myRole
                    ? `${currentUser?.handle || 'You'} (${myRole === 'w' ? 'White' : 'Black'})`
                    : opponentInfo?.handle || 'Opponent'
                  : bottomPlayerColor === 'w'
                  ? currentUser?.handle || 'White (You)'
                  : 'Black (You)'
              }
              color={bottomPlayerColor}
              rating={
                roomId
                  ? bottomPlayerColor === myRole
                    ? currentUser?.blitzRating || 1200
                    : opponentInfo?.rating || 1200
                  : currentUser?.blitzRating || 1200
              }
              isActive={chess.turn() === bottomPlayerColor && !gameOverResult}
              timeLeft={bottomPlayerColor === 'w' ? whiteTime : blackTime}
              capturedPieces={captured[bottomPlayerColor]}
              materialAdvantage={bottomPlayerColor === 'w' ? Math.max(0, captured.scoreDiff) : Math.max(0, -captured.scoreDiff)}
              isThinking={isBotThinking && vsBot && bottomPlayerColor === (orientation === 'w' ? 'b' : 'w')}
              isVerifiedHuman={bottomPlayerColor === orientation ? Boolean(currentUser?.isVerifiedHuman) : false}
              xp={currentUser?.xp || 0}
              floatingReaction={bottomPlayerColor === myRole ? incomingReaction?.emoji : undefined}
            />
          </div>
        </div>

        {/* Right Desktop Controls Column: Docked side-by-side matching board height */}
        <div className="flex flex-1 min-w-[280px] max-w-[420px] flex-col gap-2 overflow-y-auto pr-1 w-full h-full min-h-0">
          {gameOverResult && dismissGameOverModal && (
            <div className="bg-[#1c1d22] border border-[#22c55e]/40 rounded-xl p-3 flex flex-col gap-2 shrink-0 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#ffcc00]" />
                  {gameOverResult.headline}
                </span>
                <button
                  onClick={() => setDismissGameOverModal(false)}
                  className="text-[10px] text-zinc-400 hover:text-white font-mono underline cursor-pointer"
                >
                  Modal View
                </button>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium">
                {gameOverResult.subdeck} · Board unlocked for inspection
              </p>

              {/* Online Rematch Handshake */}
              {roomId && rematchOfferPendingFrom && (
                <div className="p-2 rounded-lg bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-xs">
                  {rematchOfferPendingFrom !== myRole ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">Opponent proposed Rematch!</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onRespondRematch && onRespondRematch(true)}
                          className="px-2.5 py-1 rounded-md bg-[#22c55e] text-black font-bold text-[11px] hover:bg-emerald-400"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onRespondRematch && onRespondRematch(false)}
                          className="px-2.5 py-1 rounded-md bg-white/10 text-zinc-300 text-[11px] hover:text-white"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-300 animate-pulse text-[11px]">
                      Rematch offer sent • Waiting for opponent...
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartGameReview}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <span>Review</span>
                </button>

                {roomId ? (
                  <button
                    onClick={() => {
                      if (rematchOfferPendingFrom !== myRole && onOfferRematch) {
                        onOfferRematch();
                      }
                    }}
                    disabled={rematchOfferPendingFrom === myRole}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{rematchOfferPendingFrom === myRole ? 'Awaiting...' : 'Rematch'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleNewGame(timeControlMinutes)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#e60012] hover:bg-[#cc0010] text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Play Again</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Clean Segmented Tab Control */}
          <div className="flex items-center p-1 rounded-xl bg-[#16171b] border border-white/[0.08] gap-1 shrink-0">
            <button
              onClick={() => setDesktopTab('moves')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                desktopTab === 'moves'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Moves</span>
              {history.length > 0 && (
                <span className="text-[10px] opacity-80 font-mono">({Math.ceil(history.length / 2)})</span>
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
              onClick={() => setDesktopTab('room')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                desktopTab === 'room'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>Room & Chat</span>
              {chatMessages && chatMessages.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
              )}
            </button>
          </div>

          {/* Tab 1: Moves & Controls */}
          {desktopTab === 'moves' && (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <MoveHistory
                history={history}
                currentStepIndex={currentStepIndex}
                onJumpToStep={handleJumpToStep}
                fen={fen}
                onReview={handleStartGameReview}
              />

              <GameControls
                onNewGame={handleNewGame}
                onFlipBoard={handleFlipBoard}
                onResign={handleResign}
                onDrawOffer={handleDrawOffer}
                onUndo={handleUndo}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled(!soundEnabled)}
                vsBot={vsBot}
                onToggleVsBot={() => setVsBot(!vsBot)}
                botDifficulty={botDifficulty}
                onChangeBotDifficulty={setBotDifficulty}
                gameOver={Boolean(gameOverResult)}
              />
            </div>
          )}

          {/* Tab 2: AI Coach */}
          {desktopTab === 'coach' && (
            <div className="flex flex-col gap-2 flex-1 min-h-0 animate-in fade-in">
              <CoachCard
                commentary={coachCommentary}
                onAskHint={handleAskHint}
                onTakeBack={handleUndo}
                loadingHint={loadingHint}
                coachModeActive={coachModeActive}
                onToggleCoachMode={() => setCoachModeActive(!coachModeActive)}
              />
            </div>
          )}

          {/* Tab 3: Room Info, Invite, & Match Actions */}
          {desktopTab === 'room' && (
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-[#16171b] border border-white/[0.08] flex-1 min-h-0 animate-in fade-in overflow-y-auto">
              {/* Room Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {roomId ? `Room ${roomId}` : 'Local Arena'}
                  </span>
                </div>
                {roomId && (
                  <button
                    onClick={copyRoomLink}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copied' : 'Invite Link'}</span>
                  </button>
                )}
              </div>

              {/* Opponent Info Card */}
              <div className="p-3 rounded-xl bg-[#1c1d22] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#FF173D] flex items-center justify-center text-xs font-black text-white">
                    {(opponentInfo?.handle || (vsBot ? 'BOT' : 'OPP')).slice(0, 1)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {opponentInfo?.handle || (vsBot ? `Tactical Bot (${botDifficulty.toUpperCase()})` : 'Opponent')}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Rating: {opponentInfo?.rating || (vsBot ? 1400 : 1200)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setChatDrawerOpen && setChatDrawerOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#28282e] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>

              {/* Match Handshake Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDrawOffer}
                  disabled={Boolean(gameOverResult)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Handshake className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Offer Draw</span>
                </button>

                <button
                  onClick={() => setResignConfirmOpen(true)}
                  disabled={Boolean(gameOverResult)}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Resign</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Online Multiplayer Modals */}
      <InGameChatDrawer
        isOpen={Boolean(chatDrawerOpen)}
        onClose={() => setChatDrawerOpen && setChatDrawerOpen(false)}
        messages={chatMessages || []}
        myRole={myRole}
        onSendMessage={onSendMessage || (async () => false)}
      />

      <DrawOfferModal
        isOpen={Boolean(drawOfferPendingFrom)}
        pendingFrom={drawOfferPendingFrom || null}
        myRole={myRole}
        onAccept={() => onRespondDraw && onRespondDraw(true)}
        onDecline={() => onRespondDraw && onRespondDraw(false)}
      />

      <ResignConfirmModal
        isOpen={resignConfirmOpen}
        onClose={() => setResignConfirmOpen(false)}
        onConfirm={() => {
          handleResign();
          if (roomId && onResignMatch) {
            onResignMatch();
          }
        }}
      />
    </div>
  );
};
