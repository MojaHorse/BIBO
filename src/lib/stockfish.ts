// Client-side Stockfish Worker UCI client & Game Review analyzer
import { Chess, Square } from 'chess.js';

export interface EvalResult {
  score: number; // in pawns (+1.5 = White +1.5 pawns, -2.0 = Black +2 pawns)
  isMate: boolean;
  mateIn?: number;
  bestMove?: string;
  depth: number;
}

export interface MoveAnalysis {
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  from?: Square;
  to?: Square;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number;
  evalAfter: number;
  cpLoss: number;
  classification: 'brilliant' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  bestMove?: string;
  bestMoveSan?: string;
  bestMoveSquare?: { from: Square; to: Square };
  commentary?: string;
}

export interface GameReviewReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whitePerformanceElo: number;
  blackPerformanceElo: number;
  whiteBreakdown: Record<MoveAnalysis['classification'], number>;
  blackBreakdown: Record<MoveAnalysis['classification'], number>;
  moves: MoveAnalysis[];
}

class StockfishClient {
  private worker: Worker | null = null;
  private isReady = false;
  private evalCache: Map<string, EvalResult> = new Map();
  private readonly MAX_CACHE_SIZE = 500;

  public clearCache(): void {
    this.evalCache.clear();
  }

  private initWorker(): Promise<void> {
    if (this.worker && this.isReady) return Promise.resolve();
    if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 3000);

      try {
        this.worker = new Worker('/engine/stockfish.js');
        this.worker.onmessage = (e) => {
          const line = typeof e.data === 'string' ? e.data : '';
          if (line === 'uciok') {
            this.isReady = true;
            clearTimeout(timer);
            resolve();
          }
        };
        this.worker.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
        this.worker.postMessage('uci');
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  // Evaluate a single FEN position with in-memory caching and defensive timeout
  public async evaluatePosition(fen: string, depth: number = 10): Promise<EvalResult> {
    const cacheKey = `${fen}::d${depth}`;
    const cached = this.evalCache.get(cacheKey);
    if (cached) return cached;

    await this.initWorker();
    const currentWorker = this.worker;
    if (!currentWorker) throw new Error('Worker unavailable');

    return new Promise((resolve) => {
      let latestScore = 0;
      let isMate = false;
      let mateIn: number | undefined;
      let currentDepth = depth;
      let bestMove: string | undefined;
      let finished = false;

      const finish = (res: EvalResult) => {
        if (finished) return;
        finished = true;
        if (timeoutId) clearTimeout(timeoutId);
        currentWorker.removeEventListener('message', messageHandler);

        // Manage cache cap
        if (this.evalCache.size >= this.MAX_CACHE_SIZE) {
          const oldestKey = this.evalCache.keys().next().value;
          if (oldestKey) this.evalCache.delete(oldestKey);
        }
        this.evalCache.set(cacheKey, res);
        resolve(res);
      };

      // 5-second defensive safety timeout
      const timeoutId = setTimeout(() => {
        finish({
          score: Number(latestScore.toFixed(2)),
          isMate,
          mateIn,
          bestMove,
          depth: currentDepth,
        });
      }, 5000);

      const messageHandler = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';

        // Parse UCI info line: "info depth 8 score cp 45 pv ..." or "score mate -2"
        if (line.startsWith('info') && line.includes('score')) {
          const depthMatch = line.match(/depth\s+(\d+)/);
          if (depthMatch) currentDepth = parseInt(depthMatch[1]);

          const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
          if (cpMatch) {
            isMate = false;
            // Stockfish reports score from perspective of player whose turn it is.
            // Normalize so positive = White advantage, negative = Black advantage.
            const turnIsWhite = fen.includes(' w ');
            const rawCp = parseInt(cpMatch[1]);
            latestScore = turnIsWhite ? rawCp / 100 : -rawCp / 100;
          }

          const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
          if (mateMatch) {
            isMate = true;
            const rawMate = parseInt(mateMatch[1]);
            const turnIsWhite = fen.includes(' w ');
            mateIn = turnIsWhite ? rawMate : -rawMate;
            latestScore = (mateIn > 0 ? 100 : -100);
          }
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          bestMove = parts[1];
          finish({
            score: Number(latestScore.toFixed(2)),
            isMate,
            mateIn,
            bestMove,
            depth: currentDepth,
          });
        }
      };

      currentWorker.addEventListener('message', messageHandler);
      currentWorker.postMessage(`position fen ${fen}`);
      currentWorker.postMessage(`go depth ${depth}`);
    });
  }

