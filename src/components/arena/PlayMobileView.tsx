'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChessBoard } from '@/components/ChessBoard';
import { PlayerCard } from '@/components/PlayerCard';
import { MoveHistory } from '@/components/MoveHistory';
import { GameControls } from '@/components/GameControls';
import { EvalBar } from '@/components/EvalBar';
import { CoachCard } from '@/components/CoachCard';
import { MobileThumbBar } from '@/components/MobileThumbBar';
import { BottomSheet } from '@/components/BottomSheet';
import { PlayViewSharedProps } from './PlayDesktopView';
import { InGameChatDrawer } from './InGameChatDrawer';
import { DrawOfferModal } from './DrawOfferModal';
import { ResignConfirmModal } from './ResignConfirmModal';
import {
  AlertCircle,
  Bot,
  Copy,
  Check,
  Radio,
  MessageSquare,
  ArrowLeft,
  Handshake,
  Flag,
  Gamepad2,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const PlayMobileView: React.FC<PlayViewSharedProps> = (props) => {
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);
  const {
    chess,
    fen,
    orientation,
    lastMove,
    hintSquares,
    handleMove,
    myRole,
    isBotThinking,
    gameOverResult,
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
    gameActive,
    chatDrawerOpen,
    setChatDrawerOpen,
    chatMessages,
    onSendMessage,
    incomingReaction,
    drawOfferPendingFrom,
    onRespondDraw,
    onResignMatch,
    drawOfferStatus,
    isOpponentConnected = true,
    onOpenLobby,
  } = props;

  // Local bottom sheet states for mobile drawers
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const [coachSheetOpen, setCoachSheetOpen] = useState(false);
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false);

  // Dynamic board sizing via ResizeObserver: fits exactly within remaining viewport
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [boardDim, setBoardDim] = useState<number>(320);

  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Find square size that fits within available width & height
        const maxSquare = Math.floor(Math.min(rect.width, rect.height)) - 4;
        setBoardDim(Math.max(180, Math.min(maxSquare, 560)));
      }
    };

    updateSize();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const maxSquare = Math.floor(Math.min(width, height)) - 4;
          setBoardDim(Math.max(180, Math.min(maxSquare, 560)));
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

  const effectiveBoardSize = showEvalBar ? Math.max(160, boardDim - 22) : boardDim;

  return (
    <div className="w-full h-full flex flex-col justify-between items-center select-none overflow-hidden max-w-lg mx-auto px-2 py-1 gap-1">
      {/* 1. Mobile Compact Header Toolbar */}
      <div className="w-full bg-[#16171b] border border-white/[0.08] rounded-xl px-2 py-1 flex items-center justify-between gap-2 text-xs shrink-0 h-8">
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {onOpenLobby ? (
            <button
              onClick={onOpenLobby}
              title="Return to Game Selection Lobby"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#222226] border border-white/[0.08] text-[10px] font-bold text-zinc-300 hover:text-white shrink-0 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3 text-[#FF6A00]" />
              <span>GAMES</span>
            </button>
          ) : (
            <Link
              href="/play"
              title="Return to Game Selection Lobby"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#222226] border border-white/[0.08] text-[10px] font-bold text-zinc-300 hover:text-white shrink-0 active:scale-95 transition"
            >
              <ArrowLeft className="w-3 h-3 text-[#FF6A00]" />
              <span>GAMES</span>
            </Link>
          )}

          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
          <h1 className="font-black text-xs text-white tracking-wide truncate">
            {roomId ? 'ONLINE' : vsBot ? `BOT · ${botDifficulty.toUpperCase()}` : 'DUEL'}
          </h1>

          {chess.inCheck() && !gameOverResult && (
            <span className="flex items-center gap-0.5 bg-[#e60012] text-white px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider animate-pulse shrink-0">
              <AlertCircle className="w-3 h-3" />
              CHECK
            </span>
          )}

          {isBotThinking && (
            <span className="flex items-center gap-1 text-zinc-300 font-mono text-[10px] font-bold animate-pulse shrink-0">
              <Bot className="w-3 h-3 text-[#38bdf8]" />
              THINKING...
            </span>
          )}
        </div>

        {/* Action Controls & Invite */}
        <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
          {roomId && (
            <button
              onClick={() => setChatDrawerOpen && setChatDrawerOpen(!chatDrawerOpen)}
              title="In-Game Chat"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition ${
                chatDrawerOpen
                  ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40'
                  : 'bg-[#1c1d22] text-zinc-300 border-white/[0.06]'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-[#FF6A00]" />
              <span>CHAT</span>
            </button>
          )}

          {roomId ? (
            <button
              onClick={copyRoomLink}
              title="Copy room link"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1c1d22] border border-white/[0.06] text-[10px] font-bold text-zinc-300 hover:text-white"
            >
              {copiedLink ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'COPIED' : 'INVITE'}</span>
            </button>
          ) : (
            <button
              onClick={() => setMultiplayerModalOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FF6A00]/15 hover:bg-[#FF6A00]/25 border border-[#FF6A00]/30 text-[#FF6A00] text-[10px] font-bold transition shrink-0 cursor-pointer"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>ONLINE</span>
            </button>
          )}

          <button
            onClick={() => setShowEvalBar(!showEvalBar)}
            title="Toggle Live Stockfish Eval Bar"
            className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition ${
              showEvalBar
                ? 'bg-[#22242b] text-white border-white/20'
                : 'bg-transparent text-zinc-500 border-white/[0.06]'
            }`}
          >
            {showEvalBar ? 'EVAL' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Draw Status Alert */}
      {drawOfferStatus && (
        <div className="w-full py-0.5 px-2 rounded-lg bg-[#FF6A00]/20 border border-[#FF6A00]/40 text-center text-[10px] font-medium text-white shrink-0">
          {drawOfferStatus}
        </div>
      )}

      {/* Opponent Disconnected Warning */}
      {roomId && !isOpponentConnected && !gameOverResult && (
        <div className="w-full py-0.5 px-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-center text-[10px] font-bold text-amber-300 animate-pulse flex items-center justify-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>Opponent disconnected • Waiting (60s)...</span>
        </div>
      )}

      {/* 2. Opponent Player Strip */}
      <div style={{ width: boardDim, maxWidth: '100%' }} className="shrink-0 transition-all">
        <PlayerCard
          name={
            roomId
              ? topPlayerColor === 'b'
                ? myRole === 'b'
                  ? currentUser?.handle || 'You (Black)'
                  : opponentInfo?.handle || 'Opponent'
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

      {/* 3. Board Container: Takes ALL available remaining height, maintains 1:1 aspect ratio */}
      <div
        ref={boardAreaRef}
        className="flex-1 min-h-0 min-w-0 w-full flex items-center justify-center p-0.5 overflow-hidden"
      >
        <div
          style={{ width: boardDim, height: boardDim }}
          className="flex items-center justify-center shrink-0 transition-all duration-100"
        >
          {showEvalBar && (
            <div className="h-full pr-1.5 shrink-0 flex items-center">
              <EvalBar
                score={evalResult.score}
                isMate={evalResult.isMate}
                mateIn={evalResult.mateIn}
                orientation={orientation}
                visible={showEvalBar}
              />
            </div>
          )}
          <div
            style={{ width: effectiveBoardSize, height: effectiveBoardSize }}
            className="aspect-square shrink-0"
          >
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
      </div>

      {/* 4. Player Strip */}
      <div style={{ width: boardDim, maxWidth: '100%' }} className="shrink-0 transition-all">
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

      {/* 5. Mobile 4-Slot Thumb Dock (Coach | Moves | Flip | Actions) with safe area padding */}
      <div
        style={{ width: boardDim, maxWidth: '100%' }}
        className="shrink-0 w-full pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-0.5"
      >
        <MobileThumbBar
          onFlip={handleFlipBoard}
          onOpenCoach={() => setCoachSheetOpen(true)}
          hasCoach={true}
          coachHasTip={Boolean(coachCommentary)}
          onOpenScorebook={() => setMoveSheetOpen(true)}
          moveCount={history.length}
          onOpenActions={() => setOptionsSheetOpen(true)}
          onNewGame={() => handleNewGame(timeControlMinutes)}
          gameActive={gameActive}
          gameOver={Boolean(gameOverResult)}
        />
      </div>

      {/* Bottom Sheet: Move Scorebook Archive */}
      <BottomSheet
        isOpen={moveSheetOpen}
        onClose={() => setMoveSheetOpen(false)}
        title="Move Scorebook"
        subtitle={`Match ply ${history.length} · ${Math.ceil(history.length / 2)} moves`}
      >
        <div className="flex flex-col gap-3 py-1">
          <MoveHistory
            history={history}
            currentStepIndex={currentStepIndex}
            onJumpToStep={(stepIdx) => {
              handleJumpToStep(stepIdx);
              setMoveSheetOpen(false);
            }}
            fen={fen}
            onReview={() => {
              setMoveSheetOpen(false);
              handleStartGameReview();
            }}
          />
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Stockfish Coach Intel */}
      <BottomSheet
        isOpen={coachSheetOpen}
        onClose={() => setCoachSheetOpen(false)}
        title="Tactician Coach"
        subtitle="Stockfish engine evaluation & position analysis"
      >
        <div className="flex flex-col gap-3 py-1">
          <CoachCard
            commentary={coachCommentary}
            onAskHint={() => {
              handleAskHint();
              setCoachSheetOpen(false);
            }}
            onTakeBack={() => {
              handleUndo();
              setCoachSheetOpen(false);
            }}
            loadingHint={loadingHint}
            coachModeActive={coachModeActive}
            onToggleCoachMode={() => setCoachModeActive(!coachModeActive)}
          />
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Actions & Match Controls */}
      <BottomSheet
        isOpen={optionsSheetOpen}
        onClose={() => setOptionsSheetOpen(false)}
        title="Actions & Settings"
        subtitle="Surrender, draw offers, sound & game options"
      >
        <div className="flex flex-col gap-3 py-1">
          {/* In-Game Actions: Resign and Draw Offer with Safe Confirmations */}
          {!gameOverResult && (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/[0.08]">
              {roomId ? (
                <button
                  onClick={() => {
                    setOptionsSheetOpen(false);
                    handleDrawOffer();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Handshake className="w-4 h-4 text-amber-400" />
                  <span>Offer Draw</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleUndo();
                    setOptionsSheetOpen(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <span>Undo Move</span>
                </button>
              )}

              <button
                onClick={() => {
                  setOptionsSheetOpen(false);
                  setResignConfirmOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Flag className="w-4 h-4 text-red-500" />
                <span>Resign Match</span>
              </button>
            </div>
          )}

          {/* Audio Effects Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1d22] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#22c55e]" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
              <span className="text-xs font-bold text-white">Audio Effects</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-zinc-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Switch Discipline / Lobby Trigger */}
          <button
            onClick={() => {
              setOptionsSheetOpen(false);
              if (onOpenLobby) onOpenLobby();
              else window.location.href = '/play';
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-[#FF6A00]" />
            <span>Switch Game / Return to Lobby</span>
          </button>

          {/* Full Game Controls */}
          <GameControls
            onNewGame={(mins) => {
              handleNewGame(mins);
              setOptionsSheetOpen(false);
            }}
            onFlipBoard={() => {
              handleFlipBoard();
              setOptionsSheetOpen(false);
            }}
            onResign={() => {
              setOptionsSheetOpen(false);
              setResignConfirmOpen(true);
            }}
            onDrawOffer={() => {
              handleDrawOffer();
              setOptionsSheetOpen(false);
            }}
            onUndo={() => {
              handleUndo();
              setOptionsSheetOpen(false);
            }}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            vsBot={vsBot}
            onToggleVsBot={() => setVsBot(!vsBot)}
            botDifficulty={botDifficulty}
            onChangeBotDifficulty={setBotDifficulty}
            gameOver={Boolean(gameOverResult)}
          />
        </div>
      </BottomSheet>

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
