// Curated Multi-Game Tactical Puzzles Engine & Dataset for BIBO (Chess, Checkers, Morabaraba)

import { Piece } from './checkers-engine';
import { PointId, CowColor, GamePhase, ALL_24_POINTS, ALL_25_POINTS } from './morabaraba-engine';

export type PuzzleGameId = 'chess' | 'checkers' | 'morabaraba';

export type PuzzleTheme =
  | 'mate'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'sacrifice'
  | 'deflection'
  | 'double-jump'
  | 'triple-jump'
  | 'king-coronation'
  | 'forced-jump'
  | 'blockade'
  | 'mill-strike'
  | 'flike-trap'
  | 'spoke-control'
  | 'flying-hop';

export interface PuzzleSetupMove {
  from: string;
  to: string;
  shot?: string;
  description?: string;
}

export interface Puzzle {
  id: string;
  gameId: PuzzleGameId;
  title: string;
  theme: PuzzleTheme;
  rating: number;
  fen: string;
  turn: 'w' | 'b';
  setupMove?: PuzzleSetupMove;
  // Array of moves:
  // Chess: ['e7e8', 'd8e8']
  // Checkers: ['4,1->2,3', '2,3->0,5']
  // Morabaraba: ['M1->O1', 'shoot:M4']
  moves: string[];
  explanation: string;
  variant?: string;
  initialCheckersBoard?: Piece[][];
  initialMorabarabaBoard?: Record<PointId, CowColor | null>;
  morabarabaPhase?: GamePhase;
}

// Helper to construct an empty 8x8 checkers board with selective placements
export function createCheckersBoard(
  placements: { r: number; c: number; piece: 'w' | 'W' | 'b' | 'B' }[]
): Piece[][] {
  const b: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  for (const p of placements) {
    b[p.r][p.c] = p.piece;
  }
  return b;
}

// Helper to construct Morabaraba board with selective placements
export function createMorabarabaBoard(
  variant: 'standard-24' | 'koti-25',
  placements: Partial<Record<PointId, CowColor>>
): Record<PointId, CowColor | null> {
  const points = variant === 'koti-25' ? ALL_25_POINTS : ALL_24_POINTS;
  const b: Record<PointId, CowColor | null> = {} as any;
  for (const pt of points) {
    b[pt] = placements[pt] || null;
  }
  if (variant === 'standard-24') b.C0 = null;
  return b;
}

