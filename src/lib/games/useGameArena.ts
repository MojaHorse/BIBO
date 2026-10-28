/**
 * BIBO Headless Game Arena Controller Hook
 * Encapsulates game loop, clocks, bot scheduling, undo snapshot stack, audio/haptic telemetry, and alerts.
 * Features single-flight ref-guarded bot execution, PlayMode state isolation, and server-authoritative clock decoupling.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IGameEngine, GameOverState, PlayerColor, GameId, PlayMode } from './types';
import { soundManager } from '../chess-sound';
import { haptics } from '../haptics';
import { getPlayerSession } from '../session';

export interface UseGameArenaOptions<TMove, TBoard, TState> {
  initialEngine: IGameEngine<TMove, TBoard, TState>;
  defaultMinutes?: number;
  initialPlayMode?: PlayMode;
  initialVsBot?: boolean;
  botColor?: PlayerColor;
  initialBotDifficulty?: 'easy' | 'medium' | 'hard';
  onMatchComplete?: (result: {
    winner: PlayerColor | 'draw';
    headline: string;
    subdeck: string;
    history: string[];
  }) => void;
  onSpecialMove?: (specialType: string, move: TMove) => void;
}

export function useGameArena<TMove, TBoard, TState>(
  options: UseGameArenaOptions<TMove, TBoard, TState>
) {
  const {
    initialEngine,
    defaultMinutes = 5,
    initialPlayMode,
    initialVsBot = true,
    botColor = 'b',
    initialBotDifficulty = 'medium',
    onMatchComplete,
    onSpecialMove,
  } = options;

  // 1. Explicit Play Mode State Machine ('bot' | 'online' | 'local')
  const [playMode, setPlayModeState] = useState<PlayMode>(() => {
    if (initialPlayMode) return initialPlayMode;
    return initialVsBot === false ? 'local' : 'bot';
  });

  // Derived backwards-compatibility property
  const vsBot = playMode === 'bot';

  const setPlayMode = useCallback((mode: PlayMode) => {
    setPlayModeState(mode);
  }, []);

  const setVsBot = useCallback((val: boolean) => {
    setPlayModeState(val ? 'bot' : 'local');
  }, []);

  // 2. Engine & Board State
  const [engine, setEngine] = useState<IGameEngine<TMove, TBoard, TState>>(initialEngine);
  const [board, setBoard] = useState<TBoard>(() => initialEngine.getBoard());
  const [turn, setTurn] = useState<PlayerColor>(() => initialEngine.getTurn());
  const [engineState, setEngineState] = useState<TState>(() => initialEngine.getState());
  const [legalMoves, setLegalMoves] = useState<TMove[]>(() => initialEngine.getLegalMoves());
  const [history, setHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<TMove | null>(null);

  // 3. Clocks & Timers
  const [timeControlMinutes, setTimeControlMinutes] = useState<number>(defaultMinutes);
  const [whiteTime, setWhiteTime] = useState<number>(defaultMinutes * 60);
  const [blackTime, setBlackTime] = useState<number>(defaultMinutes * 60);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
  const [dismissGameOverModal, setDismissGameOverModal] = useState<boolean>(false);

  // 4. Orientation & Difficulty
  const [orientation, setOrientation] = useState<PlayerColor>('w');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialBotDifficulty);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 5. Single-Flight Ref-Guarded Bot Scheduler
  const isThinkingRef = useRef<boolean>(false);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const botGenerationRef = useRef<number>(0);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  const cancelPendingBot = useCallback(() => {
    botGenerationRef.current++;
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    isThinkingRef.current = false;
    setIsBotThinking(false);
  }, []);

  // 6. Undo / Navigation Stack
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [snapshots, setSnapshots] = useState<{
    engine: IGameEngine<TMove, TBoard, TState>;
    timeW: number;
    timeB: number;
    lastMove: TMove | null;
  }[]>([]);

  // 7. Tactical Alert System
  const [tacticalAlert, setTacticalAlert] = useState<string | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAlert = useCallback((msg: string, durationMs = 4000) => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    setTacticalAlert(msg);
    alertTimeoutRef.current = setTimeout(() => {
      setTacticalAlert(null);
    }, durationMs);
  }, []);

  // 8. User Session Info
  const [session, setSession] = useState({
    handle: 'Tactician',
    rating: 1200,
  });

  useEffect(() => {
    const s = getPlayerSession();
    setSession({
      handle: s.displayName || s.handle,
      rating: s.rating,
    });
  }, []);

  // Sync internal engine state helper
  const syncStateFromEngine = useCallback((eng: IGameEngine<TMove, TBoard, TState>) => {
    setBoard(eng.getBoard());
    setTurn(eng.getTurn());
    setEngineState(eng.getState());
    setLegalMoves(eng.getLegalMoves());

    const winner = eng.checkWinner();
    if (winner) {
      soundManager.playGameEnd();
      haptics.victory();
      setGameOver(winner);
      setGameActive(false);
      if (onMatchComplete) {
        onMatchComplete({
          winner: winner.winner || 'draw',
          headline: winner.headline,
          subdeck: winner.subdeck,
          history: [...((eng.getState() as any)?.history || [])],
        });
      }
    }
  }, [onMatchComplete]);

  const updateEngine = useCallback((eng: IGameEngine<TMove, TBoard, TState>) => {
    setEngine(eng);
    syncStateFromEngine(eng);
  }, [syncStateFromEngine]);

  // Execute Move
  const executeMove = useCallback((move: TMove, isBotMove = false) => {
    if (gameOver) return false;

    // Invalidate any in-flight bot computation from the previous turn only when user moves
    if (!isBotMove) {
      botGenerationRef.current++;
      const snap = {
        engine: engine.clone(),
        timeW: whiteTime,
        timeB: blackTime,
        lastMove,
      };
      setSnapshots((prev) => [...prev, snap]);
    }

    const res = engine.makeMove(move);
    if (!res.success) return false;

    // Sound & Haptic Telemetry
    if (res.captured) {
      soundManager.playCapture();
      haptics.capture();
    } else {
      soundManager.playMove();
      haptics.tap();
    }

    if (res.isSpecial && res.specialType) {
      if (onSpecialMove) onSpecialMove(res.specialType, move);
    }

    if (!gameActive) setGameActive(true);
    setLastMove(move);

    // Sync state
    syncStateFromEngine(engine);

    // History tracking
    const currentHist = (engine.getState() as any)?.history;
    if (Array.isArray(currentHist)) {
      setHistory([...currentHist]);
      setCurrentStepIndex(currentHist.length - 1);
    }

    return true;
  }, [engine, gameOver, whiteTime, blackTime, lastMove, gameActive, syncStateFromEngine, onSpecialMove]);

  // Sync sound manager enabled state
  useEffect(() => {
    soundManager.enabled = soundEnabled;
  }, [soundEnabled]);

  // Handle Timeout
  const handleTimeOut = useCallback((flaggedColor: PlayerColor) => {
    const winnerColor: PlayerColor = flaggedColor === 'w' ? 'b' : 'w';
    soundManager.playGameEnd();
    haptics.victory();
    const overState: GameOverState = {
      isOver: true,
      winner: winnerColor,
      headline: `${winnerColor === 'w' ? 'White' : 'Black'} Wins on Time!`,
      subdeck: `${flaggedColor === 'w' ? 'White' : 'Black'} ran out of time on the clock.`,
    };
    setGameOver(overState);
    setGameActive(false);
  }, []);

  // Countdown Clock Interval: Active strictly in 'bot' and 'local' modes.
  // In 'online' mode, the server room is authoritative for clocks; client does NOT self-decrement.
  useEffect(() => {
    if (!gameActive || gameOver || playMode === 'online') return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeOut('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeOut('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive, turn, gameOver, playMode, handleTimeOut]);

  // Single-Flight Ref-Guarded Bot Auto-Response
  useEffect(() => {
    // Only schedule bot if in 'bot' mode, on botColor's turn, and match is active
    if (playMode !== 'bot' || turn !== botColor || gameOver) {
      if (isThinkingRef.current || botTimerRef.current) {
        cancelPendingBot();
      }
      return;
    }

    // Protection against duplicate scheduling: if already in flight, do not launch parallel
    if (isThinkingRef.current) return;

    const currentGeneration = ++botGenerationRef.current;
    const positionSnapshot = engine.getFenOrSnapshot();

    isThinkingRef.current = true;
    setIsBotThinking(true);

    const delay = Math.random() * 200 + 350;

    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }

    botTimerRef.current = setTimeout(async () => {
      try {
        // Stale-result check 1: Has generation changed while in delay?
        if (botGenerationRef.current !== currentGeneration) return;
        if (engine.getTurn() !== botColor) return;

        const botMove = await engine.findBotMove(botDifficulty);

        // Stale-result check 2: Has generation, turn, or position changed during async compute?
        if (botGenerationRef.current !== currentGeneration) return;
        if (engine.getTurn() !== botColor) return;
        if (engine.getFenOrSnapshot() !== positionSnapshot) return;

        if (botMove) {
          executeMove(botMove, true);

          // Multi-jump loop for Checkers or multi-step engine moves where turn stays with bot
          while (
            engine.getTurn() === botColor &&
            !engine.checkWinner() &&
            botGenerationRef.current === currentGeneration
          ) {
            await new Promise((r) => setTimeout(r, 350));
            if (
              botGenerationRef.current !== currentGeneration ||
              engine.getTurn() !== botColor ||
              engine.checkWinner()
            ) {
              break;
            }
            const nextHop = await engine.findBotMove(botDifficulty);
            if (!nextHop) break;
            executeMove(nextHop, true);
          }
        } else {
          // No legal bot moves -> evaluate checkmate / draw
          syncStateFromEngine(engine);
        }
      } catch (err) {
        console.error('[useGameArena] Bot calculation error:', err);
        triggerAlert('Bot calculation error occurred.');
      } finally {
        if (botGenerationRef.current === currentGeneration) {
          isThinkingRef.current = false;
          setIsBotThinking(false);
          botTimerRef.current = null;
        }
      }
    }, delay);

    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [turn, playMode, botColor, gameOver, botDifficulty, engine, executeMove, syncStateFromEngine, cancelPendingBot, triggerAlert]);

  // Takeback / Undo
  const takeBack = useCallback(() => {
    if (snapshots.length === 0 || gameOver) return;
    cancelPendingBot();
    haptics.tap();

    let targetIdx = snapshots.length - 1;
    // If playing in 'bot' mode and it's currently the player's turn, revert both player and bot moves (2 plies)
    if (playMode === 'bot' && snapshots.length >= 2 && turn !== botColor) {
      targetIdx = snapshots.length - 2;
    }

    const snap = snapshots[targetIdx];
    const restoredEngine = snap.engine.clone();

    setEngine(restoredEngine);
    setWhiteTime(snap.timeW);
    setBlackTime(snap.timeB);
    setLastMove(snap.lastMove);
    setSnapshots((prev) => prev.slice(0, targetIdx));

    syncStateFromEngine(restoredEngine);

    const hist = (restoredEngine.getState() as any)?.history;
    if (Array.isArray(hist)) {
      setHistory([...hist]);
      setCurrentStepIndex(hist.length - 1);
    }

    triggerAlert('Move retracted: Position restored.');
  }, [snapshots, gameOver, playMode, turn, botColor, syncStateFromEngine, triggerAlert, cancelPendingBot]);

  // Jump to specific step in move history
  const jumpToStep = useCallback((stepIdx: number) => {
    if (stepIdx < -1 || stepIdx >= snapshots.length) return;
    cancelPendingBot();

    if (stepIdx === -1) {
      const initialEng = initialEngine.clone();
      initialEng.reset();
      setEngine(initialEng);
      setWhiteTime(timeControlMinutes * 60);
      setBlackTime(timeControlMinutes * 60);
      setLastMove(null);
      setCurrentStepIndex(-1);
      syncStateFromEngine(initialEng);
      return;
    }

    const snap = snapshots[stepIdx];
    const restoredEngine = snap.engine.clone();

    setEngine(restoredEngine);
    setWhiteTime(snap.timeW);
    setBlackTime(snap.timeB);
    setLastMove(snap.lastMove);
    setCurrentStepIndex(stepIdx);
    syncStateFromEngine(restoredEngine);
  }, [snapshots, initialEngine, timeControlMinutes, syncStateFromEngine, cancelPendingBot]);

  // Agree Draw
  const drawOffer = useCallback(() => {
    if (gameOver) return;
    cancelPendingBot();
    haptics.tap();
    soundManager.playGameEnd();
    const overState: GameOverState = {
      isOver: true,
      winner: 'draw',
      headline: 'DRAW AGREED',
      subdeck: 'Match ended by mutual agreement.',
    };
    setGameOver(overState);
    setGameActive(false);
  }, [gameOver, cancelPendingBot]);

  // Flip Board Orientation
  const flipOrientation = useCallback(() => {
    setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
  }, []);

  // Resign Match
  const resign = useCallback((resigningColor: PlayerColor = 'w') => {
    if (gameOver) return;
    cancelPendingBot();
    haptics.tap();
    const winner: PlayerColor = resigningColor === 'w' ? 'b' : 'w';
    soundManager.playGameEnd();
    haptics.victory();
    const overState: GameOverState = {
      isOver: true,
      winner,
      headline: `${winner === 'w' ? 'White' : 'Black'} Wins by Resignation`,
      subdeck: `${resigningColor === 'w' ? 'White' : 'Black'} has conceded the match.`,
    };
    setGameOver(overState);
    setGameActive(false);
  }, [gameOver, cancelPendingBot]);

  // Reset Game
  const resetGame = useCallback((mins = defaultMinutes, newEngine?: IGameEngine<TMove, TBoard, TState>) => {
    cancelPendingBot();
    haptics.tap();
    const targetEngine = newEngine ? newEngine : initialEngine.clone();
    if (!newEngine) targetEngine.reset();

    setTimeControlMinutes(mins);
    setEngine(targetEngine);
    setWhiteTime(mins * 60);
    setBlackTime(mins * 60);
    setGameActive(false);
    setGameOver(null);
    setDismissGameOverModal(false);
    setLastMove(null);
    setHistory([]);
    setCurrentStepIndex(-1);
    setSnapshots([]);
    setTacticalAlert(null);
    syncStateFromEngine(targetEngine);
  }, [defaultMinutes, initialEngine, syncStateFromEngine, cancelPendingBot]);

  return {
    // Mode State Machine
    playMode,
    setPlayMode,
    vsBot,
    setVsBot,
    cancelPendingBot,

    // Engine State
    engine,
    setEngine: updateEngine,
    board,
    turn,
    engineState,
    legalMoves,
    history,
    setHistory,
    currentStepIndex,
    setCurrentStepIndex,
    jumpToStep,
    lastMove,
    setLastMove,
    snapshots,
    isMatchInProgress: history.length > 0 && !gameOver,

    // Controls
    executeMove,
    takeBack,
    undo: takeBack,
    canTakeBack: snapshots.length > 0 && !gameOver,
    resign,
    drawOffer,
    resetGame,

    // Telemetry & Clocks
    timeControlMinutes,
    setTimeControlMinutes,
    whiteTime,
    setWhiteTime,
    blackTime,
    setBlackTime,
    gameActive,
    setGameActive,
    gameOver,
    setGameOver,
    dismissGameOverModal,
    setDismissGameOverModal,
    session,

    // Orientation & Sound
    orientation,
    setOrientation,
    flipOrientation,
    soundEnabled,
    setSoundEnabled,

    // Bot AI
    botColor,
    botDifficulty,
    setBotDifficulty,
    isBotThinking,

    // Alerts
    tacticalAlert,
    triggerAlert,
  };
}
