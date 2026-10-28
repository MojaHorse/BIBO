/**
 * Morabaraba (Umlabalaba) Pure TypeScript Game Engine
 * Supports:
 * 1. Traditional 24-Point Board (Standard Tournament / MSSA Rules with Mill Immunity)
 * 2. 25-Point Koti Board (Lesotho / Sotho Cultural Variant with Center Dot C0 and No Mill Immunity)
 */

export type MorabarabaVariant = 'standard-24' | 'koti-25';
export type CowColor = 'w' | 'b'; // 'w' = White / Gold, 'b' = Black / Obsidian
export type GamePhase = 'placing' | 'moving' | 'flying';

// Point identifiers:
// Outer ring: O0..O7
// Middle ring: M0..M7
// Inner ring: I0..I7
// Center point (Koti only): C0
export type PointId =
  | 'O0' | 'O1' | 'O2' | 'O3' | 'O4' | 'O5' | 'O6' | 'O7'
  | 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7'
  | 'I0' | 'I1' | 'I2' | 'I3' | 'I4' | 'I5' | 'I6' | 'I7'
  | 'C0';

export interface MorabarabaGameState {
  variant: MorabarabaVariant;
  board: Record<PointId, CowColor | null>;
  turn: CowColor;
  phase: GamePhase;
  unplacedW: number; // starts at 12
  unplacedB: number; // starts at 12
  capturedW: number; // white cows shot by black
  capturedB: number; // black cows shot by white
  shootPending: boolean; // true when current player must select an opponent cow to shoot
  shootCount: number; // number of cows to shoot (usually 1, or 2 if double-mill formed)
  winner: CowColor | 'draw' | null;
  history: string[];
  lastMove: { from?: PointId; to?: PointId; shot?: PointId } | null;
}

// 24 Standard Points
export const ALL_24_POINTS: PointId[] = [
  'O0', 'O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7',
  'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7',
  'I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7',
];

export const ALL_25_POINTS: PointId[] = [...ALL_24_POINTS, 'C0'];

// Adjacency Graph Definitions
export const ADJACENCY_24: Record<PointId, PointId[]> = {
  // Outer Ring
  O0: ['O1', 'O7', 'M0'],
  O1: ['O0', 'O2', 'M1'],
  O2: ['O1', 'O3', 'M2'],
  O3: ['O2', 'O4', 'M3'],
  O4: ['O3', 'O5', 'M4'],
  O5: ['O4', 'O6', 'M5'],
  O6: ['O5', 'O7', 'M6'],
  O7: ['O6', 'O0', 'M7'],

  // Middle Ring
  M0: ['M1', 'M7', 'O0', 'I0'],
  M1: ['M0', 'M2', 'O1', 'I1'],
  M2: ['M1', 'M3', 'O2', 'I2'],
  M3: ['M2', 'M4', 'O3', 'I3'],
  M4: ['M3', 'M5', 'O4', 'I4'],
  M5: ['M4', 'M6', 'O5', 'I5'],
  M6: ['M5', 'M7', 'O6', 'I6'],
  M7: ['M6', 'M0', 'O7', 'I7'],

  // Inner Ring (Standard: open center)
  I0: ['I1', 'I7', 'M0'],
  I1: ['I0', 'I2', 'M1'],
  I2: ['I1', 'I3', 'M2'],
  I3: ['I2', 'I4', 'M3'],
  I4: ['I3', 'I5', 'M4'],
  I5: ['I4', 'I6', 'M5'],
  I6: ['I5', 'I7', 'M6'],
  I7: ['I6', 'I0', 'M7'],

  C0: [], // Not connected in 24-point
};

// 25-Point Koti Adjacency: center dot C0 connects to all 8 points of the inner ring
export const ADJACENCY_25: Record<PointId, PointId[]> = {
  ...ADJACENCY_24,
  I0: ['I1', 'I7', 'M0', 'C0'],
  I1: ['I0', 'I2', 'M1', 'C0'],
  I2: ['I1', 'I3', 'M2', 'C0'],
  I3: ['I2', 'I4', 'M3', 'C0'],
  I4: ['I3', 'I5', 'M4', 'C0'],
  I5: ['I4', 'I6', 'M5', 'C0'],
  I6: ['I5', 'I7', 'M6', 'C0'],
  I7: ['I6', 'I0', 'M7', 'C0'],
  C0: ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7'],
};

