/**
 * BIBO Checkers Engine Adapter
 * Implements IGameEngine for 8x8 American/English Draughts.
 */

import {
  CheckersEngine,
  CheckersMove,
  CheckersGameState,
  Piece,
} from '../checkers-engine';
import { IGameEngine, MoveResult, GameOverState, PlayerColor } from './types';

export class CheckersAdapter
  implements IGameEngine<CheckersMove, Piece[][], CheckersGameState> {
  public readonly gameId = 'checkers';
  public readonly variant: string;
  private engine: CheckersEngine;

  constructor(initialState?: CheckersEngine | Partial<CheckersGameState>, variant = 'american-8x8') {
    this.variant = variant;
    if (initialState instanceof CheckersEngine) {
      this.engine = initialState;
    } else {
      this.engine = new CheckersEngine(initialState);
    }
  }

  public getInternalEngine(): CheckersEngine {
    return this.engine;
  }

  public setMandatoryJumps(val: boolean): void {
    this.engine.setMandatoryJumps(val);
  }

  public getTurn(): PlayerColor {
    return this.engine.getTurn() as PlayerColor;
  }

  public getBoard(): Piece[][] {
    return this.engine.getBoard();
  }

  public getState(): CheckersGameState {
    return this.engine.getState();
  }

  public getLegalMoves(): CheckersMove[] {
    return this.engine.getLegalMoves();
  }

  public makeMove(input: CheckersMove): MoveResult<CheckersMove> {
    const res = this.engine.makeMove(
      input.from.row,
      input.from.col,
      input.to.row,
      input.to.col
    );

    if (!res.success) {
      return { success: false, move: input };
    }

    const specialType = res.isPromotion
      ? 'king'
      : !res.turnSwitched
      ? 'multiJump'
      : undefined;

    const gameOver = this.checkWinner();

    return {
      success: true,
      move: input,
      captured: res.isCapture,
      isSpecial: Boolean(specialType),
      specialType,
      isGameOver: Boolean(gameOver),
      winner: gameOver?.winner ?? null,
      reason: gameOver?.headline,
    };
  }

  public checkWinner(): GameOverState | null {
    const winner = this.engine.checkWinner();
    if (!winner) return null;

    if (winner === 'draw') {
      return {
        isOver: true,
        winner: 'draw',
        headline: 'Draw',
        subdeck: 'Match drawn by agreement or repetition.',
      };
    }

    const isWhite = winner === 'w';
    return {
      isOver: true,
      winner,
      headline: `${isWhite ? 'White' : 'Black'} Claims Victory!`,
      subdeck: isWhite
        ? 'All black pieces captured or completely immobilized.'
        : 'All white pieces captured or completely immobilized.',
    };
  }

  public findBotMove(difficulty: 'easy' | 'medium' | 'hard'): CheckersMove | null {
    return this.engine.findBestMove(difficulty);
  }

  public clone(): CheckersAdapter {
    return new CheckersAdapter(this.engine.clone(), this.variant);
  }

  public serialize(): string {
    return this.engine.getState().history.join('; ');
  }

  public getFenOrSnapshot(): string {
    return JSON.stringify(this.engine.getState());
  }

  public reset(): void {
    this.engine = new CheckersEngine();
  }
}
