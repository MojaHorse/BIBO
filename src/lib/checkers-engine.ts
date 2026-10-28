/**
 * Standard 8x8 Checkers (American / English Draughts) Engine
 * Pure TypeScript implementation with full mandatory capture, multi-jump, and AI bot.
 */

export type Piece = 'w' | 'W' | 'b' | 'B' | null;
export type Turn = 'w' | 'b';

export interface Position {
  row: number;
  col: number;
}

export interface CheckersMove {
  from: Position;
  to: Position;
  captured?: Position;
  subsequentJumps?: CheckersMove[];
  isPromotion?: boolean;
}

export interface CheckersGameState {
  board: Piece[][];
  turn: Turn;
  capturedW: number; // black pieces captured by white
  capturedB: number; // white pieces captured by black
  moveCount: number;
  history: string[];
  winner: Turn | 'draw' | null;
  activeMultiJumpPiece: Position | null; // locked piece during mandatory multi-jump
  mandatoryJumps: boolean; // official Draughts mandatory captures (default: true)
}

export class CheckersEngine {
  private board: Piece[][];
  private turn: Turn;
  private capturedW: number;
  private capturedB: number;
  private history: string[];
  private activeMultiJumpPiece: Position | null;
  private mandatoryJumps: boolean;

  constructor(state?: Partial<CheckersGameState>, mandatoryJumps = true) {
    this.board = state?.board ? state.board.map((r) => [...r]) : this.getInitialBoard();
    this.turn = state?.turn || 'w';
    this.capturedW = state?.capturedW || 0;
    this.capturedB = state?.capturedB || 0;
    this.history = state?.history || [];
    this.activeMultiJumpPiece = state?.activeMultiJumpPiece || null;
    this.mandatoryJumps = state?.mandatoryJumps !== undefined ? state.mandatoryJumps : mandatoryJumps;
  }

  public getInitialBoard(): Piece[][] {
    const b: Piece[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Rows 0, 1, 2: Black pieces on dark squares (row + col is odd)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = 'b';
      }
    }

