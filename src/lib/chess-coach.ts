import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PIECE_NAMES } from './chess-utils';

export interface CoachCommentary {
  type: 'brilliant' | 'good' | 'warning' | 'blunder' | 'opening' | 'hint';
  title: string;
  message: string;
  suggestedMove?: { from: Square; to: Square; san?: string };
}

// Opening repertoire recognition
const COMMON_OPENINGS: Record<string, string> = {
  'e4': "King's Pawn Opening — fighting for early central dominance.",
  'd4': "Queen's Pawn Opening — a solid, positional foundation.",
  'c4': 'English Opening — controlling the center from the flank.',
  'Nf3': 'Réti Opening — hypermodern piece pressure on central squares.',
  'e4 e5': 'Open Game — classical contest for the center.',
  'e4 c5': 'Sicilian Defense — an aggressive, asymmetrical counter-attack.',
  'e4 e6': 'French Defense — solid pawn chain aimed at queen-side counterplay.',
  'e4 c6': 'Caro-Kann Defense — ultra-resilient pawn structure.',
  'e4 e5 Nf3 Nc6 Bc4': 'Italian Game — rapid development targeting the weak f7 square.',
  'e4 e5 Nf3 Nc6 Bb5': 'Ruy Lopez — one of the deepest and oldest classical openings.',
  'd4 d5 c4': "Queen's Gambit — offering a wing pawn for total center supremacy.",
  'd4 Nf6 c4 g6': "King's Indian Defense — yielding center space for a devastating king-side assault.",
};

export class ChessCoachEngine {
  // Analyze a move and generate pedagogical coaching commentary
  public analyzeMove(
    chessBefore: Chess,
    chessAfter: Chess,
    move: Move,
    cpLoss: number = 0,
    historySans: string[] = []
  ): CoachCommentary {
    const moveStr = historySans.slice(0, 6).join(' ');

    // 1. Check opening database for first few moves
    if (historySans.length <= 6 && COMMON_OPENINGS[moveStr]) {
      return {
        type: 'opening',
        title: 'Opening Theory',
        message: COMMON_OPENINGS[moveStr],
      };
    }

    const pieceName = PIECE_NAMES[(move?.piece || 'p') as PieceSymbol] || 'Piece';
    const flags = move?.flags || '';

    // 2. King Castling
    if (flags.includes('k') || flags.includes('q')) {
      return {
        type: 'good',
        title: 'King Safety',
        message:
          'Excellent decision. Castling tucks your monarch away safely while activating your rook toward open files.',
      };
    }

    // 3. Checkmate
    if (chessAfter.isCheckmate()) {
      return {
        type: 'brilliant',
        title: 'Decisive Checkmate',
        message:
          'Magnificent execution! The enemy king has no legal escapes and no defenders remaining.',
      };
    }

    // 4. Giving Check
    if (chessAfter.inCheck()) {
      return {
        type: 'good',
        title: 'Direct Attack',
        message: `Strong tempo move. Checking the enemy monarch forces an immediate, non-optional defensive reaction.`,
      };
    }

    // 5. Captures
    if (move.captured) {
      const capturedName = PIECE_NAMES[move.captured as PieceSymbol] || 'piece';
      if (cpLoss > 150) {
        return {
          type: 'blunder',
          title: 'Poisoned Capture',
          message: `Careful! You captured a ${capturedName}, but this opens a dangerous tactical line or leaves an even more valuable piece vulnerable.`,
        };
      }
      return {
        type: 'good',
        title: 'Material Seized',
        message: `Solid tactical exchange. You eliminated the opponent's ${capturedName} on ${move.to}.`,
      };
    }

    // 6. Blunder Analysis (Large centipawn loss)
    if (cpLoss > 200) {
      // Check if moving piece is attacked
      return {
        type: 'blunder',
        title: 'Tactical Oversight',
        message: `Watch out! That move gives up significant positional advantage or leaves your ${pieceName} exposed to counter-attack. Consider taking it back and finding a safer square.`,
      };
    }

    // 7. Piece Development
    if (move?.piece && ['n', 'b'].includes(move.piece) && historySans.length < 12) {
      return {
        type: 'good',
        title: 'Piece Mobilization',
        message: `Classic principle: developing minor pieces early maximizes influence over key central squares.`,
      };
    }

    // 8. Central Pawn Advance
    if (move?.piece === 'p' && move?.to && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) {
      return {
        type: 'good',
        title: 'Center Control',
        message: `Strong pawn advance. Controlling central space restricts the enemy knights and opens diagonals for your bishops.`,
      };
    }

    return {
      type: 'good',
      title: 'Positional Step',
      message: `Deliberate maneuver with the ${pieceName}${move?.to ? ` to ${move.to}` : ''}. Keep an eye on piece coordination.`,
    };
  }

  // Generate tactical hint for the current position
  public generateHint(chess: Chess, bestMoveUci?: string): CoachCommentary {
    if (!bestMoveUci || bestMoveUci.length < 4) {
      return {
        type: 'hint',
        title: "Coach's Strategic Advice",
        message:
          'Survey the board: check for undefended pieces, look for pins against the enemy king, and ensure your king has castled to safety.',
      };
    }

    const from = bestMoveUci.substring(0, 2) as Square;
    const to = bestMoveUci.substring(2, 4) as Square;
    const piece = chess.get(from);
    const pieceName = piece ? PIECE_NAMES[piece.type] : 'piece';

    let message = `Look closely at your ${pieceName} on ${from}. Moving toward ${to} improves piece activity and counters enemy threats.`;

    const targetPiece = chess.get(to);
    if (targetPiece) {
      message = `There is an opportunity to strike: your ${pieceName} on ${from} can capture the ${PIECE_NAMES[targetPiece.type]} on ${to}!`;
    }

    return {
      type: 'hint',
      title: "Coach's Tactical Whisper",
      message,
      suggestedMove: { from, to },
    };
  }
}

export const chessCoach = new ChessCoachEngine();