export const PUZZLES_DATASET: Puzzle[] = [
  // ==========================================
  // 1. CHESS TACTICAL PUZZLES (12 PUZZLES)
  // ==========================================
  {
    id: 'pz_001',
    gameId: 'chess',
    title: 'Back-Rank Queen Deflection',
    theme: 'mate',
    rating: 1100,
    fen: '4r1k1/4Qppp/8/8/8/8/5PPP/4R1K1 b - - 0 1',
    turn: 'w',
    setupMove: { from: 'e8', to: 'd8', description: '1...Rad8? abandoning the back-rank guard' },
    moves: ['e7e8', 'd8e8', 'e1e8'],
    explanation: 'Sacrificing the queen on e8 deflects the black rook from the back rank, allowing the white rook to deliver checkmate.',
  },
  {
    id: 'pz_002',
    gameId: 'chess',
    title: 'Corridor Rook Skewer',
    theme: 'skewer',
    rating: 1250,
    fen: '4r3/8/8/3k4/8/8/8/3R3K b - - 0 1',
    turn: 'w',
    setupMove: { from: 'd5', to: 'e5', description: '1...Ke5? stepping into the open e-file corridor' },
    moves: ['d1e1', 'e5d6', 'e1e8'],
    explanation: 'Checking along the e-file forces the enemy king to step aside, skewering and winning the undefended black rook on e8.',
  },
  {
    id: 'pz_003',
    gameId: 'chess',
    title: 'The Operatic Queen Sacrifice',
    theme: 'mate',
    rating: 1300,
    fen: '3r2k1/p4ppp/1q6/8/8/3Q4/PPP2PPP/3R2K1 w - - 0 1',
    turn: 'w',
    moves: ['d3d8', 'b6d8', 'd1d8'],
    explanation: 'Queen sacrifice on d8 deflects the black queen, allowing White to deliver back-rank checkmate.',
  },
  {
    id: 'pz_004',
    gameId: 'chess',
    title: 'Philidor Smothered Mate',
    theme: 'sacrifice',
    rating: 1450,
    fen: '5r1k/6pp/7N/8/2Q5/8/6PP/7K w - - 0 1',
    turn: 'w',
    moves: ['c4g8', 'f8g8', 'h6f7'],
    explanation: 'Sacrificing the queen on g8 forces the black rook to block its own king, setting up an immortal smothered checkmate on f7.',
  },
  {
    id: 'pz_005',
    gameId: 'chess',
    title: 'Center-Fork Trick',
    theme: 'fork',
    rating: 1150,
    fen: 'r1bqkb1r/pppp1ppp/2n5/8/8/3Q4/PPPP1PPP/R1B1K2R b KQkq - 0 1',
    turn: 'w',
    setupMove: { from: 'c6', to: 'b4', description: '1...Nb4? leaping into undefended center territory' },
    moves: ['d3e4', 'f8e7', 'e4b4'],
    explanation: 'Centralized queen check on e4 forks the black king and the undefended knight on b4, winning a full minor piece.',
  },
  {
    id: 'pz_006',
    gameId: 'chess',
    title: 'Paul Morphy Opera Game Mate',
    theme: 'mate',
    rating: 1400,
    fen: '4k2r/p2n1ppp/8/4p1B1/8/1Q6/PPP2PPP/2KR4 w k - 0 1',
    turn: 'w',
    moves: ['b3b8', 'd7b8', 'd1d8'],
    explanation: 'Morphy classic queen sacrifice on b8 deflects the defender, allowing the d1 rook to deliver checkmate assisted by the g5 bishop.',
  },
  {
    id: 'pz_007',
    gameId: 'chess',
    title: 'Discovered Double-Check Battery',
    theme: 'discovered',
    rating: 1350,
    fen: 'r3k2r/pppq1ppp/8/8/4B3/8/PPP2PPP/4R1K1 w kq - 0 1',
    turn: 'w',
    moves: ['e4c6', 'e8d8', 'c6d7'],
    explanation: 'Moving the bishop to c6 unleashes a devastating double check from both rook and bishop, winning the black queen.',
  },
  {
    id: 'pz_008',
    gameId: 'chess',
    title: 'Legal Mate Pattern',
    theme: 'mate',
    rating: 1500,
    fen: 'r2qkb1r/ppp2ppp/2np4/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R w KQkq - 0 1',
    turn: 'w',
    moves: ['c4f7', 'e8e7', 'c3d5'],
    explanation: 'After Black captures White queen on d1, White delivers checkmate with minor pieces: Bxf7+ followed by Nd5#.',
  },
  {
    id: 'pz_009',
    gameId: 'chess',
    title: 'Royal Outpost Knight Fork',
    theme: 'fork',
    rating: 1250,
    fen: 'r2qkb1r/ppp1pppp/2n5/3N4/5B2/8/PPPP1PPP/R2QK1NR w KQkq - 0 1',
    turn: 'w',
    moves: ['d5c7', 'e8d7', 'c7a8'],
    explanation: 'Knight leaps into c7 with check, supported by the f4 bishop, forking the king and rook to win decisive material.',
  },
  {
    id: 'pz_010',
    gameId: 'chess',
    title: 'Arabian Hook Checkmate',
    theme: 'mate',
    rating: 1350,
    fen: '6k1/3R3p/5N2/8/8/8/8/7K b - - 0 1',
    turn: 'w',
    setupMove: { from: 'g8', to: 'h8', description: '1...Kh8? cornering into the mating net' },
    moves: ['d7h7'],
    explanation: 'Rook to h7 delivers the Arabian checkmate, supported by the knight on f6 which simultaneously blocks the g8 escape square.',
  },
  {
    id: 'pz_011',
    gameId: 'chess',
    title: 'Exploiting the Pinned Guard',
    theme: 'pin',
    rating: 1300,
    fen: 'r3k2r/pppqp1pp/2np1n2/8/4P3/2N2N2/PPP2PPP/R1BR2K1 w kq - 0 1',
    turn: 'w',
    moves: ['e4e5', 'd6e5', 'd1d7'],
    explanation: 'Pushing e5 attacks the knight on f6 while exploiting the absolute pin on the d-file, winning the black queen.',
  },
  {
    id: 'pz_012',
    gameId: 'chess',
    title: 'Deflection of the Back-Rank Guard',
    theme: 'deflection',
    rating: 1450,
    fen: '3r2k1/p4ppp/8/q7/8/5Q2/PPP2PPP/3R2K1 w - - 0 1',
    turn: 'w',
    moves: ['f3d5', 'd8d5', 'd1d5'],
    explanation: 'Deflecting the black rook from the back rank by offering the queen, winning the rook and achieving decisive advantage.',
  },

  // ==========================================
  // 2. CHECKERS TACTICAL PUZZLES (8 PUZZLES)
  // ==========================================
  {
    id: 'pz_chk_001',
    gameId: 'checkers',
    title: 'Double-Jump King Coronation',
    theme: 'double-jump',
    rating: 1150,
    fen: 'checkers_001',
    turn: 'w',
    setupMove: { from: '2,3', to: '3,2', description: 'Black stepped forward (2,3)->(3,2) into the jump corridor' },
    moves: ['4,1->2,3', '2,3->0,5'],
    explanation: 'White man at (4,1) executes a mandatory multi-jump over Black at (3,2) and (1,4), reaching (0,5) on the back rank to be crowned King!',
    initialCheckersBoard: createCheckersBoard([
      { r: 4, c: 1, piece: 'w' },
      { r: 2, c: 3, piece: 'b' },
      { r: 1, c: 4, piece: 'b' },
      { r: 7, c: 0, piece: 'w' },
      { r: 0, c: 7, piece: 'b' },
    ]),
  },
  {
    id: 'pz_chk_002',
    gameId: 'checkers',
    title: 'Crowned King Sweeper',
    theme: 'king-coronation',
    rating: 1350,
    fen: 'checkers_002',
    turn: 'w',
    setupMove: { from: '1,2', to: '2,3', description: 'Black stepped (1,2)->(2,3) into the King sweeper path' },
    moves: ['3,2->1,4', '1,4->3,6'],
    explanation: 'White King at (3,2) exploits king mobility to jump forward over (2,3) to (1,4), then immediately jumps backwards over (2,5) to (3,6) in a sweeping capture combo!',
    initialCheckersBoard: createCheckersBoard([
      { r: 3, c: 2, piece: 'W' },
      { r: 1, c: 2, piece: 'b' },
      { r: 2, c: 5, piece: 'b' },
      { r: 6, c: 1, piece: 'w' },
      { r: 0, c: 1, piece: 'B' },
    ]),
  },
  {
    id: 'pz_chk_003',
    gameId: 'checkers',
    title: 'Forced Jump Squeeze',
    theme: 'forced-jump',
    rating: 1400,
    fen: 'checkers_003',
    turn: 'w',
    setupMove: { from: '3,2', to: '4,3', description: 'Black blundered (3,2)->(4,3) right in front of White' },
    moves: ['5,4->3,2'],
    explanation: 'White executes a decisive jump from (5,4) over (4,3) to (3,2), trapping Black in a corner blockade with zero legal escape routes.',
    initialCheckersBoard: createCheckersBoard([
      { r: 5, c: 4, piece: 'w' },
      { r: 3, c: 2, piece: 'b' },
      { r: 2, c: 1, piece: 'b' },
      { r: 7, c: 6, piece: 'w' },
      { r: 1, c: 0, piece: 'b' },
    ]),
  },
  {
    id: 'pz_chk_004',
    gameId: 'checkers',
    title: 'Triple-Jump Avalanche',
    theme: 'triple-jump',
    rating: 1500,
    fen: 'checkers_004',
    turn: 'w',
    setupMove: { from: '4,1', to: '5,2', description: 'Black advanced (4,1)->(5,2) triggering the avalanche' },
    moves: ['6,1->4,3', '4,3->2,5', '2,5->0,7'],
    explanation: 'A breathtaking 3-in-a-row jump sequence: White leaps from (6,1) across (5,2), (3,4), and (1,6) all the way into the coronation corner at (0,7)!',
    initialCheckersBoard: createCheckersBoard([
      { r: 6, c: 1, piece: 'w' },
      { r: 4, c: 1, piece: 'b' },
      { r: 3, c: 4, piece: 'b' },
      { r: 1, c: 6, piece: 'b' },
      { r: 7, c: 4, piece: 'w' },
      { r: 0, c: 3, piece: 'b' },
    ]),
  },
  {
    id: 'pz_chk_005',
    gameId: 'checkers',
    title: 'Double-Corner Blockade',
    theme: 'blockade',
    rating: 1300,
    fen: 'checkers_005',
    turn: 'w',
    moves: ['5,6->4,7'],
    explanation: 'Stepping to the rim at (4,7) locks Black into an unbreakable double-corner zugzwang, forcing immediate concession.',
    initialCheckersBoard: createCheckersBoard([
      { r: 5, c: 6, piece: 'w' },
      { r: 3, c: 6, piece: 'b' },
      { r: 7, c: 6, piece: 'w' },
      { r: 1, c: 0, piece: 'B' },
    ]),
  },
  {
    id: 'pz_chk_006',
    gameId: 'checkers',
    title: 'The King Breeches Fork',
    theme: 'fork',
    rating: 1380,
    fen: 'checkers_006',
    turn: 'w',
    moves: ['4,3->3,4'],
    explanation: 'The White King steps directly into the "breeches" between two Black pieces at (2,3) and (2,5), ensuring a decisive capture on the following move.',
    initialCheckersBoard: createCheckersBoard([
      { r: 4, c: 3, piece: 'W' },
      { r: 2, c: 3, piece: 'b' },
      { r: 2, c: 5, piece: 'b' },
      { r: 7, c: 2, piece: 'w' },
    ]),
  },
  {
    id: 'pz_chk_007',
    gameId: 'checkers',
    title: 'Center Cross-Cut Sacrifice',
    theme: 'sacrifice',
    rating: 1420,
    fen: 'checkers_007',
    turn: 'w',
    moves: ['5,2->3,4'],
    explanation: 'White cuts through the center from (5,2) to (3,4), capturing Black at (4,3) and controlling both primary attack diagonal lanes.',
    initialCheckersBoard: createCheckersBoard([
      { r: 5, c: 2, piece: 'w' },
      { r: 4, c: 3, piece: 'b' },
      { r: 2, c: 5, piece: 'b' },
      { r: 6, c: 5, piece: 'w' },
    ]),
  },
  {
    id: 'pz_chk_008',
    gameId: 'checkers',
    title: 'King Flank Strike',
    theme: 'double-jump',
    rating: 1470,
    fen: 'checkers_008',
    turn: 'w',
    moves: ['2,1->4,3', '4,3->6,5'],
    explanation: 'White King at (2,1) dives backward into the board, executing a two-ply reverse jump combo over (3,2) and (5,4) to crush the Black offensive.',
    initialCheckersBoard: createCheckersBoard([
      { r: 2, c: 1, piece: 'W' },
      { r: 3, c: 2, piece: 'b' },
      { r: 5, c: 4, piece: 'b' },
      { r: 7, c: 0, piece: 'w' },
    ]),
  },

  // ==========================================
  // 3. MORABARABA TACTICAL PUZZLES (8 PUZZLES)
  // ==========================================
  {
    id: 'pz_mora_001',
    gameId: 'morabaraba',
    title: 'Spoke Mill Strike & Shoot',
    theme: 'mill-strike',
    rating: 1200,
    fen: 'mora_001',
    turn: 'w',
    setupMove: { from: 'M3', to: 'M4', description: 'Black advanced M3->M4 into the spoke crossfire' },
    moves: ['M1->O1', 'shoot:M4'],
    explanation: 'Sliding along the top spoke from M1 to O1 completes the outer mill O0-O1-O2, allowing White to shoot Black’s dangerous central defender on M4!',
    variant: 'standard-24',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      O0: 'w',
      O2: 'w',
      M1: 'w',
      O6: 'w',
      I3: 'w',
      M3: 'b',
      O4: 'b',
      O5: 'b',
      M6: 'b',
    }),
  },
  {
    id: 'pz_mora_002',
    gameId: 'morabaraba',
    title: 'The Flike Shuttle Lock',
    theme: 'flike-trap',
    rating: 1350,
    fen: 'mora_002',
    turn: 'w',
    setupMove: { from: 'O6', to: 'O7', description: 'Black stepped O6->O7 attempting outer perimeter defense' },
    moves: ['M3->I3', 'shoot:O7'],
    explanation: 'Sliding from M3 to I3 creates the inner mill I2-I3-I4, securing a game-winning shot on Black’s last outer guard.',
    variant: 'standard-24',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      I2: 'w',
      I4: 'w',
      M3: 'w',
      O0: 'w',
      O6: 'b',
      M7: 'b',
      M5: 'b',
      O3: 'b',
    }),
  },
  {
    id: 'pz_mora_003',
    gameId: 'morabaraba',
    title: 'Lesotho Koti Center Hub Domination',
    theme: 'spoke-control',
    rating: 1450,
    fen: 'mora_003',
    turn: 'w',
    setupMove: { from: 'M3', to: 'M2', description: 'Black advanced M3->M2 seeking inner ring control' },
    moves: ['I3->C0', 'shoot:M2'],
    explanation: 'In 25-Point Koti, moving from I3 to the central hub C0 forms the diagonal mill I0-C0-I4 and shoots the enemy cow on M2!',
    variant: 'koti-25',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('koti-25', {
      I0: 'w',
      I4: 'w',
      I3: 'w',
      O1: 'w',
      M1: 'w',
      M3: 'b',
      O2: 'b',
      M4: 'b',
    }),
  },
  {
    id: 'pz_mora_004',
    gameId: 'morabaraba',
    title: 'Flying Phase Hop (Ukuflela)',
    theme: 'flying-hop',
    rating: 1520,
    fen: 'mora_004',
    turn: 'w',
    setupMove: { from: 'M5', to: 'M6', description: 'Black shifted M5->M6 attempting to close White in' },
    moves: ['O0->I5', 'shoot:M6'],
    explanation: 'With only 3 White cows remaining, White enters the Flying Phase and leaps across the entire kraal directly to I5, forming the mill I4-I5-I6 and shooting M6!',
    variant: 'standard-24',
    morabarabaPhase: 'flying',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      O0: 'w',
      I4: 'w',
      I6: 'w',
      M5: 'b',
      O4: 'b',
      O6: 'b',
      M2: 'b',
    }),
  },
  {
    id: 'pz_mora_005',
    gameId: 'morabaraba',
    title: 'Southern Spoke Lockout',
    theme: 'spoke-control',
    rating: 1280,
    fen: 'mora_005',
    turn: 'w',
    setupMove: { from: 'O2', to: 'O3', description: 'Black slid O2->O3 into the eastern spoke corridor' },
    moves: ['M5->O5', 'shoot:O3'],
    explanation: 'Sliding south from M5 to O5 completes the bottom outer mill O4-O5-O6, removing Black’s east spoke attacker.',
    variant: 'standard-24',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      O4: 'w',
      O6: 'w',
      M5: 'w',
      I1: 'w',
      O2: 'b',
      M3: 'b',
      M7: 'b',
    }),
  },
  {
    id: 'pz_mora_006',
    gameId: 'morabaraba',
    title: 'Inner Ring Encirclement',
    theme: 'mill-strike',
    rating: 1390,
    fen: 'mora_006',
    turn: 'w',
    setupMove: { from: 'M1', to: 'M0', description: 'Black advanced M1->M0 to anchor the middle ring' },
    moves: ['M7->I7', 'shoot:M0'],
    explanation: 'Moving from M7 to I7 establishes the western inner mill I6-I7-I0, immediately unseating Black’s cornerstone piece on M0.',
    variant: 'standard-24',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      I6: 'w',
      I0: 'w',
      M7: 'w',
      M1: 'b',
      O0: 'b',
      O2: 'b',
    }),
  },
  {
    id: 'pz_mora_007',
    gameId: 'morabaraba',
    title: 'Double Mill Pivot Threat',
    theme: 'flike-trap',
    rating: 1480,
    fen: 'mora_007',
    turn: 'w',
    setupMove: { from: 'I1', to: 'I2', description: 'Black shifted I1->I2 contesting the inner battery' },
    moves: ['O2->M2', 'shoot:I2'],
    explanation: 'Sliding White cow into M2 completes the middle spoke mill M0-M1-M2, dismantling Black’s inner battery.',
    variant: 'standard-24',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('standard-24', {
      M0: 'w',
      M1: 'w',
      O2: 'w',
      I1: 'b',
      I3: 'b',
      O4: 'b',
    }),
  },
  {
    id: 'pz_mora_008',
    gameId: 'morabaraba',
    title: 'Koti Center Hub Clearance',
    theme: 'spoke-control',
    rating: 1550,
    fen: 'mora_008',
    turn: 'w',
    setupMove: { from: 'O0', to: 'O1', description: 'Black advanced O0->O1 contesting the north spoke' },
    moves: ['C0->I1', 'shoot:O1'],
    explanation: 'White bursts from center hub C0 onto I1, simultaneously completing the top inner mill I0-I1-I2 and eliminating Black’s outer spoke anchor.',
    variant: 'koti-25',
    morabarabaPhase: 'moving',
    initialMorabarabaBoard: createMorabarabaBoard('koti-25', {
      C0: 'w',
      I0: 'w',
      I2: 'w',
      O0: 'b',
      M3: 'b',
      O5: 'b',
    }),
  },
];

