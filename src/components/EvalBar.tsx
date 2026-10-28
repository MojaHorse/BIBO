'use client';

import React from 'react';
import { Color } from 'chess.js';

interface EvalBarProps {
  score: number; // in pawns (+2.5 = white +2.5, -1.2 = black +1.2)
  isMate: boolean;
  mateIn?: number;
  orientation: Color;
  visible?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  isMate,
  mateIn,
  orientation,
  visible = true,
}) => {
  if (!visible) return null;

  // Calculate white win probability percentage (standard chess sigmoid)
  let whitePercent = 50;
  if (isMate && mateIn !== undefined) {
    whitePercent = mateIn > 0 ? 100 : 0;
  } else {
    // Sigmoid curve: score of +4 = ~90%, 0 = 50%, -4 = ~10%
    whitePercent = Math.max(5, Math.min(95, (1 / (1 + Math.pow(10, -score / 4))) * 100));
  }

  // Display text badge
  let displayText = '0.0';
  if (isMate && mateIn !== undefined) {
    displayText = `M${Math.abs(mateIn)}`;
  } else {
    displayText = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
  }

  // Adjust display based on board orientation
  const isWhiteBottom = orientation === 'w';
  const bottomBarHeight = isWhiteBottom ? whitePercent : 100 - whitePercent;

  return (
    <div className="relative w-4 sm:w-5 h-full rounded-lg bg-[#16171b] border border-white/10 flex flex-col justify-end overflow-hidden shadow-sm select-none shrink-0">
      {/* White portion */}
      <div
        className="w-full bg-[#f4f1eb] transition-all duration-300 ease-out"
        style={{ height: `${bottomBarHeight}%` }}
      />

      {/* Numerical score tag */}
      <div
        className={`absolute w-full text-center font-mono font-bold text-[8px] pointer-events-none ${
          (isWhiteBottom && score >= 0) || (!isWhiteBottom && score <= 0)
            ? 'bottom-1 text-[#121212]'
            : 'top-1 text-[#f4f1eb]'
        }`}
      >
        {displayText}
      </div>
    </div>
  );
};
