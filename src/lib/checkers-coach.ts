import { CheckersEngine, Position, CheckersMove, Piece, Turn } from './checkers-engine';

export interface CheckersCoachCommentary {
  type: 'brilliant' | 'good' | 'warning' | 'blunder' | 'opening' | 'hint';
  title: string;
  message: string;
  suggestedMove?: { from: Position; to: Position };
}

export class CheckersCoachEngine {
  /**
   * Analyze a completed move and return tactical pedagogical feedback.
   */
  public analyzeMove(
    engineBefore: CheckersEngine,
    engineAfter: CheckersEngine,
    move: CheckersMove,
    historyLength: number
  ): CheckersCoachCommentary {
    const turn = engineBefore.getTurn(); // Player who made the move
    const isWhite = turn === 'w';

    // 1. Victory or Decisive Breakthrough
    const winner = engineAfter.checkWinner();
    if (winner === turn) {
      return {
        type: 'brilliant',
        title: 'Decisive Victory!',
        message: 'Masterful finish! You wiped out all opponent pieces or trapped them with zero legal moves.',
      };
    }

    // 2. Crowned King
    if (move.isPromotion) {
      return {
        type: 'brilliant',
        title: 'Crowned King!',
        message:
          'Your piece penetrated the enemy back rank and is crowned! Kings command 360° bidirectional diagonals and multi-jumps.',
      };
    }

    // 3. Multi-Jump / Captures
    if (move.captured) {
      if (move.subsequentJumps && move.subsequentJumps.length > 0) {
        return {
          type: 'brilliant',
          title: 'Multi-Jump Sweep!',
          message:
            'Outstanding tactical combination! Chaining multiple jumps strips the opponent of material and swings board momentum.',
        };
      }
      return {
        type: 'good',
        title: 'Piece Captured',
        message:
          'Solid capture. In Draughts, piece advantage translates directly into endgame dominance.',
      };
    }

    // 4. Opening moves (first 4 plies)
    if (historyLength <= 4) {
      const fromC = move.from.col;
      const toC = move.to.col;
      if (toC >= 2 && toC <= 5) {
        return {
          type: 'opening',
          title: 'Classical Center Opening',
          message:
            'Excellent opening development. Advancing toward the central diagonals (C3-F6) establishes strong positional anchoring.',
        };
      }
      if (toC === 0 || toC === 7) {
        return {
          type: 'warning',
          title: 'Flank Advance (Edge of Board)',
          message:
            '"A piece on the side is half a piece." Pieces on the edge only command 1 diagonal and can be pinned against the boundary.',
        };
      }
    }

    // 5. Back Row (King Row) Protection
    const kingRow = isWhite ? 7 : 0;
    if (move.from.row === kingRow) {
      const remainingBackRow = engineAfter
        .getBoard()[kingRow]
        .filter((p) => (isWhite ? p === 'w' || p === 'W' : p === 'b' || p === 'B')).length;
      if (remainingBackRow <= 1) {
        return {
          type: 'warning',
          title: 'King Row Compromised',
          message:
            'Careful! Emptying your back rank leaves a wide-open runway for enemy men to slip through and crown into Kings.',
        };
      }
    }

    // 6. Check if player walked into an immediate opponent counter-jump
    const opponentMoves = engineAfter.getLegalMoves();
    const opponentCaptures = opponentMoves.filter((m) => m.captured);
    if (opponentCaptures.length > 0) {
      // Check if the moved piece itself is being jumped
      const isTargeted = opponentCaptures.some(
        (m) => m.captured?.row === move.to.row && m.captured?.col === move.to.col
      );
      if (isTargeted) {
        return {
          type: 'blunder',
          title: 'Piece Exposed to Jump!',
          message:
            'Danger! You stepped into a square where the opponent has an immediate mandatory jump on your piece.',
        };
      }
      return {
        type: 'warning',
        title: 'Opponent Forced Jump Active',
        message:
          'The opponent has a mandatory jump available. Keep an eye on secondary pieces left undefended.',
      };
    }

    // 7. Center Board Occupation
    if (move.to.row >= 3 && move.to.row <= 4 && move.to.col >= 2 && move.to.col <= 5) {
      return {
        type: 'good',
        title: 'Center Outpost Secured',
        message:
          'Controlling the 4 center squares limits your opponent’s mobility and creates forward attack vectors in both directions.',
      };
    }

    return {
      type: 'good',
      title: 'Solid Development',
      message:
        'Good steady advance. Look for opportunities to set up two-for-one traps or press toward the king rank.',
    };
  }

  /**
   * Provide a strategic hint for the current turn.
   */
  public getHint(engine: CheckersEngine): CheckersCoachCommentary {
    const legalMoves = engine.getLegalMoves();
    if (legalMoves.length === 0) {
      return {
        type: 'warning',
        title: 'No Legal Moves',
        message: 'Your pieces are blocked on all diagonal paths or eliminated.',
      };
    }

    // Check mandatory captures
    const captureMoves = legalMoves.filter((m) => m.captured);
    if (captureMoves.length > 0) {
      const bestCapture = captureMoves[0];
      return {
        type: 'hint',
        title: 'Mandatory Jump Available!',
        message: `Execute the mandatory capture from (${bestCapture.from.row + 1},${bestCapture.from.col + 1}) to (${bestCapture.to.row + 1},${bestCapture.to.col + 1}) to eliminate opposing material.`,
        suggestedMove: { from: bestCapture.from, to: bestCapture.to },
      };
    }

    // Use engine minimax to find the most advantageous move
    const bestMove = engine.findBestMove('hard') || legalMoves[0];

    // Determine pedagogical reason
    let reason = 'Advancing this piece preserves your pawn structure and maintains diagonal pressure.';
    if (bestMove.to.row === (engine.getTurn() === 'w' ? 0 : 7)) {
      reason = 'Advance this piece to the back rank to crown it into a King!';
    } else if (bestMove.to.col >= 2 && bestMove.to.col <= 5 && bestMove.to.row >= 2 && bestMove.to.row <= 5) {
      reason = 'Seize the central diagonals to dominate mobility and restrict enemy counterplay.';
    } else if (bestMove.from.row === (engine.getTurn() === 'w' ? 7 : 0)) {
      reason = 'Careful advance from the baseline while keeping the remaining back rank guarded.';
    }

    return {
      type: 'hint',
      title: 'Recommended Tactical Move',
      message: `${reason} Move from (${bestMove.from.row + 1},${bestMove.from.col + 1}) to (${bestMove.to.row + 1},${bestMove.to.col + 1}).`,
      suggestedMove: { from: bestMove.from, to: bestMove.to },
    };
  }
}

export const checkersCoach = new CheckersCoachEngine();