/**
 * Returns a puzzle deterministically for the given calendar day and game discipline.
 */
export function getDailyPuzzle(date?: Date, gameId: PuzzleGameId = 'chess'): Puzzle {
  const filtered = PUZZLES_DATASET.filter((p) => p.gameId === gameId);
  const dataset = filtered.length > 0 ? filtered : PUZZLES_DATASET;
  const d = date || new Date(2026, 0, 1);
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const index = Math.abs(dayOfYear) % dataset.length;
  return dataset[index];
}

/**
 * Returns a puzzle, prioritizing ones NOT yet solved by the player to eliminate immediate repeats.
 */
export function getRandomPuzzle(
  difficulty?: 'easy' | 'medium' | 'hard',
  excludeIds: string[] | string = [],
  gameId: PuzzleGameId = 'chess'
): Puzzle {
  const excluded = Array.isArray(excludeIds) ? excludeIds : excludeIds ? [excludeIds] : [];
  const baseList = PUZZLES_DATASET.filter((p) => p.gameId === gameId);

  // Filter by difficulty if provided
  let difficultyFiltered = baseList;
  if (difficulty === 'easy') {
    difficultyFiltered = baseList.filter((p) => p.rating < 1300);
  } else if (difficulty === 'medium') {
    difficultyFiltered = baseList.filter((p) => p.rating >= 1300 && p.rating < 1600);
  } else if (difficulty === 'hard') {
    difficultyFiltered = baseList.filter((p) => p.rating >= 1600);
  }

  const poolToUse = difficultyFiltered.length > 0 ? difficultyFiltered : baseList;

  // 1. First priority: Puzzles never solved yet
  const unsolved = poolToUse.filter((p) => !excluded.includes(p.id));
  if (unsolved.length > 0) {
    const randomIndex = Math.floor(Math.random() * unsolved.length);
    return unsolved[randomIndex];
  }

  // 2. Second priority: If all solved, pick one that was NOT the immediate last played puzzle
  const lastPlayedId = excluded[excluded.length - 1];
  const notImmediateLast = poolToUse.filter((p) => p.id !== lastPlayedId);
  const finalCandidates = notImmediateLast.length > 0 ? notImmediateLast : poolToUse;

  const randomIndex = Math.floor(Math.random() * finalCandidates.length);
  return finalCandidates[randomIndex] || baseList[0];
}

/**
 * Validates a played move against the expected move in the puzzle sequence across all games.
 */
export function validatePuzzleMove(
  puzzle: Puzzle,
  stepIndex: number,
  playedMove: string
): { isCorrect: boolean; isComplete: boolean; nextCounterMove?: string } {
  const expected = puzzle.moves[stepIndex];
  if (!expected) {
    return { isCorrect: false, isComplete: false };
  }

  const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '');
  const isCorrect = clean(playedMove) === clean(expected);

  if (!isCorrect) {
    return { isCorrect: false, isComplete: false };
  }

  const isComplete = stepIndex >= puzzle.moves.length - 1;
  const nextCounterMove = puzzle.moves[stepIndex + 1];

  return {
    isCorrect: true,
    isComplete,
    nextCounterMove,
  };
}
