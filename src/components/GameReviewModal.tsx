'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Chess } from 'chess.js';
import {
  X,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Sparkles,
  ArrowRight,
  Shield,
  User,
} from 'lucide-react';
import { GameReviewReport, MoveAnalysis } from '@/lib/stockfish';
import { ChessBoard } from '@/components/ChessBoard';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: GameReviewReport | null;
  loading: boolean;
  onSelectMove?: (index: number) => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  report,
  loading,
  onSelectMove,
}) => {
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number>(0);
  const [filterType, setFilterType] = useState<'all' | 'blunder' | 'mistake' | 'brilliant'>('all');

  // Auto-focus the first critical moment or last move on report load
  useEffect(() => {
    if (!report || report.moves.length === 0) return;
    const firstCritical = report.moves.findIndex(
      (m) => m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'brilliant'
    );
    setSelectedMoveIndex(firstCritical >= 0 ? firstCritical : 0);
  }, [report]);

  const selectedMove = useMemo(() => {
    if (!report || report.moves.length === 0) return null;
    return report.moves[selectedMoveIndex] || report.moves[0];
  }, [report, selectedMoveIndex]);

  const selectedChess = useMemo(() => {
    if (!selectedMove) return new Chess();
    try {
      return new Chess(selectedMove.fenAfter);
    } catch {
      return new Chess();
    }
  }, [selectedMove]);

  // Sync with parent main board
  const selectMove = (idx: number) => {
    setSelectedMoveIndex(idx);
    onSelectMove?.(idx);
  };

  const handlePrev = () => {
    if (selectedMoveIndex > 0) {
      selectMove(selectedMoveIndex - 1);
    }
  };

  const handleNext = () => {
    if (report && selectedMoveIndex < report.moves.length - 1) {
      selectMove(selectedMoveIndex + 1);
    }
  };

  const handleFirst = () => selectMove(0);
  const handleLast = () => {
    if (report) selectMove(report.moves.length - 1);
  };

  const handleNextCritical = () => {
    if (!report) return;
    const criticalIndices = report.moves
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => m.classification === 'blunder' || m.classification === 'mistake' || m.classification === 'brilliant')
      .map(({ idx }) => idx);

    if (criticalIndices.length === 0) return;
    const nextIdx = criticalIndices.find((i) => i > selectedMoveIndex) ?? criticalIndices[0];
    selectMove(nextIdx);
  };

  // SVG Eval Graph Math with smooth tanh scaling and exact zero-axis intersections
  const graphPoints = useMemo(() => {
    if (!report || report.moves.length === 0) return [];
    const n = report.moves.length;
    const startX = 52;
    const endX = 588;
    const width = endX - startX;

    return report.moves.map((m, i) => {
      const x = n <= 1 ? startX + width / 2 : startX + (i / (n - 1)) * width;
      // Smooth non-linear mapping using tanh: avoids harsh flat-lining at +/-5 pawns
      const normalized = Math.tanh(m.evalAfter / 4.0);
      const y = 60 - normalized * 44;
      return { x, y, move: m, index: i };
    });
  }, [report]);

  const { lineD, whiteAreaD, blackAreaD } = useMemo(() => {
    if (graphPoints.length === 0) return { lineD: '', whiteAreaD: '', blackAreaD: '' };

    // 1. Line path
    let linePath = `M ${graphPoints[0].x.toFixed(1)} ${graphPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < graphPoints.length; i++) {
      linePath += ` L ${graphPoints[i].x.toFixed(1)} ${graphPoints[i].y.toFixed(1)}`;
    }

    // 2. Insert exact zero-crossing intersections (at y=60)
    const zeroY = 60;
    type Point = { x: number; y: number };
    const expanded: Point[] = [graphPoints[0]];

    for (let i = 0; i < graphPoints.length - 1; i++) {
      const p1 = graphPoints[i];
      const p2 = graphPoints[i + 1];

      if ((p1.y < zeroY && p2.y > zeroY) || (p1.y > zeroY && p2.y < zeroY)) {
        const t = (zeroY - p1.y) / (p2.y - p1.y);
        const crossX = p1.x + t * (p2.x - p1.x);
        expanded.push({ x: crossX, y: zeroY });
      }
      expanded.push(p2);
    }

    // 3. Build White (y <= 60) area polygons
    let wArea = '';
    let inWhite = false;
    let whiteSeg = '';

    for (let i = 0; i < expanded.length; i++) {
      const pt = expanded[i];
      if (pt.y <= zeroY) {
        if (!inWhite) {
          inWhite = true;
          whiteSeg = `M ${pt.x.toFixed(1)} ${zeroY} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          whiteSeg += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
      } else {
        if (inWhite) {
          inWhite = false;
          const prev = expanded[i - 1];
          whiteSeg += ` L ${prev.x.toFixed(1)} ${zeroY} Z `;
          wArea += whiteSeg;
          whiteSeg = '';
        }
      }
    }
    if (inWhite) {
      const last = expanded[expanded.length - 1];
      whiteSeg += ` L ${last.x.toFixed(1)} ${zeroY} Z `;
      wArea += whiteSeg;
    }

    // 4. Build Black (y >= 60) area polygons
    let bArea = '';
    let inBlack = false;
    let blackSeg = '';

    for (let i = 0; i < expanded.length; i++) {
      const pt = expanded[i];
      if (pt.y >= zeroY) {
        if (!inBlack) {
          inBlack = true;
          blackSeg = `M ${pt.x.toFixed(1)} ${zeroY} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          blackSeg += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
      } else {
        if (inBlack) {
          inBlack = false;
          const prev = expanded[i - 1];
          blackSeg += ` L ${prev.x.toFixed(1)} ${zeroY} Z `;
          bArea += blackSeg;
          blackSeg = '';
        }
      }
    }
    if (inBlack) {
      const last = expanded[expanded.length - 1];
      blackSeg += ` L ${last.x.toFixed(1)} ${zeroY} Z `;
      bArea += blackSeg;
    }

    return { lineD: linePath, whiteAreaD: wArea, blackAreaD: bArea };
  }, [graphPoints]);

  if (!isOpen) return null;

  const getTagColor = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'brilliant':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/50';
      case 'best':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'excellent':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
      case 'good':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'inaccuracy':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'mistake':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'blunder':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getTagBadge = (classification: MoveAnalysis['classification']) => {
    switch (classification) {
      case 'brilliant':
        return '!!';
      case 'best':
        return '★';
      case 'excellent':
        return '✓';
      case 'inaccuracy':
        return '?!';
      case 'mistake':
        return '?';
      case 'blunder':
        return '??';
      default:
        return '•';
    }
  };

  const filteredMoves = report
    ? report.moves.filter((m) => filterType === 'all' || m.classification === filterType)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-[#16171b] border border-white/[0.08] rounded-2xl text-zinc-100 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              Stockfish Game Review
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition rounded-sm border border-transparent hover:border-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-sm font-bold text-white">Running Tactical Telemetry</span>
              <p className="font-mono text-xs text-zinc-400 animate-pulse">
                Stockfish computing centipawn precision, best moves & accuracy curves...
              </p>
            </div>
          </div>
        ) : !report ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs">
            No move telemetry available for analysis.
          </div>
        ) : (
          <div className="flex flex-col gap-5 overflow-y-auto pt-4 pr-1">
            {/* Accuracy & Performance Rating Hero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* White Card */}
              <div className="p-3.5 sm:p-4 border border-zinc-800 bg-[#161616] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs border border-zinc-400">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase text-zinc-300">White Accuracy</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-sm">
                    ~{report.whitePerformanceElo || Math.round(600 + Math.pow(report.whiteAccuracy / 100, 2.2) * 2100)} ELO Performance
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-black text-white">
                    {report.whiteAccuracy}%
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                    CAPS Precision
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-500"
                    style={{ width: `${report.whiteAccuracy}%` }}
                  />
                </div>
              </div>

              {/* Black Card */}
              <div className="p-3.5 sm:p-4 border border-zinc-800 bg-[#161616] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs border border-zinc-700">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase text-zinc-300">Black Accuracy</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-sm">
                    ~{report.blackPerformanceElo || Math.round(600 + Math.pow(report.blackAccuracy / 100, 2.2) * 2100)} ELO Performance
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-black text-white">
                    {report.blackAccuracy}%
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                    CAPS Precision
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-zinc-400 h-full transition-all duration-500"
                    style={{ width: `${report.blackAccuracy}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive Evaluation Advantage Graph (SVG Area Chart) */}
            <div className="border border-zinc-800 bg-[#141414] p-3 sm:p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">Evaluation Advantage Curve</span>
                  <span className="text-[10px] text-zinc-500">· Click or hover to scrub</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Blunder
                  </span>
                  <span className="flex items-center gap-1 text-orange-400">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> Mistake
                  </span>
                  <span className="flex items-center gap-1 text-teal-400">
                    <span className="w-2 h-2 rounded-full bg-teal-400" /> Brilliant
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="relative w-full h-[120px] bg-[#0c0c0c] border border-zinc-800/80 rounded-xs select-none">
                <svg
                  viewBox="0 0 600 120"
                  preserveAspectRatio="none"
                  className="w-full h-full cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const svgX = (clickX / rect.width) * 600;
                    const clampedX = Math.max(52, Math.min(588, svgX));
                    const ratio = (clampedX - 52) / (588 - 52);
                    const targetIdx = Math.round(ratio * (report.moves.length - 1));
                    selectMove(targetIdx);
                  }}
                >
                  <defs>
                    <linearGradient id="whiteAdvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="blackAdvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* Split Background Zones */}
                  <rect x="52" y="0" width="536" height="60" fill="#ffffff" fillOpacity="0.02" />
                  <rect x="52" y="60" width="536" height="60" fill="#000000" fillOpacity="0.30" />

                  {/* Left Gutter Y-Axis Text Labels (Safely isolated outside the graph line) */}
                  <text x="8" y="24" className="fill-zinc-500 font-mono text-[9px] font-bold select-none pointer-events-none">
                    +5.0
                  </text>
                  <text x="8" y="63" className="fill-zinc-400 font-mono text-[9px] font-bold select-none pointer-events-none">
                     0.0
                  </text>
                  <text x="8" y="103" className="fill-zinc-500 font-mono text-[9px] font-bold select-none pointer-events-none">
                    -5.0
                  </text>

                  {/* Reference Grid Lines */}
                  <line x1="52" y1="20" x2="588" y2="20" stroke="#27272a" strokeWidth="1" strokeDasharray="2 4" />
                  <line x1="52" y1="60" x2="588" y2="60" stroke="#52525b" strokeWidth="1.2" strokeDasharray="4 4" />
                  <line x1="52" y1="100" x2="588" y2="100" stroke="#27272a" strokeWidth="1" strokeDasharray="2 4" />

                  {/* Exact Zero-Intersection Advantage Polygons */}
                  <path d={whiteAreaD} fill="url(#whiteAdvGrad)" />
                  <path d={blackAreaD} fill="url(#blackAdvGrad)" />

                  {/* Main Eval Line */}
                  <path
                    d={lineD}
                    fill="none"
                    stroke="#f4f1eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Key Moment Scatter Points (Only critical blunders, mistakes, brilliants) */}
                  {graphPoints.map((p) => {
                    if (p.move.classification === 'blunder') {
                      return (
                        <circle
                          key={p.index}
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="cursor-pointer hover:scale-150 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectMove(p.index);
                          }}
                        />
                      );
                    }
                    if (p.move.classification === 'mistake') {
                      return (
                        <circle
                          key={p.index}
                          cx={p.x}
                          cy={p.y}
                          r="3.5"
                          fill="#f97316"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="cursor-pointer hover:scale-150 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectMove(p.index);
                          }}
                        />
                      );
                    }
                    if (p.move.classification === 'brilliant') {
                      return (
                        <rect
                          key={p.index}
                          x={p.x - 3.5}
                          y={p.y - 3.5}
                          width="7"
                          height="7"
                          transform={`rotate(45 ${p.x} ${p.y})`}
                          fill="#14b8a6"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="cursor-pointer hover:scale-150 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectMove(p.index);
                          }}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Active Scrub Crosshair Line */}
                  {graphPoints[selectedMoveIndex] && (
                    <g>
                      <line
                        x1={graphPoints[selectedMoveIndex].x}
                        y1="6"
                        x2={graphPoints[selectedMoveIndex].x}
                        y2="114"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={graphPoints[selectedMoveIndex].x}
                        cy={graphPoints[selectedMoveIndex].y}
                        r="5"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Dual Column Layout: Mini Board Preview + Tactical Scrubbing */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Mini Board & Selected Move Card */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                {/* Mini Board with Badges & Arrows */}
                <div className="w-full max-w-[285px] sm:max-w-[310px] mx-auto border-2 border-zinc-700 bg-[#0e0e0e] p-1 shadow-xl">
                  <ChessBoard
                    chess={selectedChess}
                    orientation="w"
                    lastMove={
                      selectedMove?.from && selectedMove?.to
                        ? { from: selectedMove.from, to: selectedMove.to }
                        : null
                    }
                    hintSquares={selectedMove?.bestMoveSquare ?? null}
                    reviewBadge={
                      selectedMove?.to
                        ? { square: selectedMove.to, classification: selectedMove.classification }
                        : null
                    }
                    disabled={true}
                    onMove={() => false}
                  />
                </div>

                {/* Tactical Move Card */}
                {selectedMove && (
                  <div className="border border-zinc-800 bg-[#161616] p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-400 font-bold">
                          Move {selectedMove.moveNumber}.{selectedMove.color === 'b' ? '..' : ''}
                        </span>
                        <span className="font-serif text-lg font-black text-white">
                          {selectedMove.san}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono font-bold uppercase rounded-xs ${getTagColor(
                            selectedMove.classification
                          )}`}
                        >
                          <span>{getTagBadge(selectedMove.classification)}</span>
                          <span>{selectedMove.classification}</span>
                        </span>
                      </div>

                      <span className="font-mono text-xs font-bold text-zinc-300">
                        {selectedMove.evalAfter > 0
                          ? `+${selectedMove.evalAfter.toFixed(1)}`
                          : selectedMove.evalAfter.toFixed(1)}
                      </span>
                    </div>

                    {/* Commentary */}
                    <p className="font-sans text-xs text-zinc-300 leading-relaxed border-t border-zinc-800/80 pt-2">
                      {selectedMove.commentary || 'Solid positional continuation.'}
                    </p>

                    {/* Engine Best Move Recommendation */}
                    {selectedMove.bestMoveSan &&
                      (selectedMove.classification === 'blunder' ||
                        selectedMove.classification === 'mistake' ||
                        selectedMove.classification === 'inaccuracy') && (
                        <div className="flex items-center gap-2 bg-[#1f1f1f] border border-amber-500/30 px-2.5 py-1.5 text-xs font-mono">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-zinc-400">Best continuation:</span>
                          <span className="font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 border border-amber-500/40">
                            {selectedMove.bestMoveSan}
                          </span>
                        </div>
                      )}

                    {/* Stepper Controls */}
                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2.5 font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleFirst}
                          title="First Move"
                          className="p-1.5 bg-[#202020] hover:bg-zinc-700 text-zinc-300 transition"
                        >
                          <SkipBack className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handlePrev}
                          title="Previous Move"
                          className="p-1.5 bg-[#202020] hover:bg-zinc-700 text-zinc-300 transition"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-zinc-400 font-bold">
                          {selectedMoveIndex + 1} / {report.moves.length}
                        </span>
                        <button
                          onClick={handleNext}
                          title="Next Move"
                          className="p-1.5 bg-[#202020] hover:bg-zinc-700 text-zinc-300 transition"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleLast}
                          title="Last Move"
                          className="p-1.5 bg-[#202020] hover:bg-zinc-700 text-zinc-300 transition"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={handleNextCritical}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-black font-bold uppercase tracking-wider text-[11px] hover:bg-amber-400 transition"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Next Key Moment</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Move Ledger & Classification Matrix */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Tactical Classification Matrix */}
                <div className="border border-zinc-800 bg-[#141414] p-3.5">
                  <h3 className="font-mono text-xs uppercase text-zinc-400 font-bold tracking-wider mb-2">
                    Tactical Classifications
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                    {(
                      [
                        { key: 'brilliant', label: 'Brilliant', icon: Zap, color: 'text-teal-400' },
                        { key: 'best', label: 'Best Moves', icon: Trophy, color: 'text-emerald-400' },
                        { key: 'excellent', label: 'Excellent', icon: CheckCircle, color: 'text-sky-400' },
                        { key: 'inaccuracy', label: 'Inaccuracies', icon: AlertTriangle, color: 'text-amber-400' },
                        { key: 'mistake', label: 'Mistakes', icon: AlertTriangle, color: 'text-orange-400' },
                        { key: 'blunder', label: 'Blunders', icon: AlertTriangle, color: 'text-red-400' },
                      ] as const
                    ).map((row) => (
                      <div
                        key={row.key}
                        className="flex items-center justify-between p-2 bg-[#1b1b1b] border border-zinc-800/80"
                      >
                        <div className="flex items-center gap-1.5">
                          <row.icon className={`w-3.5 h-3.5 ${row.color}`} />
                          <span className="font-bold text-zinc-200 text-[11px]">{row.label}</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold">
                          <span className="text-white">{report.whiteBreakdown[row.key]}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-zinc-400">{report.blackBreakdown[row.key]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Move Ledger Filter Tabs */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase text-zinc-400 font-bold tracking-wider">
                      Move Ledger
                    </span>

                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      {(['all', 'blunder', 'mistake', 'brilliant'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-2 py-0.5 uppercase font-bold border transition ${
                            filterType === type
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800 font-mono text-xs bg-[#121212]">
                    {filteredMoves.map((m, idx) => {
                      const originalIndex = report.moves.indexOf(m);
                      const isSelected = originalIndex === selectedMoveIndex;

                      return (
                        <button
                          key={idx}
                          onClick={() => selectMove(originalIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 transition text-left ${
                            isSelected
                              ? 'bg-zinc-800 border-l-2 border-amber-400 text-white'
                              : 'hover:bg-zinc-800/50 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-zinc-500 w-8">
                              {m.moveNumber}.{m.color === 'b' ? '..' : ''}
                            </span>
                            <span className="font-bold text-white text-sm">{m.san}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-zinc-400 tabular-nums font-bold">
                              {m.evalAfter > 0 ? `+${m.evalAfter.toFixed(1)}` : m.evalAfter.toFixed(1)}
                            </span>
                            <span
                              className={`px-2 py-0.5 border text-[10px] font-bold uppercase rounded-xs ${getTagColor(
                                m.classification
                              )}`}
                            >
                              {m.classification}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
