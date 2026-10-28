import { Chess, PieceSymbol, Color, Square } from 'chess.js';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export interface CapturedPieces {
  w: PieceSymbol[]; // pieces captured by white (black pieces lost)
  b: PieceSymbol[]; // pieces captured by black (white pieces lost)
  scoreDiff: number; // positive = white ahead, negative = black ahead
}

export function getCapturedPieces(chess: Chess): CapturedPieces {
  const initialPieces: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };

  const currentPieces: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  const board = chess.board();
  for (const row of board) {
    for (const square of row) {
      if (square) {
        currentPieces[square.color][square.type]++;
      }
    }
  }

  const whiteCaptured: PieceSymbol[] = [];
  const blackCaptured: PieceSymbol[] = [];

  const types: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

  for (const t of types) {
    const missingBlack = initialPieces.b[t] - currentPieces.b[t];
    for (let i = 0; i < missingBlack; i++) {
      whiteCaptured.push(t);
    }

    const missingWhite = initialPieces.w[t] - currentPieces.w[t];
    for (let i = 0; i < missingWhite; i++) {
      blackCaptured.push(t);
    }
  }

  // Sort captured pieces descending by value
  const sortByVal = (a: PieceSymbol, b: PieceSymbol) => PIECE_VALUES[b] - PIECE_VALUES[a];
  whiteCaptured.sort(sortByVal);
  blackCaptured.sort(sortByVal);

  const whiteMaterial = whiteCaptured.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
  const blackMaterial = blackCaptured.reduce((acc, p) => acc + PIECE_VALUES[p], 0);

  return {
    w: whiteCaptured,
    b: blackCaptured,
    scoreDiff: whiteMaterial - blackMaterial,
  };
}

export function getPieceAssetPath(color: Color, type: PieceSymbol): string {
  const c = color === 'w' ? 'w' : 'b';
  const t = type.toUpperCase();
  return `/pieces/${c}${t}.png`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
