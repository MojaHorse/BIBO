'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/ChessBoard';
import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import { MorabarabaBoard } from '@/components/morabaraba/MorabarabaBoard';
import { CheckersEngine, Position } from '@/lib/checkers-engine';
import { MorabarabaEngine, PointId } from '@/lib/morabaraba-engine';
import { soundManager } from '@/lib/chess-sound';
import { haptics } from '@/lib/haptics';
import {
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';

type PreviewDiscipline = 'chess' | 'checkers' | 'morabaraba';

export function LandingBotPreview() {
  const [discipline, setDiscipline] = useState<PreviewDiscipline>('chess');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CHESS STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [chessInstance, setChessInstance] = useState(() => new Chess());
  const [chessLastMove, setChessLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [chessGameOver, setChessGameOver] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CHECKERS STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [checkersEngine, setCheckersEngine] = useState(() => new CheckersEngine());
  const [checkersState, setCheckersState] = useState(() => checkersEngine.getState());
  const [checkersLastMove, setCheckersLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [checkersGameOver, setCheckersGameOver] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. MORABARABA STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [moraEngine, setMoraEngine] = useState(() => new MorabarabaEngine(undefined, 'standard-24'));
  const [moraState, setMoraState] = useState(() => moraEngine.getState());
  const [moraSelectedPoint, setMoraSelectedPoint] = useState<PointId | null>(null);
  const [moraGameOver, setMoraGameOver] = useState<string | null>(null);

  // Bot scheduling guards (Single-flight generation counter)
  const [isBotThinking, setIsBotThinking] = useState(false);
  const botGenRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearBotTimer = useCallback(() => {
    botGenRef.current++;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsBotThinking(false);
  }, []);

  // Reset entire preview without touching external systems
  const resetGame = useCallback((disc: PreviewDiscipline = discipline) => {
    clearBotTimer();
    if (disc === 'chess') {
      const c = new Chess();
      setChessInstance(c);
      setChessLastMove(null);
      setChessGameOver(null);
    } else if (disc === 'checkers') {
      const eng = new CheckersEngine();
      setCheckersEngine(eng);
      setCheckersState(eng.getState());
      setCheckersLastMove(null);
      setCheckersGameOver(null);
    } else if (disc === 'morabaraba') {
      const eng = new MorabarabaEngine(undefined, 'standard-24');
      setMoraEngine(eng);
      setMoraState(eng.getState());
      setMoraSelectedPoint(null);
      setMoraGameOver(null);
    }
  }, [discipline, clearBotTimer]);

  const switchDiscipline = (disc: PreviewDiscipline) => {
    setDiscipline(disc);
    resetGame(disc);
  };

  // Sync sound settings
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // CHESS MOVE HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handleChessMove = useCallback(
    (from: Square, to: Square, promotion: PieceSymbol = 'q'): boolean => {
      if (isBotThinking || chessGameOver || chessInstance.turn() !== 'w') return false;

      clearBotTimer();
      try {
        const move = chessInstance.move({ from, to, promotion });
        if (!move) return false;

        setChessLastMove({ from, to });
        if (move.captured) {
          soundManager.playCapture();
          haptics.capture();
        } else {
          soundManager.playMove();
          haptics.tap();
        }

        // Check game over
        if (chessInstance.isGameOver()) {
          soundManager.playGameEnd();
          if (chessInstance.isCheckmate()) setChessGameOver('White Wins by Checkmate!');
          else if (chessInstance.isDraw()) setChessGameOver('Match Drawn');
          return true;
        }

        // Trigger Bot Move (Black)
        const currentGen = ++botGenRef.current;
        setIsBotThinking(true);

        timerRef.current = setTimeout(() => {
          if (botGenRef.current !== currentGen) return;

          const legalMoves = chessInstance.moves({ verbose: true });
          if (legalMoves.length === 0) {
            setIsBotThinking(false);
            return;
          }

          // Prioritize captures or checks, otherwise random move
          const captureMoves = legalMoves.filter((m) => m.captured);
          const botMove = captureMoves.length > 0
            ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
            : legalMoves[Math.floor(Math.random() * legalMoves.length)];

          const result = chessInstance.move(botMove);
          if (result) {
            setChessLastMove({ from: result.from as Square, to: result.to as Square });
            if (result.captured) {
              soundManager.playCapture();
              haptics.capture();
            } else {
              soundManager.playMove();
              haptics.tap();
            }

            if (chessInstance.isGameOver()) {
              soundManager.playGameEnd();
              if (chessInstance.isCheckmate()) setChessGameOver('Bot Wins by Checkmate!');
              else if (chessInstance.isDraw()) setChessGameOver('Match Drawn');
            }
          }

          setIsBotThinking(false);
          setChessInstance(new Chess(chessInstance.fen()));
        }, 500 + Math.random() * 300);

        setChessInstance(new Chess(chessInstance.fen()));
        return true;
      } catch {
        return false;
      }
    },
    [chessInstance, chessGameOver, isBotThinking, clearBotTimer]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CHECKERS MOVE HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handleCheckersMove = useCallback(
    (from: Position, to: Position) => {
      if (isBotThinking || checkersGameOver || checkersEngine.getTurn() !== 'w') return;

      clearBotTimer();
      const res = checkersEngine.makeMove(from.row, from.col, to.row, to.col);
      if (!res.success) return;

      setCheckersLastMove({ from, to });
      const newState = checkersEngine.getState();
      setCheckersState(newState);

      if (res.isCapture) {
        soundManager.playCapture();
        haptics.capture();
      } else {
        soundManager.playMove();
        haptics.tap();
      }

      if (newState.winner) {
        soundManager.playGameEnd();
        setCheckersGameOver(newState.winner === 'w' ? 'White Wins!' : 'Black Wins!');
        return;
      }

      // If turn completed and now Black's turn (Bot)
      if (newState.turn === 'b') {
        const currentGen = ++botGenRef.current;
        setIsBotThinking(true);

        const executeBotHop = () => {
          if (botGenRef.current !== currentGen) return;

          const legal = checkersEngine.getLegalMoves();
          if (legal.length > 0) {
            // Pick jump if available, otherwise first legal
            const jumps = legal.filter((m) => m.captured);
            const chosen = jumps.length > 0 ? jumps[Math.floor(Math.random() * jumps.length)] : legal[0];

            const botRes = checkersEngine.makeMove(
              chosen.from.row,
              chosen.from.col,
              chosen.to.row,
              chosen.to.col
            );

            if (botRes.success) {
              setCheckersLastMove({ from: chosen.from, to: chosen.to });
              if (botRes.isCapture) soundManager.playCapture();
              else soundManager.playMove();
            }

            const updated = checkersEngine.getState();
            setCheckersState(updated);

            if (updated.winner) {
              soundManager.playGameEnd();
              setCheckersGameOver(updated.winner === 'w' ? 'White Wins!' : 'Bot Wins!');
              setIsBotThinking(false);
              return;
            }

            // If turn did NOT switch (multi-jump in progress for Bot), execute next hop after 350ms
            if (updated.turn === 'b') {
              timerRef.current = setTimeout(executeBotHop, 350);
              return;
            }
          }

          setIsBotThinking(false);
        };

        timerRef.current = setTimeout(executeBotHop, 450 + Math.random() * 250);
      }
    },
    [checkersEngine, checkersGameOver, isBotThinking, clearBotTimer]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MORABARABA MOVE HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const triggerMoraBot = useCallback(() => {
    const currentGen = ++botGenRef.current;
    setIsBotThinking(true);

    timerRef.current = setTimeout(() => {
      if (botGenRef.current !== currentGen) return;

      const s = moraEngine.getState();
      if (s.winner) {
        setIsBotThinking(false);
        return;
      }

      // Handle Bot Placing
      if (s.phase === 'placing') {
        const openPoints = moraEngine.getActivePoints().filter((p) => moraEngine.getBoard()[p] === null);
        if (openPoints.length > 0) {
          const pt = openPoints[Math.floor(Math.random() * openPoints.length)];
          const res = moraEngine.placeCow(pt);
          if (res.success && res.millFormed) {
            // Shoot random shootable cow
            const shootable = moraEngine.getShootableCows('w');
            if (shootable.length > 0) moraEngine.shootCow(shootable[0]);
          }
        }
      } else {
        // Moving phase
        const botCows = moraEngine.getActivePoints().filter((p) => moraEngine.getBoard()[p] === 'b');
        for (const from of botCows) {
          const destinations = s.phase === 'flying'
            ? moraEngine.getActivePoints().filter((p) => moraEngine.getBoard()[p] === null)
            : moraEngine.getAdjacency(from).filter((p) => moraEngine.getBoard()[p] === null);

          if (destinations.length > 0) {
            const to = destinations[0];
            const res = moraEngine.moveCow(from, to);
            if (res.success && res.millFormed) {
              const shootable = moraEngine.getShootableCows('w');
              if (shootable.length > 0) moraEngine.shootCow(shootable[0]);
            }
            break;
          }
        }
      }

      const updated = moraEngine.getState();
      setMoraState(updated);
      if (updated.winner) {
        soundManager.playGameEnd();
        setMoraGameOver(updated.winner === 'w' ? 'White Wins!' : 'Bot Wins!');
      }

      setIsBotThinking(false);
    }, 600 + Math.random() * 300);
  }, [moraEngine]);

  const handleMoraPlace = useCallback(
    (point: PointId) => {
      if (isBotThinking || moraGameOver || moraEngine.getTurn() !== 'w') return;
      clearBotTimer();
      const res = moraEngine.placeCow(point);
      if (!res.success) return;
      soundManager.playMove();
      haptics.tap();
      const s = moraEngine.getState();
      setMoraState(s);
      if (s.shootPending) {
        soundManager.playCheck();
        return;
      }
      if (s.winner) {
        soundManager.playGameEnd();
        setMoraGameOver(s.winner === 'w' ? 'White Wins!' : 'Bot Wins!');
        return;
      }
      triggerMoraBot();
    },
    [moraEngine, moraGameOver, isBotThinking, clearBotTimer, triggerMoraBot]
  );

  const handleMoraMove = useCallback(
    (from: PointId, to: PointId) => {
      if (isBotThinking || moraGameOver || moraEngine.getTurn() !== 'w') return;
      clearBotTimer();
      const res = moraEngine.moveCow(from, to);
      if (!res.success) return;
      soundManager.playMove();
      haptics.tap();
      const s = moraEngine.getState();
      setMoraState(s);
      if (s.shootPending) {
        soundManager.playCheck();
        return;
      }
      if (s.winner) {
        soundManager.playGameEnd();
        setMoraGameOver(s.winner === 'w' ? 'White Wins!' : 'Bot Wins!');
        return;
      }
      triggerMoraBot();
    },
    [moraEngine, moraGameOver, isBotThinking, clearBotTimer, triggerMoraBot]
  );

  const handleMoraShoot = useCallback(
    (point: PointId) => {
      if (isBotThinking || moraGameOver || moraEngine.getTurn() !== 'w') return;
      clearBotTimer();
      const res = moraEngine.shootCow(point);
      if (!res.success) return;
      soundManager.playCapture();
      haptics.capture();
      const s = moraEngine.getState();
      setMoraState(s);
      if (s.winner) {
        soundManager.playGameEnd();
        setMoraGameOver(s.winner === 'w' ? 'White Wins!' : 'Bot Wins!');
        return;
      }
      triggerMoraBot();
    },
    [moraEngine, moraGameOver, isBotThinking, clearBotTimer, triggerMoraBot]
  );

  const activeGameOver =
    discipline === 'chess'
      ? chessGameOver
      : discipline === 'checkers'
      ? checkersGameOver
      : moraGameOver;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-[#121216] border border-white/10 shadow-2xl overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#FF6A00] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Interactive Preview</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-sora">
            Try a move against the BIBO Bot
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400">
            No signup required. Plays directly in your browser without saving guest data.
          </p>
        </div>

        {/* Discipline Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => switchDiscipline('chess')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              discipline === 'chess'
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Chess
          </button>
          <button
            onClick={() => switchDiscipline('checkers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              discipline === 'checkers'
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Checkers
          </button>
          <button
            onClick={() => switchDiscipline('morabaraba')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              discipline === 'morabaraba'
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Morabaraba
          </button>
        </div>
      </div>

      {/* Opponent & Player status strip */}
      <div className="flex items-center justify-between py-4 text-xs font-medium text-zinc-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
            <Bot className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>BIBO Bot (Novice)</span>
              {isBotThinking && (
                <span className="text-[10px] text-[#FF6A00] animate-pulse">Thinking...</span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400">Black pieces</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => resetGame()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer text-xs font-bold"
            title="Reset position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Board Arena */}
      <div className="relative aspect-square max-w-[480px] mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner flex items-center justify-center">
        {discipline === 'chess' && (
          <ChessBoard
            chess={chessInstance}
            orientation="w"
            lastMove={chessLastMove}
            onMove={handleChessMove}
            disabled={isBotThinking || Boolean(chessGameOver)}
            playerColor="w"
          />
        )}

        {discipline === 'checkers' && (
          <CheckersBoard
            board={checkersState.board}
            turn={checkersState.turn}
            orientation="w"
            legalMoves={checkersState.turn === 'w' ? checkersEngine.getLegalMoves() : []}
            onMove={handleCheckersMove}
            lastMove={checkersLastMove}
            activeMultiJumpPiece={checkersState.activeMultiJumpPiece}
            disabled={isBotThinking || Boolean(checkersGameOver)}
          />
        )}

        {discipline === 'morabaraba' && (
          <MorabarabaBoard
            variant="standard-24"
            board={moraState.board}
            turn={moraState.turn}
            phase={moraState.phase}
            shootPending={moraState.shootPending}
            shootableCows={moraState.shootPending ? moraEngine.getShootableCows('b') : []}
            legalMoves={moraState.turn === 'w' ? moraEngine.getLegalMoves() : []}
            onPlace={handleMoraPlace}
            onMove={handleMoraMove}
            onShoot={handleMoraShoot}
            disabled={isBotThinking || Boolean(moraGameOver)}
          />
        )}

        {/* Game Concluded Overlay Banner */}
        {activeGameOver && (
          <div className="absolute inset-0 bg-[#070608]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200 z-30">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white flex items-center justify-center mb-3 shadow-lg shadow-[#FF173D]/30">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="text-2xl font-black text-white font-sora mb-1">
              {activeGameOver}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-sm mb-6">
              Create a free tactician profile to challenge real players, climb global leaderboards, and save match replays.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF173D]/30 hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => resetGame()}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Player footer strip */}
      <div className="flex items-center justify-between pt-4 text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40 flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white">You (Visitor)</div>
            <div className="text-[11px] text-zinc-400">White pieces • Instant Guest</div>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs font-extrabold text-[#FF6A00] hover:text-[#FF173D] transition flex items-center gap-1"
        >
          <span>Sign In for Full Experience</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
