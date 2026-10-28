/**
 * BIBO Universal Strategy Game Engine Protocol
 * Defines standard interfaces for turn-based abstract board games (Chess, Checkers, Morabaraba, etc.)
 */

export type GameId = 'chess' | 'checkers' | 'morabaraba';
export type PlayerColor = 'w' | 'b';
export type PlayMode = 'bot' | 'online' | 'local';

export interface MoveResult<TMove = any> {
  success: boolean;
  move: TMove;
  captured?: boolean;
  capturedPiece?: string;
  isSpecial?: boolean;
  specialType?: 'mill' | 'promotion' | 'king' | 'castle' | 'enPassant' | 'multiJump' | string;
  isGameOver?: boolean;
  winner?: PlayerColor | 'draw' | null;
  reason?: string;
}

export interface GameOverState {
  isOver: boolean;
  winner: PlayerColor | 'draw' | null;
  headline: string;
  subdeck: string;
}

export interface IGameEngine<TMove = any, TBoard = any, TState = any> {
  readonly gameId: GameId;
  readonly variant: string;

  getTurn(): PlayerColor;
  getBoard(): TBoard;
  getState(): TState;
  getLegalMoves(): TMove[];
  makeMove(move: TMove): MoveResult<TMove>;
  checkWinner(): GameOverState | null;
  findBotMove(difficulty: 'easy' | 'medium' | 'hard'): Promise<TMove | null> | TMove | null;
  clone(): IGameEngine<TMove, TBoard, TState>;
  serialize(): string; // PGN or standard notation string
  getFenOrSnapshot(): string; // Machine-readable board state (FEN / JSON)
  reset(variant?: string): void;
}

// Notation / History formatting helper
export interface PairedTurnRound {
  round: number;
  white?: string;
  black?: string;
}

export function formatMoveHistory(history: string[]): PairedTurnRound[] {
  const rounds: PairedTurnRound[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rounds.push({
      round: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || undefined,
    });
  }
  return rounds;
}
