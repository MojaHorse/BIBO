export interface PieceInsignia {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  color: string;
  textColor: string;
  bgColor: string;
}

export const PIECE_INSIGNIAS: PieceInsignia[] = [
  {
    id: 'knight',
    name: 'Vanguard Knight',
    symbol: '♞',
    tagline: 'Tactical leaps & sharp outpost infiltration',
    color: 'from-amber-500/25 to-orange-500/10 text-amber-400 border-amber-500/30',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
  {
    id: 'queen',
    name: 'Obsidian Queen',
    symbol: '♛',
    tagline: 'Absolute battlefield reach & coordinated pressure',
    color: 'from-purple-500/25 to-pink-500/10 text-purple-400 border-purple-500/30',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
  {
    id: 'rook',
    name: 'Iron Citadel',
    symbol: '♜',
    tagline: 'Crushing open files & impenetrable 7th rank batteries',
    color: 'from-blue-500/25 to-cyan-500/10 text-blue-400 border-blue-500/30',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  {
    id: 'bishop',
    name: 'Cipher Bishop',
    symbol: '♝',
    tagline: 'Surgical long-range diagonals & color complex control',
    color: 'from-emerald-500/25 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  {
    id: 'king',
    name: 'Sovereign Command',
    symbol: '♚',
    tagline: 'Fortress defense & decisive endgame centralization',
    color: 'from-[#ffcc00]/25 to-amber-500/10 text-[#ffcc00] border-[#ffcc00]/30',
    textColor: 'text-[#ffcc00]',
    bgColor: 'bg-[#ffcc00]/15',
  },
  {
    id: 'pawn',
    name: 'Iron Vanguard',
    symbol: '♟',
    tagline: 'Relentless space gaining & promotion breakthroughs',
    color: 'from-zinc-500/25 to-zinc-700/10 text-zinc-300 border-zinc-500/30',
    textColor: 'text-zinc-300',
    bgColor: 'bg-zinc-700/20',
  },
];

export const INSIGNIA_MAP: Record<string, PieceInsignia> = Object.fromEntries(
  PIECE_INSIGNIAS.map((insignia) => [insignia.id, insignia])
);

export function getInsignia(id?: string): PieceInsignia {
  if (!id) return PIECE_INSIGNIAS[0];
  return INSIGNIA_MAP[id.toLowerCase()] || PIECE_INSIGNIAS[0];
}