// 20 Standard Mills on 24-Point Board
export const MILLS_24: [PointId, PointId, PointId][] = [
  // Outer Ring Sides (4)
  ['O0', 'O1', 'O2'],
  ['O2', 'O3', 'O4'],
  ['O4', 'O5', 'O6'],
  ['O6', 'O7', 'O0'],

  // Middle Ring Sides (4)
  ['M0', 'M1', 'M2'],
  ['M2', 'M3', 'M4'],
  ['M4', 'M5', 'M6'],
  ['M6', 'M7', 'M0'],

  // Inner Ring Sides (4)
  ['I0', 'I1', 'I2'],
  ['I2', 'I3', 'I4'],
  ['I4', 'I5', 'I6'],
  ['I6', 'I7', 'I0'],

  // Orthogonal Spokes (4)
  ['O1', 'M1', 'I1'],
  ['O3', 'M3', 'I3'],
  ['O5', 'M5', 'I5'],
  ['O7', 'M7', 'I7'],

  // Diagonal Spokes (4)
  ['O0', 'M0', 'I0'],
  ['O2', 'M2', 'I2'],
  ['O4', 'M4', 'I4'],
  ['O6', 'M6', 'I6'],
];

// Additional 4 Mills through C0 on 25-Point Koti Board
export const MILLS_25: [PointId, PointId, PointId][] = [
  ...MILLS_24,
  ['I1', 'C0', 'I5'], // Vertical
  ['I7', 'C0', 'I3'], // Horizontal
  ['I0', 'C0', 'I4'], // Main diagonal
  ['I2', 'C0', 'I6'], // Anti diagonal
];

export class MorabarabaEngine {
  private variant: MorabarabaVariant;
  private board: Record<PointId, CowColor | null>;
  private turn: CowColor;
  private phase: GamePhase;
  private unplacedW: number;
  private unplacedB: number;
  private capturedW: number;
  private capturedB: number;
  private shootPending: boolean;
  private shootCount: number;
  private winner: CowColor | 'draw' | null;
  private history: string[];
  private lastMove: { from?: PointId; to?: PointId; shot?: PointId } | null;

  constructor(state?: Partial<MorabarabaGameState>, variant: MorabarabaVariant = 'standard-24') {
    this.variant = state?.variant || variant;
    this.board = state?.board ? { ...state.board } : this.getInitialBoard();
    this.turn = state?.turn || 'w';
    this.phase = state?.phase || 'placing';
    this.unplacedW = state?.unplacedW !== undefined ? state.unplacedW : 12;
    this.unplacedB = state?.unplacedB !== undefined ? state.unplacedB : 12;
    this.capturedW = state?.capturedW || 0;
    this.capturedB = state?.capturedB || 0;
    this.shootPending = Boolean(state?.shootPending);
    this.shootCount = state?.shootCount || 0;
    this.winner = state?.winner || null;
    this.history = state?.history ? [...state.history] : [];
    this.lastMove = state?.lastMove ? { ...state.lastMove } : null;
  }

  public static createMovingPhaseQuickStart(variant: MorabarabaVariant = 'standard-24'): MorabarabaEngine {
    const b: Record<PointId, CowColor | null> = {} as any;
    const points = variant === 'koti-25' ? ALL_25_POINTS : ALL_24_POINTS;
    for (const p of points) b[p] = null;
    if (variant === 'standard-24') b.C0 = null;

    // Pre-place 6 White cows and 6 Black cows in balanced positions without starting mills
    b.O0 = 'w';
    b.O3 = 'w';
    b.M1 = 'w';
    b.M5 = 'w';
    b.I2 = 'w';
    b.I6 = 'w';

    b.O4 = 'b';
    b.O7 = 'b';
    b.M3 = 'b';
    b.M7 = 'b';
    b.I0 = 'b';
    b.I4 = 'b';

    return new MorabarabaEngine({
      variant,
      board: b,
      turn: 'w',
      phase: 'moving',
      unplacedW: 0,
      unplacedB: 0,
      capturedW: 0,
      capturedB: 0,
      shootPending: false,
      shootCount: 0,
      winner: null,
      history: [],
      lastMove: null,
    });
  }