    // Rows 5, 6, 7: White pieces on dark squares
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = 'w';
      }
    }

    return b;
  }

  public getState(): CheckersGameState {
    return {
      board: this.board.map((r) => [...r]),
      turn: this.turn,
      capturedW: this.capturedW,
      capturedB: this.capturedB,
      moveCount: this.history.length,
      history: [...this.history],
      winner: this.checkWinner(),
      activeMultiJumpPiece: this.activeMultiJumpPiece ? { ...this.activeMultiJumpPiece } : null,
      mandatoryJumps: this.mandatoryJumps,
    };
  }

  public setMandatoryJumps(val: boolean): void {
    this.mandatoryJumps = val;
  }

  public getMandatoryJumps(): boolean {
    return this.mandatoryJumps;
  }

  public getBoard(): Piece[][] {
    return this.board.map((r) => [...r]);
  }

  public getTurn(): Turn {
    return this.turn;
  }

  public isDarkSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 1;
  }

  public isPieceOfColor(p: Piece, color: Turn): boolean {
    if (!p) return false;
    return color === 'w' ? p === 'w' || p === 'W' : p === 'b' || p === 'B';
  }

  public isKing(p: Piece): boolean {
    return p === 'W' || p === 'B';
  }

  /**
   * Get all legal moves for current turn.
   * Under standard rules, if any capture exists, ONLY captures are legal (mandatory capture rule).
   * When mandatoryJumps is false (Casual mode), player can choose captures OR regular moves.
   */
  public getLegalMoves(): CheckersMove[] {
    const jumps: CheckersMove[] = [];
    const regular: CheckersMove[] = [];

    // If in the middle of a multi-jump, only the locked piece can move
    if (this.activeMultiJumpPiece) {
      const multiJumps = this.getJumpsForPiece(
        this.activeMultiJumpPiece.row,
        this.activeMultiJumpPiece.col
      );
      if (multiJumps.length > 0) {
        return multiJumps;
      }
      this.activeMultiJumpPiece = null;
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && this.isPieceOfColor(p, this.turn)) {
          const pieceJumps = this.getJumpsForPiece(r, c);
          if (pieceJumps.length > 0) {
            jumps.push(...pieceJumps);
          }
          regular.push(...this.getRegularMovesForPiece(r, c));
        }
      }
    }

    // Mandatory capture: jumps take priority when mandatoryJumps is true
    if (this.mandatoryJumps && jumps.length > 0) {
      return jumps;
    }
    return [...jumps, ...regular];
  }

  /**
   * Get legal moves specifically for a selected piece.
   */
  public getLegalMovesForSquare(r: number, c: number): CheckersMove[] {
    const all = this.getLegalMoves();
    return all.filter((m) => m.from.row === r && m.from.col === c);
  }

  private getRegularMovesForPiece(r: number, c: number): CheckersMove[] {
    const moves: CheckersMove[] = [];
    const p = this.board[r][c];
    if (!p) return moves;

    // Flying Kings: can slide any number of empty squares along all 4 diagonals
    if (this.isKing(p)) {
      const kingDirs: [number, number][] = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
      for (const [dr, dc] of kingDirs) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (!this.isValidPosition(nr, nc)) break;
          if (this.board[nr][nc] !== null) break;
          moves.push({
            from: { row: r, col: c },
            to: { row: nr, col: nc },
          });
          step++;
        }
      }
      return moves;
    }

    // Regular Men: 1 step forward diagonally
    const directions = this.getMoveDirections(p);
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.isValidPosition(nr, nc) && this.board[nr][nc] === null) {
        moves.push({
          from: { row: r, col: c },
          to: { row: nr, col: nc },
        });
      }
    }

    return moves;
  }

  private getJumpsForPiece(r: number, c: number): CheckersMove[] {
    const jumps: CheckersMove[] = [];
    const p = this.board[r][c];
    if (!p) return jumps;

    const opponent = this.turn === 'w' ? 'b' : 'w';

    // Flying Kings: Raycast along all 4 diagonals. Can jump an opponent piece at any distance
    // and land on any vacant square behind the captured piece.
    if (this.isKing(p)) {
      const kingDirs: [number, number][] = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
      for (const [dr, dc] of kingDirs) {
        let step = 1;
        let opponentPos: Position | null = null;

        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (!this.isValidPosition(nr, nc)) break;

          const pieceAtSq = this.board[nr][nc];

          if (opponentPos === null) {
            if (pieceAtSq === null) {
              // Empty space between king and opponent piece
              step++;
              continue;
            } else if (this.isPieceOfColor(pieceAtSq, opponent)) {
              // Found opponent piece to potentially capture
              opponentPos = { row: nr, col: nc };
              step++;
              continue;
            } else {
              // Friendly piece blocks the ray before reaching any opponent
              break;
            }
          } else {
            // Already found opponent piece along ray
            if (pieceAtSq === null) {
              // Valid landing square behind the captured piece
              jumps.push({
                from: { row: r, col: c },
                to: { row: nr, col: nc },
                captured: opponentPos,
              });
              step++;
            } else {
              // Blocked by another piece (friendly or opponent) after the captured piece
              break;
            }
          }
        }
      }

      return jumps;
    }

    // Regular Men: Jump adjacent opponent piece forward and backward (International Draughts rule)
    const jumpDirs: [number, number][] = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dr, dc] of jumpDirs) {
      const midR = r + dr;
      const midC = c + dc;
      const endR = r + dr * 2;
      const endC = c + dc * 2;

      if (this.isValidPosition(endR, endC)) {
        const midPiece = this.board[midR][midC];
        const endPiece = this.board[endR][endC];

        if (midPiece && this.isPieceOfColor(midPiece, opponent) && endPiece === null) {
          jumps.push({
            from: { row: r, col: c },
            to: { row: endR, col: endC },
            captured: { row: midR, col: midC },
          });
        }
      }
    }

    return jumps;
  }

  private getMoveDirections(p: Piece): [number, number][] {
    if (this.isKing(p)) {
      return [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
    }
    // White moves up (-1), Black moves down (+1)
    if (p === 'w') {
      return [
        [-1, -1],
        [-1, 1],
      ];
    }
    return [
      [1, -1],
      [1, 1],
    ];
  }

  public isValidPosition(r: number, c: number): boolean {
    return r >= 0 && r < 8 && c >= 0 && c < 8 && (r + c) % 2 === 1;
  }

  /**
   * Execute a move.
   * Returns true if successful, false if illegal.
   */
  public makeMove(fromR: number, fromC: number, toR: number, toC: number): {
    success: boolean;
    isCapture: boolean;
    isPromotion: boolean;
    turnSwitched: boolean;
  } {
    const legal = this.getLegalMoves();
    const match = legal.find(
      (m) =>
        m.from.row === fromR &&
        m.from.col === fromC &&
        m.to.row === toR &&
        m.to.col === toC
    );

    if (!match) {
      return { success: false, isCapture: false, isPromotion: false, turnSwitched: false };
    }

    const p = this.board[fromR][fromC];
    this.board[fromR][fromC] = null;

    let isPromotion = false;
    // Check promotion to King
    if (p === 'w' && toR === 0) {
      this.board[toR][toC] = 'W';
      isPromotion = true;
    } else if (p === 'b' && toR === 7) {
      this.board[toR][toC] = 'B';
      isPromotion = true;
    } else {
      this.board[toR][toC] = p;
    }

    const isCapture = Boolean(match.captured);
    if (match.captured) {
      this.board[match.captured.row][match.captured.col] = null;
      if (this.turn === 'w') this.capturedW++;
      else this.capturedB++;
    }

    // Algebraic notation for Checkers: e.g. "C3-D4" or "C3xD5"
    const fromNotation = this.squareToNotation(fromR, fromC);
    const toNotation = this.squareToNotation(toR, toC);
    const notation = `${fromNotation}${isCapture ? 'x' : '-'}${toNotation}`;
    this.history.push(notation);

    // Multi-jump check:
    // If it was a capture, check for consecutive jumps (supports in-stride King flying jumps)
    let turnSwitched = true;
    if (isCapture) {
      const consecutiveJumps = this.getJumpsForPiece(toR, toC);
      if (consecutiveJumps.length > 0) {
        match.subsequentJumps = consecutiveJumps;
        // Player MUST jump again with this exact piece
        this.activeMultiJumpPiece = { row: toR, col: toC };
        turnSwitched = false;
      } else {
        this.activeMultiJumpPiece = null;
      }
    } else {
      this.activeMultiJumpPiece = null;
    }

    if (turnSwitched) {
      this.turn = this.turn === 'w' ? 'b' : 'w';
    }

    return {
      success: true,
      isCapture,
      isPromotion,
      turnSwitched,
    };
  }

  public squareToNotation(r: number, c: number): string {
    const colLetter = String.fromCharCode(65 + c); // A-H
    const rowNum = 8 - r; // 1-8
    return `${colLetter}${rowNum}`;
  }

  public checkWinner(): Turn | 'draw' | null {
    // Count pieces
    let whiteCount = 0;
    let blackCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p === 'w' || p === 'W') whiteCount++;
        else if (p === 'b' || p === 'B') blackCount++;
      }
    }

    if (whiteCount === 0) return 'b';
    if (blackCount === 0) return 'w';

    // Check if player on turn has no legal moves (stalemate = loss in Checkers)
    const moves = this.getLegalMoves();
    if (moves.length === 0) {
      return this.turn === 'w' ? 'b' : 'w';
    }

    return null;
  }

  /**
   * Clone engine instance for AI search
   */
  public clone(): CheckersEngine {
    return new CheckersEngine(this.getState());
  }

  /**
   * Client-side AI Bot: Minimax with Alpha-Beta Pruning
   */
  public findBestMove(difficulty: 'easy' | 'medium' | 'hard'): CheckersMove | null {
    const moves = this.getLegalMoves();
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    // Easy: Random choice with slight bias for captures
    if (difficulty === 'easy') {
      const captures = moves.filter((m) => m.captured);
      if (captures.length > 0 && Math.random() < 0.7) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Medium: Depth 3, Hard: Depth 5
    const depth = difficulty === 'medium' ? 3 : 5;
    const isMaximizing = this.turn === 'b'; // Assuming bot is black by default

    let bestMove: CheckersMove = moves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const m of moves) {
      const nextEngine = this.clone();
      nextEngine.makeMove(m.from.row, m.from.col, m.to.row, m.to.col);
      const nextIsMax = nextEngine.getTurn() === 'b';
      const score = this.minimax(nextEngine, depth - 1, -Infinity, Infinity, nextIsMax);

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = m;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = m;
        }
      }
    }

    return bestMove;
  }

  private minimax(
    engine: CheckersEngine,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    const winner = engine.checkWinner();
    if (winner === 'b') return 1000 + depth;
    if (winner === 'w') return -1000 - depth;
    if (depth <= 0) return this.evaluateBoard(engine.board);

    const moves = engine.getLegalMoves();
    if (moves.length === 0) {
      return isMaximizing ? -1000 : 1000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const clone = engine.clone();
        clone.makeMove(m.from.row, m.from.col, m.to.row, m.to.col);
        const nextIsMax = clone.getTurn() === 'b';
        const evalScore = this.minimax(clone, depth - 1, alpha, beta, nextIsMax);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const clone = engine.clone();
        clone.makeMove(m.from.row, m.from.col, m.to.row, m.to.col);
        const nextIsMax = clone.getTurn() === 'b';
        const evalScore = this.minimax(clone, depth - 1, alpha, beta, nextIsMax);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(b: Piece[][]): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p) continue;

        // Black (+), White (-)
        if (p === 'b') {
          score += 10 + r; // Advancement bonus
          if (c >= 2 && c <= 5) score += 2; // Center control
        } else if (p === 'B') {
          score += 25; // King value
        } else if (p === 'w') {
          score -= 10 + (7 - r);
          if (c >= 2 && c <= 5) score -= 2;
        } else if (p === 'W') {
          score -= 25;
        }
      }
    }
    return score;
  }
}
