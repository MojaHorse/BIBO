/**
 * BIBO Chess Engine Adapter
 * Implements IGameEngine for Chess using chess.js and custom minimax AI.
 */

import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { IGameEngine, MoveResult, GameOverState, PlayerColor } from './types';
import { findBestMove } from '../chess-ai';

export interface ChessMoveInput {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

export class ChessAdapter implements IGameEngine<ChessMoveInput, ReturnType<Chess['board']>, { fen: string; history: string[] }> {
  public readonly gameId = 'chess';
  public readonly variant: string;
  private chess: Chess;

  constructor(fen?: string, variant = 'standard') {
    this.variant = variant;
    this.chess = fen ? new Chess(fen) : new Chess();
  }

  public getInternalEngine(): Chess {
    return this.chess;
  }

  public getTurn(): PlayerColor {
    return this.chess.turn() as PlayerColor;
  }

  public getBoard() {
    return this.chess.board();
  }

  public getState() {
    return {
      fen: this.chess.fen(),
      history: this.chess.history(),
    };
  }

  public getLegalMoves(): ChessMoveInput[] {
    const rawMoves = this.chess.moves({ verbose: true }) as Move[];
    return rawMoves.map((m) => ({
      from: m.from as Square,
      to: m.to as Square,
      promotion: m.promotion ? (m.promotion as PieceSymbol) : undefined,
    }));
  }

  public makeMove(input: ChessMoveInput): MoveResult<ChessMoveInput> {
    try {
      const move = this.chess.move({
        from: input.from,
        to: input.to,
        promotion: input.promotion || 'q',
      });

      if (!move) {
        return { success: false, move: input };
      }

      const captured = Boolean(move.captured);
      const isCastling = move.flags.includes('k') || move.flags.includes('q');
      const isPromotion = move.flags.includes('p');
      const isEnPassant = move.flags.includes('e');

      let specialType: string | undefined;
      if (isCastling) specialType = 'castle';
      else if (isPromotion) specialType = 'promotion';
      else if (isEnPassant) specialType = 'enPassant';

      const gameOver = this.checkWinner();

      return {
        success: true,
        move: input,
        captured,
        capturedPiece: move.captured,
        isSpecial: Boolean(specialType),
        specialType,
        isGameOver: Boolean(gameOver),
        winner: gameOver?.winner ?? null,
        reason: gameOver?.headline,
      };
    } catch {
      return { success: false, move: input };
    }
  }

  public checkWinner(): GameOverState | null {
    if (this.chess.isCheckmate()) {
      const winner: PlayerColor = this.chess.turn() === 'w' ? 'b' : 'w';
      return {
        isOver: true,
        winner,
        headline: `${winner === 'w' ? 'White' : 'Black'} Wins by Checkmate!`,
        subdeck: 'Opposing King is captured in absolute checkmate.',
      };
    }

    if (this.chess.isStalemate()) {
      return {
        isOver: true,
        winner: 'draw',
        headline: 'Draw by Stalemate',
        subdeck: 'Player has no legal moves and is not in check.',
      };
    }

    if (this.chess.isThreefoldRepetition()) {
      return {
        isOver: true,
        winner: 'draw',
        headline: 'Draw by Threefold Repetition',
        subdeck: 'Identical position reached 3 times.',
      };
    }

    if (this.chess.isInsufficientMaterial()) {
      return {
        isOver: true,
        winner: 'draw',
        headline: 'Draw by Insufficient Material',
        subdeck: 'Neither player has enough pieces to force checkmate.',
      };
    }

    if (this.chess.isDraw()) {
      return {
        isOver: true,
        winner: 'draw',
        headline: 'Draw',
        subdeck: 'Game concluded in a draw (50-move rule).',
      };
    }

    return null;
  }

  public findBotMove(difficulty: 'easy' | 'medium' | 'hard'): ChessMoveInput | null {
    const move = findBestMove(this.chess, difficulty);
    if (!move) return null;
    return {
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion ? (move.promotion as PieceSymbol) : undefined,
    };
  }

  public clone(): ChessAdapter {
    return new ChessAdapter(this.chess.fen(), this.variant);
  }

  public serialize(): string {
    return this.chess.pgn() || this.chess.history().join(' ');
  }

  public getFenOrSnapshot(): string {
    return this.chess.fen();
  }

  public reset(): void {
    this.chess.reset();
  }
}