  // Full post-game review
  public async reviewGame(fens: string[], sanMoves: string[]): Promise<GameReviewReport> {
    const moves: MoveAnalysis[] = [];

    const whiteBreakdown: Record<MoveAnalysis['classification'], number> = {
      brilliant: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };

    const blackBreakdown: Record<MoveAnalysis['classification'], number> = {
      brilliant: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };

    // Sequential evaluation of all distinct positions
    const evals: EvalResult[] = [];
    for (let k = 0; k < fens.length; k++) {
      const res = await this.evaluatePosition(fens[k], 8);
      evals.push(res);
    }

    for (let i = 0; i < sanMoves.length; i++) {
      const color: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';
      const moveNum = Math.floor(i / 2) + 1;
      const fenBefore = fens[i] || fens[0];
      const fenAfter = fens[i + 1] || fens[fens.length - 1];

      const prevEval = evals[i]?.score ?? 0.2;
      const currentEval = evals[i + 1]?.score ?? prevEval;
      const rawBestMove = evals[i]?.bestMove;

      // Centipawn loss from perspective of mover
      let cpLoss = 0;
      if (color === 'w') {
        cpLoss = Math.max(0, Math.round((prevEval - currentEval) * 100));
      } else {
        cpLoss = Math.max(0, Math.round((currentEval - prevEval) * 100));
      }

      let classification: MoveAnalysis['classification'] = 'good';
      if (cpLoss <= 10) classification = 'best';
      else if (cpLoss <= 25) classification = 'excellent';
      else if (cpLoss <= 70) classification = 'good';
      else if (cpLoss <= 150) classification = 'inaccuracy';
      else if (cpLoss <= 300) classification = 'mistake';
      else classification = 'blunder';

      // Brilliant move: top engine move in a non-crushing position that delivers a decisive tactical swing
      const evalGain = color === 'w' ? (currentEval - prevEval) : (prevEval - currentEval);
      if (cpLoss <= 5 && Math.abs(prevEval) <= 1.8 && evalGain >= 1.5) {
        classification = 'brilliant';
      }

      if (color === 'w') whiteBreakdown[classification]++;
      else blackBreakdown[classification]++;

      // Parse played move squares and best move recommendation
      let fromSquare: Square | undefined;
      let toSquare: Square | undefined;
      let bestMoveSan: string | undefined;
      let bestMoveSquare: { from: Square; to: Square } | undefined;

      try {
        const cBefore = new Chess(fenBefore);
        const played = cBefore.move(sanMoves[i]);
        if (played) {
          fromSquare = played.from as Square;
          toSquare = played.to as Square;
        }

        if (rawBestMove && rawBestMove.length >= 4) {
          const bFrom = rawBestMove.slice(0, 2) as Square;
          const bTo = rawBestMove.slice(2, 4) as Square;
          const bProm = rawBestMove.length > 4 ? rawBestMove[4] : undefined;
          bestMoveSquare = { from: bFrom, to: bTo };

          const cBest = new Chess(fenBefore);
          const bestM = cBest.move({ from: bFrom, to: bTo, promotion: bProm || 'q' });
          if (bestM) {
            bestMoveSan = bestM.san;
          }
        }
      } catch {
        // ignore parse errors
      }

      // Contextual commentary
      let commentary = '';
      if (classification === 'brilliant') {
        commentary = `Brilliant tactic! Sharpest continuation (${currentEval > 0 ? '+' : ''}${currentEval.toFixed(1)}).`;
      } else if (classification === 'best') {
        commentary = `Top engine choice. Maintains optimum pressure.`;
      } else if (classification === 'excellent') {
        commentary = `Strong positional move, consolidating development.`;
      } else if (classification === 'good') {
        commentary = `Solid continuation, keeping the position sound.`;
      } else if (classification === 'inaccuracy') {
        commentary = bestMoveSan
          ? `Inaccuracy (-${(cpLoss / 100).toFixed(1)}). Engine preferred ${bestMoveSan}.`
          : `Slight inaccuracy, relinquishing minor initiative.`;
      } else if (classification === 'mistake') {
        commentary = bestMoveSan
          ? `Tactical mistake! Lost ${(cpLoss / 100).toFixed(1)} pawns. Better was ${bestMoveSan}.`
          : `Positional mistake costing ${(cpLoss / 100).toFixed(1)} pawns.`;
      } else if (classification === 'blunder') {
        commentary = bestMoveSan
          ? `Severe blunder (-${(cpLoss / 100).toFixed(1)} pawns)! Stockfish recommended ${bestMoveSan}.`
          : `Critical blunder forfeiting decisive advantage.`;
      }

      moves.push({
        moveNumber: moveNum,
        color,
        san: sanMoves[i],
        from: fromSquare,
        to: toSquare,
        fenBefore,
        fenAfter,
        evalBefore: prevEval,
        evalAfter: currentEval,
        cpLoss,
        classification,
        bestMove: rawBestMove,
        bestMoveSan,
        bestMoveSquare,
        commentary,
      });
    }

    // CAPS formula approximation
    const calcAccuracy = (analyzed: MoveAnalysis[]) => {
      if (analyzed.length === 0) return 90;
      const totalCpLoss = analyzed.reduce((sum, m) => sum + m.cpLoss, 0);
      const avgLoss = totalCpLoss / analyzed.length;
      return Math.max(20, Math.min(99.5, Math.round(100 - avgLoss * 0.45)));
    };

    const calcPerformanceElo = (accuracy: number): number => {
      const base = 600;
      const rating = base + Math.pow(accuracy / 100, 2.2) * 2100;
      return Math.min(2850, Math.max(600, Math.round(rating / 10) * 10));
    };

    const whiteMoves = moves.filter((m) => m.color === 'w');
    const blackMoves = moves.filter((m) => m.color === 'b');
    const whiteAccuracy = calcAccuracy(whiteMoves);
    const blackAccuracy = calcAccuracy(blackMoves);

    return {
      whiteAccuracy,
      blackAccuracy,
      whitePerformanceElo: calcPerformanceElo(whiteAccuracy),
      blackPerformanceElo: calcPerformanceElo(blackAccuracy),
      whiteBreakdown,
      blackBreakdown,
      moves,
    };
  }
}

export const stockfishClient = new StockfishClient();
