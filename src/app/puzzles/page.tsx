'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { Chess, Square, PieceSymbol } from 'chess.js';
import {
  ArrowLeft,
  Flame,
  Calendar,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  ArrowRight,
  Shield,
  Target,
  Swords,
  Crown,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Award,
} from 'lucide-react';
import { ChessBoard } from '@/components/ChessBoard';
import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import { MorabarabaBoard } from '@/components/morabaraba/MorabarabaBoard';
import { CheckersEngine, Piece, Position, CheckersMove } from '@/lib/checkers-engine';
import { MorabarabaEngine, PointId, CowColor, GamePhase, MorabarabaVariant } from '@/lib/morabaraba-engine';
import { haptics } from '@/lib/haptics';
import {
  Puzzle,
  PuzzleGameId,
  getDailyPuzzle,
  getRandomPuzzle,
  validatePuzzleMove,
  PUZZLES_DATASET,
} from '@/lib/puzzles';
import { soundManager } from '@/lib/chess-sound';
import { calculatePuzzleXp, getRankFromXp } from '@/lib/progression';
import { getPlayerSession, addSessionXp } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { loadPuzzleProgress, markPuzzleSolved, updateRushHighScore } from '@/lib/puzzle-persistence';
import { useSettings } from '@/lib/settings-context';
import { AppShell } from '@/components/AppShell';

type PuzzleMode = 'daily' | 'rush_strikes' | 'rush_timed';

