/**
 * BIBO Universal Game Engine Factory
 * Instantiates the appropriate IGameEngine adapter for any supported game.
 */

import { GameId, IGameEngine } from './types';
import { ChessAdapter } from './chess-adapter';
import { CheckersAdapter } from './checkers-adapter';
import { MorabarabaAdapter } from './morabaraba-adapter';

export function createGameEngine(
  gameId: GameId,
  variant?: string,
  initialSnapshot?: string
): IGameEngine {
  switch (gameId) {
    case 'chess':
      return new ChessAdapter(initialSnapshot, variant || 'standard');
    case 'checkers': {
      let state = undefined;
      if (initialSnapshot) {
        try {
          state = JSON.parse(initialSnapshot);
        } catch {
          // fallback to default
        }
      }
      return new CheckersAdapter(state, variant || 'american-8x8');
    }
    case 'morabaraba': {
      let state = undefined;
      if (initialSnapshot) {
        try {
          state = JSON.parse(initialSnapshot);
        } catch {
          // fallback to default
        }
      }
      return new MorabarabaAdapter(
        state,
        (variant as any) || 'standard-24'
      );
    }
    default:
      throw new Error(`Unsupported game: ${gameId}`);
  }
}
