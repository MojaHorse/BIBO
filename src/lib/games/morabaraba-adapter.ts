/**
 * BIBO Morabaraba Engine Adapter
 * Implements IGameEngine for Southern African Traditional Morabaraba (24-point standard & 25-point Lesotho Koti).
 */

import {
  MorabarabaEngine,
  MorabarabaVariant,
  MorabarabaGameState,
  PointId,
  CowColor,
} from '../morabaraba-engine';
import { IGameEngine, MoveResult, GameOverState, PlayerColor } from './types';

export interface MorabarabaAction {
  type: 'place' | 'move' | 'shoot' | 'reposition';
  from?: PointId;
  to?: PointId;
  shot?: PointId;
}

export class MorabarabaAdapter
  implements
    IGameEngine<
      MorabarabaAction,
      Record<PointId, CowColor | null>,
      MorabarabaGameState
    > {
  public readonly gameId = 'morabaraba';
  public readonly variant: MorabarabaVariant;
  private engine: MorabarabaEngine;

  constructor(
    initial?: MorabarabaEngine | Partial<MorabarabaGameState>,
    variant: MorabarabaVariant = 'standard-24'
  ) {
    this.variant = variant;
    if (initial instanceof MorabarabaEngine) {
      this.engine = initial;
    } else {
      this.engine = new MorabarabaEngine(initial, variant);
    }
  }

  public getInternalEngine(): MorabarabaEngine {
    return this.engine;
  }

  public getTurn(): PlayerColor {
    return this.engine.getTurn() as PlayerColor;
  }

  public getBoard(): Record<PointId, CowColor | null> {
    return this.engine.getBoard();
  }

  public getState(): MorabarabaGameState {
    return this.engine.getState();
  }

  public getPhase() {
    return this.engine.getPhase();
  }

  public getCowsOnBoard(color: CowColor): number {
    return this.engine.getCowsOnBoard(color);
  }

  public countNewlyFormedMills(
    point: PointId,
    color: CowColor,
    prevBoard: Record<PointId, CowColor | null>
  ): number {
    return this.engine.countNewlyFormedMills(point, color, prevBoard);
  }

  public isShootPending(): boolean {
    return this.engine.isShootPending();
  }

  public getShootableCows(): PointId[] {
    const oppColor = this.getTurn() === 'w' ? 'b' : 'w';
    return this.engine.getShootableCows(oppColor);
  }

  public getLegalMoves(): MorabarabaAction[] {
    if (this.engine.isShootPending()) {
      const oppColor = this.getTurn() === 'w' ? 'b' : 'w';
      return this.engine.getShootableCows(oppColor).map((pt) => ({
        type: 'shoot',
        shot: pt,
      }));
    }

    const phase = this.engine.getPhase();
    if (phase === 'placing') {
      const moves = this.engine.getLegalMoves();
      return moves.map((m) => ({
        type: 'place',
        to: m.to,
      }));
    }

    const moves = this.engine.getLegalMoves();
    return moves.map((m) => ({
      type: 'move',
      from: m.from,
      to: m.to,
    }));
  }

  public makeMove(action: MorabarabaAction): MoveResult<MorabarabaAction> {
    let success = false;
    let millFormed = false;

    if (action.type === 'place' && action.to) {
      const res = this.engine.placeCow(action.to);
      success = res.success;
      millFormed = res.millFormed;
    } else if (action.type === 'move' && action.from && action.to) {
      const res = this.engine.moveCow(action.from, action.to);
      success = res.success;
      millFormed = res.millFormed;
    } else if (action.type === 'reposition' && action.from && action.to) {
      const res = this.engine.repositionCow(action.from, action.to);
      success = res.success;
      millFormed = res.millFormed;
    } else if (action.type === 'shoot' && action.shot) {
      const res = this.engine.shootCow(action.shot);
      success = res.success;
      return {
        success,
        move: action,
        captured: true,
        isSpecial: false,
        isGameOver: Boolean(this.checkWinner()),
        winner: this.checkWinner()?.winner ?? null,
        reason: this.checkWinner()?.headline,
      };
    }

    if (!success) {
      return { success: false, move: action };
    }

    const gameOver = this.checkWinner();

    return {
      success: true,
      move: action,
      captured: false,
      isSpecial: millFormed,
      specialType: millFormed ? 'mill' : undefined,
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
        headline: 'Draw in the Kraal',
        subdeck: 'Position drawn by mutual repetition or agreement.',
      };
    }

    const isWhite = winner === 'w';
    return {
      isOver: true,
      winner,
      headline: `${isWhite ? 'White' : 'Black'} Claims Kraal Victory!`,
      subdeck: isWhite
        ? 'All opposing cattle captured or completely immobilized.'
        : 'Opponent dominates the Kraal; no legal moves remain.',
    };
  }

  public findBotMove(difficulty: 'easy' | 'medium' | 'hard'): MorabarabaAction | null {
    return this.engine.findBestBotAction(difficulty);
  }

  public clone(): MorabarabaAdapter {
    return new MorabarabaAdapter(this.engine.clone(), this.variant);
  }

  public serialize(): string {
    return this.engine.getState().history.join('; ');
  }

  public getFenOrSnapshot(): string {
    return JSON.stringify(this.engine.getState());
  }

  public reset(variant?: MorabarabaVariant): void {
    const v = variant || this.variant;
    this.engine = new MorabarabaEngine(undefined, v);
  }

  public static createMovingPhaseQuickStart(
    variant: MorabarabaVariant = 'standard-24'
  ): MorabarabaAdapter {
    const quick = MorabarabaEngine.createMovingPhaseQuickStart(variant);
    return new MorabarabaAdapter(quick, variant);
  }
}