  public getInitialBoard(): Record<PointId, CowColor | null> {
    const b: Record<PointId, CowColor | null> = {} as any;
    const points = this.variant === 'koti-25' ? ALL_25_POINTS : ALL_24_POINTS;
    for (const p of points) {
      b[p] = null;
    }
    if (this.variant === 'standard-24') {
      b.C0 = null;
    }
    return b;
  }

  public getState(): MorabarabaGameState {
    return {
      variant: this.variant,
      board: { ...this.board },
      turn: this.turn,
      phase: this.phase,
      unplacedW: this.unplacedW,
      unplacedB: this.unplacedB,
      capturedW: this.capturedW,
      capturedB: this.capturedB,
      shootPending: this.shootPending,
      shootCount: this.shootCount,
      winner: this.winner,
      history: [...this.history],
      lastMove: this.lastMove ? { ...this.lastMove } : null,
    };
  }

  public getVariant(): MorabarabaVariant {
    return this.variant;
  }

  public setVariant(v: MorabarabaVariant) {
    if (this.history.length > 0) return; // Locked once match starts
    this.variant = v;
    this.board = this.getInitialBoard();
  }

  public getTurn(): CowColor {
    return this.turn;
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public getBoard(): Record<PointId, CowColor | null> {
    return { ...this.board };
  }

  public isShootPending(): boolean {
    return this.shootPending;
  }

  public getActivePoints(): PointId[] {
    return this.variant === 'koti-25' ? ALL_25_POINTS : ALL_24_POINTS;
  }

  public getAdjacency(point: PointId): PointId[] {
    const adj = this.variant === 'koti-25' ? ADJACENCY_25 : ADJACENCY_24;
    return adj[point] || [];
  }

  public getMills(): [PointId, PointId, PointId][] {
    return this.variant === 'koti-25' ? MILLS_25 : MILLS_24;
  }

  /**
   * Count cows of a given color currently placed on the board.
   */
  public getCowsOnBoard(color: CowColor): number {
    let count = 0;
    const points = this.getActivePoints();
    for (const p of points) {
      if (this.board[p] === color) count++;
    }
    return count;
  }

  /**
   * Determine if a point is currently part of an active mill for its color.
   */
  public isPointInMill(point: PointId, boardState = this.board): boolean {
    const color = boardState[point];
    if (!color) return false;

    const mills = this.getMills();
    for (const [p1, p2, p3] of mills) {
      if (p1 === point || p2 === point || p3 === point) {
        if (boardState[p1] === color && boardState[p2] === color && boardState[p3] === color) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Count how many newly formed mills are completed by moving/placing a cow on targetPoint.
   */
  public countNewlyFormedMills(
    targetPoint: PointId,
    color: CowColor,
    prevBoard: Record<PointId, CowColor | null>
  ): number {
    const mills = this.getMills();
    let count = 0;

    for (const [p1, p2, p3] of mills) {
      if (p1 === targetPoint || p2 === targetPoint || p3 === targetPoint) {
        // Is mill active now?
        const nowActive =
          this.board[p1] === color && this.board[p2] === color && this.board[p3] === color;

        // Was it ALREADY active before this move?
        const wasActive =
          prevBoard[p1] === color && prevBoard[p2] === color && prevBoard[p3] === color;

        if (nowActive && !wasActive) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Get all opponent cows eligible to be shot.
   * Under 24-point Standard rules: cows in mills CANNOT be shot unless ALL opponent cows are in mills.
   * Under 25-point Koti rules: mills grant NO immunity; ANY opponent cow on the board can be shot.
   */
  public getShootableCows(opponentColor: CowColor): PointId[] {
    const points = this.getActivePoints();
    const opponentCows = points.filter((p) => this.board[p] === opponentColor);

    if (this.variant === 'koti-25') {
      // Koti / Lesotho variant: No mill protection
      return opponentCows;
    }

    // Standard 24-point tournament rules: Mill Protection
    const cowsNotInMill = opponentCows.filter((p) => !this.isPointInMill(p));

    // If all opponent cows are locked in mills, ANY opponent cow can be shot
    if (cowsNotInMill.length === 0) {
      return opponentCows;
    }

    return cowsNotInMill;
  }

  /**
   * Place a cow during Placement Phase.
   */
  public placeCow(point: PointId): { success: boolean; millFormed: boolean } {
    if (this.winner || this.shootPending || this.phase !== 'placing') {
      return { success: false, millFormed: false };
    }

    if (!this.getActivePoints().includes(point) || this.board[point] !== null) {
      return { success: false, millFormed: false };
    }

    const prevBoard = { ...this.board };
    this.board[point] = this.turn;

    if (this.turn === 'w') {
      this.unplacedW--;
    } else {
      this.unplacedB--;
    }

    const millsFormed = this.countNewlyFormedMills(point, this.turn, prevBoard);
    this.history.push(`${this.turn.toUpperCase()}:${point}`);
    this.lastMove = { to: point };

    if (millsFormed > 0) {
      this.shootPending = true;
      this.shootCount = millsFormed;
      return { success: true, millFormed: true };
    }

    this.advanceTurnOrPhase();
    return { success: true, millFormed: false };
  }

  /**
   * Reposition or slide a placed cow during Placement Phase.
   */
  public repositionCow(from: PointId, to: PointId): { success: boolean; millFormed: boolean } {
    if (this.winner || this.shootPending || this.phase !== 'placing') {
      return { success: false, millFormed: false };
    }

    if (this.board[from] !== this.turn || this.board[to] !== null) {
      return { success: false, millFormed: false };
    }

    const prevBoard = { ...this.board };
    this.board[from] = null;
    this.board[to] = this.turn;

    const millsFormed = this.countNewlyFormedMills(to, this.turn, prevBoard);
    this.history.push(`${this.turn.toUpperCase()}:${from}->${to}`);
    this.lastMove = { from, to };

    if (millsFormed > 0) {
      this.shootPending = true;
      this.shootCount = millsFormed;
      return { success: true, millFormed: true };
    }

    this.advanceTurnOrPhase();
    return { success: true, millFormed: false };
  }

  /**
   * Move a cow during Moving or Flying Phase.
   */
  public moveCow(from: PointId, to: PointId): { success: boolean; millFormed: boolean } {
    if (this.winner || this.shootPending || this.phase === 'placing') {
      return { success: false, millFormed: false };
    }

    if (this.board[from] !== this.turn || this.board[to] !== null) {
      return { success: false, millFormed: false };
    }

    const cowsOnBoard = this.getCowsOnBoard(this.turn);
    const isFlying = cowsOnBoard === 3;

    // In Moving phase: must be adjacent along connection lines
    if (!isFlying) {
      const adjacent = this.getAdjacency(from);
      if (!adjacent.includes(to)) {
        return { success: false, millFormed: false };
      }
    }

    const prevBoard = { ...this.board };
    this.board[from] = null;
    this.board[to] = this.turn;

    const millsFormed = this.countNewlyFormedMills(to, this.turn, prevBoard);
    this.history.push(`${this.turn.toUpperCase()}:${from}->${to}`);
    this.lastMove = { from, to };

    if (millsFormed > 0) {
      this.shootPending = true;
      this.shootCount = millsFormed;
      return { success: true, millFormed: true };
    }

    this.advanceTurnOrPhase();
    return { success: true, millFormed: false };
  }

  /**
   * Shoot (remove) an opponent cow when a mill is formed.
   */
  public shootCow(point: PointId): { success: boolean; gameOver: boolean } {
    if (!this.shootPending || this.winner) {
      return { success: false, gameOver: false };
    }

    const opponent: CowColor = this.turn === 'w' ? 'b' : 'w';
    const shootable = this.getShootableCows(opponent);

    if (!shootable.includes(point)) {
      return { success: false, gameOver: false };
    }

    this.board[point] = null;
    if (this.turn === 'w') {
      this.capturedB++;
    } else {
      this.capturedW++;
    }

    this.history.push(`${this.turn.toUpperCase()}x${point}`);
    if (this.lastMove) {
      this.lastMove.shot = point;
    }

    this.shootCount--;
    if (this.shootCount <= 0) {
      this.shootPending = false;
      this.shootCount = 0;
      this.advanceTurnOrPhase();
    }

    const winner = this.checkWinner();
    return { success: true, gameOver: Boolean(winner) };
  }

  /**
   * Advance turn, check phase transition (placing -> moving -> flying), and check victory.
   */
  private advanceTurnOrPhase() {
    // Check if placement phase just completed
    if (this.phase === 'placing' && this.unplacedW === 0 && this.unplacedB === 0) {
      this.phase = 'moving';
    }

    // Switch turn
    this.turn = this.turn === 'w' ? 'b' : 'w';

    // Update phase for current player (moving vs flying)
    if (this.phase !== 'placing') {
      const myCows = this.getCowsOnBoard(this.turn);
      this.phase = myCows === 3 ? 'flying' : 'moving';
    }

    this.checkWinner();
  }

  /**
   * Evaluate victory conditions:
   * 1. Opponent reduced to < 3 cows (during moving/flying phase).
   * 2. Opponent has 0 legal moves (immobilized / blocked).
   */
  public checkWinner(): CowColor | 'draw' | null {
    if (this.winner) return this.winner;

    if (this.phase !== 'placing') {
      const whiteCows = this.getCowsOnBoard('w');
      const blackCows = this.getCowsOnBoard('b');

      if (whiteCows < 3) {
        this.winner = 'b';
        return 'b';
      }
      if (blackCows < 3) {
        this.winner = 'w';
        return 'w';
      }

      // Check if player on turn has legal moves
      const legalMoves = this.getLegalMoves();
      if (legalMoves.length === 0 && !this.shootPending) {
        // Player is immobilized -> opponent wins!
        this.winner = this.turn === 'w' ? 'b' : 'w';
        return this.winner;
      }
    }

    return null;
  }

  /**
   * Get all legal moves for current turn.
   */
  public getLegalMoves(): { from?: PointId; to: PointId }[] {
    const points = this.getActivePoints();

    if (this.phase === 'placing') {
      return points.filter((p) => this.board[p] === null).map((p) => ({ to: p }));
    }

    const myCows = points.filter((p) => this.board[p] === this.turn);
    const cowsCount = myCows.length;
    const moves: { from?: PointId; to: PointId }[] = [];

    if (cowsCount === 3) {
      // Flying: any cow to any vacant point
      const vacant = points.filter((p) => this.board[p] === null);
      for (const from of myCows) {
        for (const to of vacant) {
          moves.push({ from, to });
        }
      }
    } else {
      // Sliding: only along adjacent connection lines
      for (const from of myCows) {
        const adjacent = this.getAdjacency(from);
        for (const to of adjacent) {
          if (this.board[to] === null) {
            moves.push({ from, to });
          }
        }
      }
    }

    return moves;
  }

  /**
   * Clone engine instance for AI search.
   */
  public clone(): MorabarabaEngine {
    return new MorabarabaEngine(this.getState());
  }

  /**
   * AI Bot: Find best move / shoot action using Minimax with Alpha-Beta.
   */
  public findBestBotAction(difficulty: 'easy' | 'medium' | 'hard'): {
    type: 'place' | 'move' | 'shoot';
    from?: PointId;
    to?: PointId;
    shot?: PointId;
  } | null {
    if (this.shootPending) {
      const shootable = this.getShootableCows(this.turn === 'w' ? 'b' : 'w');
      if (shootable.length === 0) return null;

      // Smart shoot heuristic: prioritize shooting an opponent cow that forms part of a 2-in-a-row
      const opponent: CowColor = this.turn === 'w' ? 'b' : 'w';
      let bestShot = shootable[0];
      let maxThreat = -1;

      for (const p of shootable) {
        const threatScore = this.evaluatePieceThreat(p, opponent);
        if (threatScore > maxThreat) {
          maxThreat = threatScore;
          bestShot = p;
        }
      }
      return { type: 'shoot', shot: bestShot };
    }

    const legal = this.getLegalMoves();
    if (legal.length === 0) return null;
    if (legal.length === 1) {
      return legal[0].from
        ? { type: 'move', from: legal[0].from, to: legal[0].to }
        : { type: 'place', to: legal[0].to };
    }

    // Easy AI: slight heuristic with random selection
    if (difficulty === 'easy') {
      // Pick mill maker if available
      for (const m of legal) {
        const clone = this.clone();
        if (m.from) clone.moveCow(m.from, m.to);
        else clone.placeCow(m.to);
        if (clone.isShootPending()) {
          return m.from
            ? { type: 'move', from: m.from, to: m.to }
            : { type: 'place', to: m.to };
        }
      }
      const randomMove = legal[Math.floor(Math.random() * legal.length)];
      return randomMove.from
        ? { type: 'move', from: randomMove.from, to: randomMove.to }
        : { type: 'place', to: randomMove.to };
    }

    // Medium: Depth 2, Hard: Depth 3-4
    const depth = difficulty === 'medium' ? 2 : 3;
    let bestScore = -Infinity;
    let bestAction = legal[0];

    for (const m of legal) {
      const clone = this.clone();
      if (m.from) {
        clone.moveCow(m.from, m.to);
      } else {
        clone.placeCow(m.to);
      }

      // If move triggers a shoot, resolve shoot greedily in clone
      if (clone.isShootPending()) {
        const opp: CowColor = this.turn === 'w' ? 'b' : 'w';
        const shootable = clone.getShootableCows(opp);
        if (shootable.length > 0) clone.shootCow(shootable[0]);
      }

      const score = this.minimax(clone, depth - 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestAction = m;
      }
    }

    return bestAction.from
      ? { type: 'move', from: bestAction.from, to: bestAction.to }
      : { type: 'place', to: bestAction.to };
  }

  private evaluatePieceThreat(point: PointId, color: CowColor): number {
    const mills = this.getMills();
    let twoCount = 0;
    for (const [p1, p2, p3] of mills) {
      if (p1 === point || p2 === point || p3 === point) {
        const count = [this.board[p1], this.board[p2], this.board[p3]].filter((c) => c === color).length;
        if (count === 2) twoCount++;
      }
    }
    return twoCount * 10 + this.getAdjacency(point).length;
  }

  private minimax(
    engine: MorabarabaEngine,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    const winner = engine.checkWinner();
    if (winner === 'b') return 1000 + depth;
    if (winner === 'w') return -1000 - depth;
    if (depth <= 0) return this.evaluateState(engine);

    const moves = engine.getLegalMoves();
    if (moves.length === 0) {
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const clone = engine.clone();
        if (m.from) clone.moveCow(m.from, m.to);
        else clone.placeCow(m.to);

        if (clone.isShootPending()) {
          const shootable = clone.getShootableCows('w');
          if (shootable.length > 0) clone.shootCow(shootable[0]);
        }

        const evalScore = this.minimax(clone, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const clone = engine.clone();
        if (m.from) clone.moveCow(m.from, m.to);
        else clone.placeCow(m.to);

        if (clone.isShootPending()) {
          const shootable = clone.getShootableCows('b');
          if (shootable.length > 0) clone.shootCow(shootable[0]);
        }

        const evalScore = this.minimax(clone, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateState(engine: MorabarabaEngine): number {
    const bCows = engine.getCowsOnBoard('b') + engine.unplacedB;
    const wCows = engine.getCowsOnBoard('w') + engine.unplacedW;
    let score = (bCows - wCows) * 20;

    // Mills score
    const mills = engine.getMills();
    let bMills = 0;
    let wMills = 0;

    for (const [p1, p2, p3] of mills) {
      const line = [engine.board[p1], engine.board[p2], engine.board[p3]];
      if (line.every((c) => c === 'b')) bMills++;
      if (line.every((c) => c === 'w')) wMills++;
    }

    score += (bMills - wMills) * 35;
    return score;
  }
}