function PuzzlesContent() {
  const { isAuthenticated } = useRequireAuth();
  const { settings, updateSettings } = useSettings();
  const soundEnabled = settings.soundEnabled;
  const [selectedDiscipline, setSelectedDiscipline] = useState<PuzzleGameId>('chess');
  const [mode, setMode] = useState<PuzzleMode>('daily');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(() => PUZZLES_DATASET[0]);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'opponent_moving' | 'solved' | 'failed' | 'game_over'>('idle');
  const [feedback, setFeedback] = useState<string>('Find the best move.');

  // Chess State
  const [chess, setChess] = useState<Chess>(() => new Chess(PUZZLES_DATASET[0].fen));
  const [chessLastMove, setChessLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintSquares, setHintSquares] = useState<{ from: Square; to: Square } | null>(null);

  // Checkers State
  const [checkersEngine, setCheckersEngine] = useState<CheckersEngine | null>(null);
  const [checkersBoard, setCheckersBoard] = useState<Piece[][]>([]);
  const [checkersLastMove, setCheckersLastMove] = useState<{ from: Position; to: Position } | null>(null);

  // Morabaraba State
  const [morabarabaEngine, setMorabarabaEngine] = useState<MorabarabaEngine | null>(null);
  const [morabarabaBoard, setMorabarabaBoard] = useState<Record<PointId, CowColor | null>>({} as any);
  const [morabarabaShootPending, setMorabarabaShootPending] = useState<boolean>(false);
  const [morabarabaLastMove, setMorabarabaLastMove] = useState<{ from?: PointId; to?: PointId; shot?: PointId } | null>(null);

  // Puzzle Rush telemetry & Persistent Streaks
  const [score, setScore] = useState<number>(0);
  const [strikes, setStrikes] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [rushTimeLeft, setRushTimeLeft] = useState<number>(180);
  const [userXp, setUserXp] = useState<number>(0);
  const [lastEarnedXp, setLastEarnedXp] = useState<number>(0);

  const setupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const counterTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (setupTimerRef.current) clearTimeout(setupTimerRef.current);
      if (counterTimerRef.current) clearTimeout(counterTimerRef.current);
    };
  }, []);

  // Load new puzzle setup based on game discipline
  const loadPuzzle = useCallback((newPuzzle: Puzzle) => {
    if (setupTimerRef.current) {
      clearTimeout(setupTimerRef.current);
      setupTimerRef.current = null;
    }
    if (counterTimerRef.current) {
      clearTimeout(counterTimerRef.current);
      counterTimerRef.current = null;
    }

    setCurrentPuzzle(newPuzzle);
    setStepIndex(0);
    setLastEarnedXp(0);

    if (newPuzzle.gameId === 'chess') {
      const initChess = new Chess(newPuzzle.fen);
      setChess(initChess);
      setChessLastMove(null);
      setHintSquares(null);

      if (newPuzzle.setupMove) {
        setStatus('opponent_moving');
        setFeedback(newPuzzle.setupMove.description || 'Opponent making initial blunder...');

        setupTimerRef.current = setTimeout(() => {
          const sm = newPuzzle.setupMove!;
          const moveRes = initChess.move({ from: sm.from as Square, to: sm.to as Square });
          if (moveRes) {
            setChess(new Chess(initChess.fen()));
            setChessLastMove({ from: sm.from as Square, to: sm.to as Square });
            if (moveRes.captured) soundManager.playCapture();
            else soundManager.playMove();
          }
          setStatus('idle');
          setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Punish the blunder!`);
        }, 500);
      } else {
        setStatus('idle');
        setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Identify the critical tactical sequence.`);
      }
    } else if (newPuzzle.gameId === 'checkers') {
      const b = newPuzzle.initialCheckersBoard
        ? newPuzzle.initialCheckersBoard.map((r) => [...r])
        : Array(8).fill(null).map(() => Array(8).fill(null));
      const opponentTurn = newPuzzle.turn === 'w' ? 'b' : 'w';
      const eng = new CheckersEngine({
        board: b,
        turn: newPuzzle.setupMove ? opponentTurn : newPuzzle.turn,
      });
      setCheckersEngine(eng);
      setCheckersBoard(b);
      setCheckersLastMove(null);

      if (newPuzzle.setupMove) {
        setStatus('opponent_moving');
        setFeedback(newPuzzle.setupMove.description || 'Opponent making initial blunder...');

        setupTimerRef.current = setTimeout(() => {
          const sm = newPuzzle.setupMove!;
          const [fR, fC] = sm.from.split(',').map(Number);
          const [tR, tC] = sm.to.split(',').map(Number);
          const mRes = eng.makeMove(fR, fC, tR, tC);
          setCheckersBoard(eng.getBoard().map((r) => [...r]));
          setCheckersLastMove({ from: { row: fR, col: fC }, to: { row: tR, col: tC } });
          if (mRes.isCapture) soundManager.playCapture();
          else soundManager.playMove();
          setStatus('idle');
          setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Execute the tactical strike!`);
        }, 500);
      } else {
        setStatus('idle');
        setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Identify the critical tactical sequence.`);
      }
    } else if (newPuzzle.gameId === 'morabaraba') {
      const b = newPuzzle.initialMorabarabaBoard ? { ...newPuzzle.initialMorabarabaBoard } : ({} as any);
      const variant = (newPuzzle.variant as MorabarabaVariant) || 'standard-24';
      const opponentTurn = newPuzzle.turn === 'w' ? 'b' : 'w';
      const eng = new MorabarabaEngine(
        {
          board: b,
          turn: newPuzzle.setupMove ? opponentTurn : newPuzzle.turn,
          phase: newPuzzle.morabarabaPhase || 'moving',
          unplacedW: 0,
          unplacedB: 0,
        },
        variant
      );
      setMorabarabaEngine(eng);
      setMorabarabaBoard(b);
      setMorabarabaShootPending(false);
      setMorabarabaLastMove(null);

      if (newPuzzle.setupMove) {
        setStatus('opponent_moving');
        setFeedback(newPuzzle.setupMove.description || 'Opponent making initial blunder...');

        setupTimerRef.current = setTimeout(() => {
          const sm = newPuzzle.setupMove!;
          eng.moveCow(sm.from as PointId, sm.to as PointId);
          if (sm.shot) eng.shootCow(sm.shot as PointId);
          setMorabarabaBoard({ ...eng.getState().board });
          setMorabarabaLastMove({ from: sm.from as PointId, to: sm.to as PointId });
          soundManager.playMove();
          setStatus('idle');
          setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Strike and conquer!`);
        }, 500);
      } else {
        setStatus('idle');
        setFeedback(`${newPuzzle.turn === 'w' ? 'White' : 'Black'} to move. Identify the critical tactical sequence.`);
      }
    }
  }, []);

  // Initialize client daily puzzle and persistent telemetry
  useEffect(() => {
    const daily = getDailyPuzzle(new Date(), selectedDiscipline);
    loadPuzzle(daily);

    const session = getPlayerSession();
    setUserXp(session.xp);

    const progress = loadPuzzleProgress();
    setDailyStreak(progress.dailyStreak);
    setHighScore(progress.strikesRushHighScore);
  }, [loadPuzzle, selectedDiscipline]);

  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Discipline switch handler
  const handleSelectDiscipline = (disc: PuzzleGameId) => {
    setSelectedDiscipline(disc);
    const progress = loadPuzzleProgress();
    const targetDiff = difficultyFilter === 'all' ? undefined : difficultyFilter;
    const p = mode === 'daily'
      ? getDailyPuzzle(new Date(), disc)
      : getRandomPuzzle(targetDiff, progress.solvedIds, disc);
    loadPuzzle(p);
  };

  // Difficulty switch handler (for practice / non-daily modes)
  const handleSelectDifficulty = (diff: 'all' | 'easy' | 'medium' | 'hard') => {
    setDifficultyFilter(diff);
    const progress = loadPuzzleProgress();
    const targetDiff = diff === 'all' ? undefined : diff;
    loadPuzzle(getRandomPuzzle(targetDiff, progress.solvedIds, selectedDiscipline));
  };

  // Mode switch handler
  const handleSelectMode = (newMode: PuzzleMode) => {
    setMode(newMode);
    setScore(0);
    setStrikes(0);
    setRushTimeLeft(180);

    const progress = loadPuzzleProgress();
    if (newMode === 'daily') {
      loadPuzzle(getDailyPuzzle(undefined, selectedDiscipline));
    } else if (newMode === 'rush_strikes') {
      setHighScore(progress.strikesRushHighScore);
      const targetDiff = difficultyFilter === 'all' ? undefined : difficultyFilter;
      loadPuzzle(getRandomPuzzle(targetDiff, progress.solvedIds, selectedDiscipline));
    } else if (newMode === 'rush_timed') {
      setHighScore(progress.timedRushHighScore);
      const targetDiff = difficultyFilter === 'all' ? undefined : difficultyFilter;
      loadPuzzle(getRandomPuzzle(targetDiff, progress.solvedIds, selectedDiscipline));
    }
  };

  // Timed rush countdown clock
  useEffect(() => {
    if (mode !== 'rush_timed' || status === 'game_over') return;

    const timer = setInterval(() => {
      setRushTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('game_over');
          soundManager.playGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, status]);

  const handlePuzzleSolved = () => {
    soundManager.playSuccess();
    haptics.victory();
    setStatus('solved');
    const nextScore = score + 1;
    setScore(nextScore);

    const solveRes = markPuzzleSolved(currentPuzzle.id, mode === 'daily');
    const isFirstTimeClear = solveRes.isNew || mode !== 'daily';

    const earnedXp = isFirstTimeClear ? calculatePuzzleXp(currentPuzzle.rating, stepIndex === 0) : 0;
    setLastEarnedXp(earnedXp);

    if (earnedXp > 0) {
      const updatedXp = addSessionXp(earnedXp);
      setUserXp(updatedXp);
    }

    if (mode === 'daily') {
      setDailyStreak(solveRes.streak);
    }

    if (mode === 'rush_strikes') {
      const best = updateRushHighScore('strikes', nextScore);
      setHighScore(best);
    } else if (mode === 'rush_timed') {
      const best = updateRushHighScore('timed', nextScore);
      setHighScore(best);
    }

    if (isFirstTimeClear) {
      setFeedback(`Brilliant! Tactical Sequence Completed (+${earnedXp} XP).`);
    } else {
      setFeedback(`Tactical Sequence Solved! (Practice Review · 0 XP · Already Mastered).`);
    }

    if (mode === 'rush_strikes' || mode === 'rush_timed') {
      setTimeout(() => {
        const nextDifficulty = nextScore < 4 ? 'easy' : nextScore < 9 ? 'medium' : 'hard';
        const progress = loadPuzzleProgress();
        loadPuzzle(getRandomPuzzle(nextDifficulty, progress.solvedIds, selectedDiscipline));
      }, 1200);
    }
  };

  const handlePuzzleIncorrect = () => {
    soundManager.playFailure();
    haptics.defeat();

    if (mode === 'rush_strikes' || mode === 'rush_timed') {
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);

      if (nextStrikes >= 3) {
        setStatus('game_over');
        soundManager.playGameEnd();
        setFeedback('3 Strikes! Puzzle Rush Concluded.');
      } else {
        setFeedback(`Incorrect move! Strike ${nextStrikes} of 3.`);
        setTimeout(() => {
          loadPuzzle(getRandomPuzzle(undefined, currentPuzzle.id, selectedDiscipline));
        }, 900);
      }
    } else {
      setStatus('failed');
      setFeedback('Incorrect move. Re-examine the defenders and try again!');
      setTimeout(() => {
        setStatus('idle');
      }, 1500);
    }
  };

  // 1. Chess Move Handler
  const handleChessMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (status === 'opponent_moving' || status === 'solved' || status === 'game_over') return false;

    const playedUci = `${from}${to}${promotion || ''}`;
    const result = validatePuzzleMove(currentPuzzle, stepIndex, playedUci);

    if (result.isCorrect) {
      const nextGame = new Chess(chess.fen());
      const moveRes = nextGame.move({ from, to, promotion: promotion || 'q' });
      if (!moveRes) return false;

      setChess(nextGame);
      setChessLastMove({ from, to });
      setHintSquares(null);

      if (moveRes.captured) soundManager.playCapture();
      else soundManager.playMove();

      if (result.isComplete) {
        handlePuzzleSolved();
      } else if (result.nextCounterMove) {
        setStatus('opponent_moving');
        setFeedback('Good move! Defending against counterplay...');

        counterTimerRef.current = setTimeout(() => {
          const counterUci = result.nextCounterMove!;
          const cFrom = counterUci.slice(0, 2) as Square;
          const cTo = counterUci.slice(2, 4) as Square;
          const cProm = (counterUci.slice(4, 5) || 'q') as PieceSymbol;

          const counterGame = new Chess(nextGame.fen());
          const cMoveRes = counterGame.move({ from: cFrom, to: cTo, promotion: cProm });

          if (cMoveRes) {
            setChess(counterGame);
            setChessLastMove({ from: cFrom, to: cTo });
            if (counterGame.inCheck()) soundManager.playCheck();
            else if (cMoveRes.captured) soundManager.playCapture();
            else soundManager.playMove();

            setStepIndex(stepIndex + 2);
            setStatus('idle');
            setFeedback('Find the finishing sequence!');
          }
        }, 450);
      }

      return true;
    } else {
      handlePuzzleIncorrect();
      return false;
    }
  };

  // 2. Checkers Move Handler
  const handleCheckersMove = (from: Position, to: Position) => {
    if (status === 'opponent_moving' || status === 'solved' || status === 'game_over') return;

    const playedMove = `${from.row},${from.col}->${to.row},${to.col}`;
    const result = validatePuzzleMove(currentPuzzle, stepIndex, playedMove);

    if (result.isCorrect) {
      let turnSwitched = true;
      if (checkersEngine) {
        const moveRes = checkersEngine.makeMove(from.row, from.col, to.row, to.col);
        turnSwitched = moveRes.turnSwitched;
        setCheckersBoard(checkersEngine.getBoard().map((r) => [...r]));
        setCheckersLastMove({ from, to });
        if (moveRes.isCapture) {
          soundManager.playCapture();
          haptics.capture();
        } else {
          soundManager.playMove();
          haptics.tap();
        }
      }

      if (result.isComplete) {
        handlePuzzleSolved();
      } else if (turnSwitched && result.nextCounterMove) {
        setStatus('opponent_moving');
        setFeedback('Good jump! Opponent counter-moving...');

        counterTimerRef.current = setTimeout(() => {
          const counterMoveStr = result.nextCounterMove!;
          const [cFromStr, cToStr] = counterMoveStr.split('->');
          const [cfR, cfC] = cFromStr.split(',').map(Number);
          const [ctR, ctC] = cToStr.split(',').map(Number);

          if (checkersEngine) {
            const cRes = checkersEngine.makeMove(cfR, cfC, ctR, ctC);
            setCheckersBoard(checkersEngine.getBoard().map((r) => [...r]));
            setCheckersLastMove({ from: { row: cfR, col: cfC }, to: { row: ctR, col: ctC } });
            if (cRes.isCapture) soundManager.playCapture();
            else soundManager.playMove();
          }

          setStepIndex(stepIndex + 2);
          setStatus('idle');
          setFeedback('Deliver the winning strike!');
        }, 500);
      } else {
        setStepIndex((prev) => prev + 1);
        setFeedback('Great jump! Continue the combination.');
      }
    } else {
      handlePuzzleIncorrect();
    }
  };

  // 3. Morabaraba Action Handlers
  const executeMorabarabaCounter = (counterAction: string) => {
    if (!morabarabaEngine) return;
    if (counterAction.startsWith('shoot:')) {
      const shotPt = counterAction.replace('shoot:', '') as PointId;
      morabarabaEngine.shootCow(shotPt);
      setMorabarabaBoard({ ...morabarabaEngine.getState().board });
      setMorabarabaShootPending(false);
      setMorabarabaLastMove({ shot: shotPt });
      soundManager.playCapture();
      haptics.capture();
    } else if (counterAction.includes('->')) {
      const [f, t] = counterAction.split('->') as [PointId, PointId];
      const mRes = morabarabaEngine.moveCow(f, t);
      setMorabarabaBoard({ ...morabarabaEngine.getState().board });
      setMorabarabaShootPending(mRes.millFormed);
      setMorabarabaLastMove({ from: f, to: t });
      soundManager.playMove();
      haptics.tap();
    }
  };

  const handleMorabarabaMove = (from: PointId, to: PointId) => {
    if (status === 'opponent_moving' || status === 'solved' || status === 'game_over') return;

    const playedMove = `${from}->${to}`;
    const result = validatePuzzleMove(currentPuzzle, stepIndex, playedMove);

    if (result.isCorrect) {
      let millFormed = false;
      if (morabarabaEngine) {
        const moveRes = morabarabaEngine.moveCow(from, to);
        millFormed = moveRes.millFormed;
        setMorabarabaBoard({ ...morabarabaEngine.getState().board });
        setMorabarabaShootPending(morabarabaEngine.getState().shootPending);
        setMorabarabaLastMove({ from, to });
      }

      soundManager.playMove();
      haptics.tap();

      if (result.isComplete) {
        handlePuzzleSolved();
      } else if (!millFormed && result.nextCounterMove) {
        setStatus('opponent_moving');
        setFeedback('Good positioning! Machine defending...');

        counterTimerRef.current = setTimeout(() => {
          executeMorabarabaCounter(result.nextCounterMove!);
          setStepIndex(stepIndex + 2);
          setStatus('idle');
          setFeedback('Continue your tactical offensive!');
        }, 500);
      } else {
        setStepIndex((prev) => prev + 1);
        setFeedback('Mill Formed! Tap an eligible enemy cow to shoot.');
      }
    } else {
      handlePuzzleIncorrect();
    }
  };

  const handleMorabarabaShoot = (point: PointId) => {
    if (status === 'opponent_moving' || status === 'solved' || status === 'game_over') return;

    const playedMove = `shoot:${point}`;
    const result = validatePuzzleMove(currentPuzzle, stepIndex, playedMove);

    if (result.isCorrect) {
      if (morabarabaEngine) {
        morabarabaEngine.shootCow(point);
        setMorabarabaBoard({ ...morabarabaEngine.getState().board });
        setMorabarabaShootPending(false);
        setMorabarabaLastMove({ shot: point });
      }

      soundManager.playCapture();
      haptics.capture();

      if (result.isComplete) {
        handlePuzzleSolved();
      } else if (result.nextCounterMove) {
        setStatus('opponent_moving');
        setFeedback('Cow eliminated! Opponent responding...');

        counterTimerRef.current = setTimeout(() => {
          executeMorabarabaCounter(result.nextCounterMove!);
          setStepIndex(stepIndex + 2);
          setStatus('idle');
          setFeedback('Finish the tactical sequence!');
        }, 500);
      } else {
        setStepIndex((prev) => prev + 1);
      }
    } else {
      handlePuzzleIncorrect();
    }
  };

  const handleAskHint = () => {
    if (status !== 'idle' || !currentPuzzle.moves[stepIndex]) return;
    const targetMove = currentPuzzle.moves[stepIndex];

    if (currentPuzzle.gameId === 'chess') {
      const fromSquare = targetMove.slice(0, 2) as Square;
      const toSquare = targetMove.slice(2, 4) as Square;
      setHintSquares({ from: fromSquare, to: toSquare });
      setFeedback(`Hint: Focus on piece at ${fromSquare.toUpperCase()} aiming for ${toSquare.toUpperCase()}.`);
    } else if (currentPuzzle.gameId === 'checkers') {
      setFeedback(`Checkers Hint: Move or jump from (${targetMove.split('->')[0]}).`);
    } else {
      setFeedback(`Morabaraba Hint: Look to execute ${targetMove}.`);
    }
  };

  const handleRetry = () => {
    loadPuzzle(currentPuzzle);
  };

  const handleNextPuzzle = () => {
    const progress = loadPuzzleProgress();
    loadPuzzle(getRandomPuzzle(undefined, progress.solvedIds, selectedDiscipline));
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const puzzleBoardSize = 'min(calc(100vw - 24px), calc(100dvh - 240px), 640px)';

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-bold text-zinc-400">Authenticating Puzzle Arena session...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2.5 select-none h-full min-h-0">
      {/* 1. Precision Multi-Game Toolbar */}
      <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-2 sm:px-3 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 shadow-sm">
        {/* Left: Discipline Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[#1c1d22] p-0.5 rounded-xl border border-white/[0.08] text-[11px] font-bold">
            <button
              onClick={() => handleSelectDiscipline('chess')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedDiscipline === 'chess'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>Chess</span>
            </button>
            <button
              onClick={() => handleSelectDiscipline('checkers')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedDiscipline === 'checkers'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Checkers</span>
            </button>
            <button
              onClick={() => handleSelectDiscipline('morabaraba')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedDiscipline === 'morabaraba'
                  ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#FF173D]" />
              <span>Morabaraba</span>
            </button>
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <button
              onClick={() => handleSelectMode('daily')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                mode === 'daily'
                  ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily</span>
            </button>

            <button
              onClick={() => handleSelectMode('rush_strikes')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                mode === 'rush_strikes'
                  ? 'bg-[#e60012]/20 text-[#ff4d5a] border border-[#e60012]/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>3 Strikes</span>
            </button>

            <button
              onClick={() => handleSelectMode('rush_timed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                mode === 'rush_timed'
                  ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>3 Min</span>
            </button>
          </div>

          {mode !== 'daily' && (
            <div className="flex items-center bg-[#1c1d22] p-0.5 rounded-xl border border-white/[0.08] text-[10px] font-bold">
              {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectDifficulty(d)}
                  className={`px-2 py-0.5 rounded-md uppercase transition cursor-pointer ${
                    difficultyFilter === d
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Telemetry / Streaks */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          {mode !== 'daily' ? (
            <div className="flex items-center gap-2.5">
              {mode === 'rush_timed' && (
                <div className="flex items-center gap-1 font-bold text-[#ff334b] text-xs">
                  <span>⏱</span>
                  <span>{formatTimer(rushTimeLeft)}</span>
                </div>
              )}
              <span className="text-zinc-400 font-bold text-xs">
                SCORE: <strong className="text-white">{score}</strong>
              </span>
              <span className="hidden sm:inline text-zinc-400 font-bold text-xs">
                BEST: <strong className="text-[#ffcc00]">{highScore}</strong>
              </span>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`text-xs font-black ${
                      idx < strikes ? 'text-[#ff334b] animate-pulse' : 'text-zinc-600'
                    }`}
                  >
                    {idx < strikes ? '✕' : '○'}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{dailyStreak} STREAK</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#1c1d22] border border-white/[0.06] text-xs font-mono text-zinc-300">
                <span className="text-[#ffcc00] font-bold">{userXp.toLocaleString()} XP</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Workstation 2-Column Split */}
      <div className="flex flex-col lg:flex-row gap-4 items-start justify-center flex-1 min-h-0 w-full">
        {/* Left Column: Board Canvas & Tactical Action Console */}
        <div className="flex flex-col gap-2 items-center shrink-0 w-full lg:w-auto">
          {/* Target Info Banner */}
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-white/[0.06] bg-[#16171b] h-9"
            style={{ width: puzzleBoardSize, maxWidth: '100%' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse shrink-0" />
              <h2 className="font-extrabold text-xs sm:text-sm text-white tracking-wide truncate">
                {currentPuzzle.title}
              </h2>
              <span className="font-mono text-xs text-zinc-400 font-bold shrink-0">
                [{currentPuzzle.rating} ELO]
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {status === 'opponent_moving' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                  <span>OPPONENT BLUNDER</span>
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                {currentPuzzle.theme}
              </span>
            </div>
          </div>

          {/* Tactical Board Canvas */}
          <div
            className="relative aspect-square shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-[#22242b]"
            style={{
              width: puzzleBoardSize,
              height: puzzleBoardSize,
              maxWidth: '100%',
            }}
          >
            {currentPuzzle.gameId === 'chess' && (
              <ChessBoard
                chess={chess}
                orientation={currentPuzzle.turn}
                lastMove={chessLastMove}
                hintSquares={hintSquares}
                disabled={status === 'opponent_moving' || status === 'solved' || status === 'game_over'}
                onMove={handleChessMove}
              />
            )}

            {currentPuzzle.gameId === 'checkers' && checkersEngine && (
              <CheckersBoard
                board={checkersBoard}
                turn={currentPuzzle.turn}
                orientation={currentPuzzle.turn}
                legalMoves={checkersEngine.getLegalMoves()}
                onMove={handleCheckersMove}
                lastMove={checkersLastMove}
                disabled={status === 'opponent_moving' || status === 'solved' || status === 'game_over'}
              />
            )}

            {currentPuzzle.gameId === 'morabaraba' && morabarabaEngine && (
              <MorabarabaBoard
                variant={(currentPuzzle.variant as MorabarabaVariant) || 'standard-24'}
                board={morabarabaBoard}
                turn={currentPuzzle.turn}
                phase={morabarabaEngine.getState().phase}
                shootPending={morabarabaShootPending}
                shootableCows={morabarabaEngine.getShootableCows(currentPuzzle.turn === 'w' ? 'b' : 'w')}
                legalMoves={morabarabaEngine.getLegalMoves()}
                onPlace={() => {}}
                onMove={handleMorabarabaMove}
                onShoot={handleMorabarabaShoot}
                lastMove={morabarabaLastMove}
                disabled={status === 'opponent_moving' || status === 'solved' || status === 'game_over'}
              />
            )}
          </div>

          {/* Dynamic Feedback Ribbon (Full Text Flow, Zero Clipping) */}
          <div
            className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all shadow-md w-full ${
              status === 'solved'
                ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                : status === 'failed'
                ? 'bg-[#e60012]/15 text-[#ff4d5a] border-[#e60012]/40 animate-shake'
                : status === 'game_over'
                ? 'bg-[#1c1d22] text-white border-white/[0.06]'
                : 'bg-[#16171b] text-zinc-300 border-white/[0.06]'
            }`}
            style={{ width: puzzleBoardSize, maxWidth: '100%' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="leading-snug">{feedback}</span>
              {status === 'solved' && (
                <span className="text-[10px] bg-[#22c55e] text-black px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 shadow flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-black" /> SOLVED
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Controls (Always Visible on Desktop & Mobile) */}
          <div
            className="w-full flex items-center gap-2 mt-0.5"
            style={{ width: puzzleBoardSize, maxWidth: '100%' }}
          >
            {status === 'solved' ? (
              <button
                onClick={() => {
                  haptics.victory();
                  handleNextPuzzle();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-[0.98] cursor-pointer animate-in fade-in"
              >
                <span>NEXT RECON TARGET →</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            ) : status === 'failed' ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => {
                    haptics.tap();
                    handleRetry();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#e60012] hover:bg-[#cc0010] text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer animate-in fade-in"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RETRY TACTIC</span>
                </button>
                <button
                  onClick={() => {
                    haptics.tap();
                    handleAskHint();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-amber-500/30 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Reveal Hint</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => {
                    haptics.tap();
                    handleAskHint();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.08] text-amber-400 font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Tactical Hint</span>
                </button>
                <button
                  onClick={() => {
                    haptics.tap();
                    handleRetry();
                  }}
                  className="py-2 px-3.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.08] text-zinc-300 font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mission Briefing, Tactical Telemetry & Concept Index */}
        <div className="flex flex-col lg:flex-1 min-w-[280px] max-w-[480px] gap-3 w-full pb-8">
          {/* Tactical Mission Briefing Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Tactical Directive · {selectedDiscipline.toUpperCase()}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
                {currentPuzzle.theme}
              </span>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 font-medium">
              {status === 'solved'
                ? currentPuzzle.explanation
                : `You command ${currentPuzzle.turn === 'w' ? 'White' : 'Black'}. Identify the critical vulnerability and execute the winning tactic.`}
            </p>

            {status === 'solved' && lastEarnedXp > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">RECON REWARD EARNED</span>
                <span className="font-extrabold text-[#ffcc00] text-sm">+{lastEarnedXp} XP</span>
              </div>
            )}

            {/* Directive Controls */}
            <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.06] text-xs font-bold">
              <button
                onClick={handleAskHint}
                disabled={status === 'solved' || status === 'game_over'}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-amber-500/30 text-amber-400 transition disabled:opacity-30 active:scale-95 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Reveal Tactical Hint</span>
              </button>

              {mode === 'daily' ? (
                <button
                  onClick={handleNextPuzzle}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white transition active:scale-95 shadow-md cursor-pointer"
                >
                  <span>Practice Next Target</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSelectMode(mode)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#38bdf8]/20 hover:bg-[#38bdf8]/30 border border-[#38bdf8]/40 text-[#38bdf8] transition active:scale-95 shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Rush</span>
                </button>
              )}
            </div>
          </div>

          {/* Performance Telemetry Widget */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-2.5 shadow-lg">
            <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#ffcc00]" />
              <span>Tactician Recon Standings</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
                <span className="text-[10px] text-zinc-500 block uppercase">Discipline</span>
                <span className="text-white font-bold capitalize mt-0.5 block">{selectedDiscipline}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
                <span className="text-[10px] text-zinc-500 block uppercase">Current Score</span>
                <span className="text-[#22c55e] font-bold mt-0.5 block">{score} Solved</span>
              </div>
            </div>
          </div>

          {/* Tactical Concepts Index */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-2.5 shadow-lg">
            <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {selectedDiscipline === 'chess'
                  ? 'Chess Motifs'
                  : selectedDiscipline === 'checkers'
                  ? 'Checkers Patterns'
                  : 'Morabaraba Kraal Rules'}
              </span>
            </span>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {(selectedDiscipline === 'chess'
                ? ['Back-Rank Mate', 'Royal Fork', 'Greek Gift', 'Pin', 'Skewer', 'Smothered Mate', 'Deflection']
                : selectedDiscipline === 'checkers'
                ? ['Double Jump', 'King Coronation', 'Forced Jump', 'Backward Strike', 'Corner Squeeze']
                : ['Spoke Control', 'Flike Lock', 'Mill Formation', 'Shoot Priority', 'Flying Phase Hop']
              ).map((th) => (
                <span
                  key={th}
                  className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300"
                >
                  {th}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PuzzlesPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[70vh] bg-[#111215] flex items-center justify-center font-mono text-xs text-zinc-500">
            Loading Tactical Puzzles...
          </div>
        }
      >
        <PuzzlesContent />
      </Suspense>
    </AppShell>
  );
}
