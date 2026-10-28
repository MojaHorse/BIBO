'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PointId,
  CowColor,
  GamePhase,
  MorabarabaVariant,
  ADJACENCY_24,
  ADJACENCY_25,
  ALL_24_POINTS,
  ALL_25_POINTS,
  MILLS_24,
  MILLS_25,
} from '@/lib/morabaraba-engine';

interface MorabarabaBoardProps {
  variant: MorabarabaVariant;
  board: Record<PointId, CowColor | null>;
  turn: CowColor;
  phase: GamePhase;
  shootPending: boolean;
  shootableCows: PointId[];
  legalMoves: { from?: PointId; to: PointId }[];
  onPlace: (point: PointId) => void;
  onMove: (from: PointId, to: PointId) => void;
  onReposition?: (from: PointId, to: PointId) => void;
  onShoot: (point: PointId) => void;
  lastMove?: { from?: PointId; to?: PointId; shot?: PointId } | null;
  disabled?: boolean;
  onAlert?: (msg: string) => void;
  unplacedW?: number;
  hintAction?: {
    type: 'place' | 'move' | 'shoot';
    from?: PointId;
    to?: PointId;
    shot?: PointId;
  } | null;
}

// 800x800 coordinate map
export const POINT_COORDINATES: Record<PointId, { x: number; y: number }> = {
  // Outer Ring (Padding 90)
  O0: { x: 90, y: 90 },
  O1: { x: 400, y: 90 },
  O2: { x: 710, y: 90 },
  O3: { x: 710, y: 400 },
  O4: { x: 710, y: 710 },
  O5: { x: 400, y: 710 },
  O6: { x: 90, y: 710 },
  O7: { x: 90, y: 400 },

  // Middle Ring (Padding 190)
  M0: { x: 190, y: 190 },
  M1: { x: 400, y: 190 },
  M2: { x: 610, y: 190 },
  M3: { x: 610, y: 400 },
  M4: { x: 610, y: 610 },
  M5: { x: 400, y: 610 },
  M6: { x: 190, y: 610 },
  M7: { x: 190, y: 400 },

  // Inner Ring (Padding 290)
  I0: { x: 290, y: 290 },
  I1: { x: 400, y: 290 },
  I2: { x: 510, y: 290 },
  I3: { x: 510, y: 400 },
  I4: { x: 510, y: 510 },
  I5: { x: 400, y: 510 },
  I6: { x: 290, y: 510 },
  I7: { x: 290, y: 400 },

  // Center Dot (Koti 25-Point only)
  C0: { x: 400, y: 400 },
};

export const MorabarabaBoard: React.FC<MorabarabaBoardProps> = ({
  variant,
  board,
  turn,
  phase,
  shootPending,
  shootableCows,
  legalMoves,
  onPlace,
  onMove,
  onReposition,
  onShoot,
  lastMove,
  disabled = false,
  onAlert,
  hintAction,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Keep latest props in a ref to avoid stale closures in window listeners
  const stateRef = useRef({
    board,
    turn,
    phase,
    shootPending,
    shootableCows,
    legalMoves,
    onPlace,
    onMove,
    onReposition,
    onShoot,
    disabled,
    onAlert,
    variant,
  });

  useEffect(() => {
    stateRef.current = {
      board,
      turn,
      phase,
      shootPending,
      shootableCows,
      legalMoves,
      onPlace,
      onMove,
      onReposition,
      onShoot,
      disabled,
      onAlert,
      variant,
    };
  });

  const [selectedCow, setSelectedCow] = useState<PointId | null>(null);

  // Active Drag Reference & Visual State
  const dragRef = useRef<{
    source: PointId | 'reserve';
    cowColor: CowColor;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    validTargets: PointId[];
    isDragging: boolean;
  } | null>(null);

  const [dragVisual, setDragVisual] = useState<{
    source: PointId | 'reserve';
    cowColor: CowColor;
    x: number;
    y: number;
    hoverTarget: PointId | null;
    validTargets: PointId[];
  } | null>(null);

  // Convert client pointer event coordinates to SVG 800x800 coordinate space
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Determine valid destinations for a cow
  const getValidTargetsForCow = (point: PointId, s = stateRef.current): PointId[] => {
    if (s.phase === 'placing') {
      // In placing phase, sliding adjacent or relocating
      const adjacent = s.variant === 'koti-25' ? ADJACENCY_25[point] : ADJACENCY_24[point];
      const emptyAdjacent = adjacent.filter((p) => s.board[p] === null);
      if (emptyAdjacent.length > 0) return emptyAdjacent;
      const allPoints = s.variant === 'koti-25' ? ALL_25_POINTS : ALL_24_POINTS;
      return allPoints.filter((p) => s.board[p] === null);
    }
    // Moving or flying phase
    return s.legalMoves.filter((m) => m.from === point).map((m) => m.to);
  };

  // Start drag on a cow on the board
  const handlePointerDownCow = (point: PointId, e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.disabled) return;

    // 1. Shoot Mode
    if (s.shootPending) {
      if (s.shootableCows.includes(point)) {
        s.onShoot(point);
      }
      return;
    }

    const cow = s.board[point];
    if (!cow) return;

    // Must be own cow on own turn
    if (cow !== s.turn) {
      if (s.onAlert) s.onAlert(`It's ${s.turn === 'w' ? 'White' : 'Black'}'s turn.`);
      return;
    }

    // Find valid destinations
    const targets = getValidTargetsForCow(point, s);
    if (targets.length === 0) {
      setSelectedCow(null);
      if (s.onAlert) {
        s.onAlert('This cow is blocked on all sides by other cows and cannot slide.');
      }
      return;
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    e.preventDefault();

    dragRef.current = {
      source: point,
      cowColor: cow,
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
      validTargets: targets,
      isDragging: false,
    };

    setSelectedCow(point);

    setDragVisual({
      source: point,
      cowColor: cow,
      x: coords.x,
      y: coords.y,
      hoverTarget: null,
      validTargets: targets,
    });

    // Window move listener
    const onWindowPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      ev.preventDefault();

      const c = getSvgCoordinates(ev.clientX, ev.clientY);
      if (!c) return;

      const dRef = dragRef.current;
      dRef.currentX = c.x;
      dRef.currentY = c.y;

      const dist = Math.hypot(c.x - dRef.startX, c.y - dRef.startY);
      if (dist > 8) {
        dRef.isDragging = true;
      }

      // Generous snap radius of 140 SVG units
      let nearest: PointId | null = null;
      let minD = 140;
      for (const tgt of dRef.validTargets) {
        const tCoord = POINT_COORDINATES[tgt];
        const d = Math.hypot(tCoord.x - c.x, tCoord.y - c.y);
        if (d < minD) {
          minD = d;
          nearest = tgt;
        }
      }

      setDragVisual({
        source: dRef.source,
        cowColor: dRef.cowColor,
        x: c.x,
        y: c.y,
        hoverTarget: nearest,
        validTargets: dRef.validTargets,
      });
    };

    // Window up listener
    const onWindowPointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);

      if (!dragRef.current) return;
      const dRef = dragRef.current;
      dragRef.current = null;

      const c = getSvgCoordinates(ev.clientX, ev.clientY);
      const finalX = c ? c.x : dRef.currentX;
      const finalY = c ? c.y : dRef.currentY;

      if (dRef.isDragging) {
        let nearest: PointId | null = null;
        let minD = 140;
        for (const tgt of dRef.validTargets) {
          const tCoord = POINT_COORDINATES[tgt];
          const d = Math.hypot(tCoord.x - finalX, tCoord.y - finalY);
          if (d < minD) {
            minD = d;
            nearest = tgt;
          }
        }

        if (nearest) {
          const curr = stateRef.current;
          if (dRef.source === 'reserve') {
            curr.onPlace(nearest);
          } else if (curr.phase === 'placing') {
            if (curr.onReposition) {
              curr.onReposition(dRef.source, nearest);
            } else {
              curr.onMove(dRef.source, nearest);
            }
          } else {
            curr.onMove(dRef.source, nearest);
          }
          setSelectedCow(null);
        }
      } else {
        // Simple tap: keep cow selected
        setSelectedCow(dRef.source as PointId);
      }

      setDragVisual(null);
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
  };

  // Handle click on empty intersection or legal target
  const handlePointClick = (point: PointId) => {
    const s = stateRef.current;
    if (s.disabled) return;

    if (s.shootPending) {
      if (s.shootableCows.includes(point)) {
        s.onShoot(point);
      }
      return;
    }

    // Placing phase empty spot click
    if (s.phase === 'placing' && s.board[point] === null) {
      s.onPlace(point);
      setSelectedCow(null);
      return;
    }

    // If cow is selected and point is a valid move -> execute move
    if (selectedCow && s.board[point] === null) {
      const targets = getValidTargetsForCow(selectedCow, s);
      if (targets.includes(point)) {
        if (s.phase === 'placing' && s.onReposition) {
          s.onReposition(selectedCow, point);
        } else {
          s.onMove(selectedCow, point);
        }
        setSelectedCow(null);
        return;
      }
    }

    // Deselect if clicked elsewhere
    if (s.board[point] === null) {
      setSelectedCow(null);
    }
  };

  // Legal destinations to highlight for currently selected cow
  const highlightedDestinations = selectedCow
    ? getValidTargetsForCow(selectedCow)
    : [];

  // Active completed 3-in-a-row mills on the board (Flike)
  const mills = variant === 'koti-25' ? MILLS_25 : MILLS_24;
  const activeMills = React.useMemo(() => {
    const list: { p1: PointId; p2: PointId; p3: PointId; color: CowColor }[] = [];
    for (const [p1, p2, p3] of mills) {
      if (board[p1] && board[p1] === board[p2] && board[p2] === board[p3]) {
        list.push({ p1, p2, p3, color: board[p1]! });
      }
    }
    return list;
  }, [board, mills]);

  const pointsToRender: PointId[] =
    variant === 'koti-25'
      ? (Object.keys(POINT_COORDINATES) as PointId[])
      : (Object.keys(POINT_COORDINATES).filter((p) => p !== 'C0') as PointId[]);

  return (
    <div
      style={{ touchAction: 'none' }}
      className="w-full h-full relative select-none rounded-2xl overflow-hidden shadow-2xl border-4 border-[#22242b] bg-[#141519] flex items-center justify-center p-1.5"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 800 800"
        style={{ touchAction: 'none' }}
        className="w-full h-full max-w-full max-h-full drop-shadow-2xl select-none"
      >
        <defs>
          {/* Subtle gradient for gameboard felt */}
          <radialGradient id="boardGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#20222a" />
            <stop offset="100%" stopColor="#141519" />
          </radialGradient>

          {/* White Cow Gradient (Polished Ivory & Gold Trim) */}
          <radialGradient id="whiteCowGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>

          {/* Black Cow Gradient (Obsidian & Crimson Edge) */}
          <radialGradient id="blackCowGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="65%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </radialGradient>

          {/* Glow filter for active mills & landing zones */}
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="greenGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Board Background */}
        <rect x="10" y="10" width="780" height="780" rx="28" fill="url(#boardGlow)" />

        {/* Outer Inscription Line */}
        <rect
          x="30"
          y="30"
          width="740"
          height="740"
          rx="20"
          fill="none"
          stroke="rgba(212, 175, 55, 0.15)"
          strokeWidth="2"
        />

        {/* --- 1. Concentric Squares (Grid Lines) --- */}
        {/* Outer Square */}
        <rect
          x="90"
          y="90"
          width="620"
          height="620"
          fill="none"
          stroke="rgba(212, 175, 55, 0.55)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Middle Square */}
        <rect
          x="190"
          y="190"
          width="420"
          height="420"
          fill="none"
          stroke="rgba(212, 175, 55, 0.55)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Inner Square */}
        <rect
          x="290"
          y="290"
          width="220"
          height="220"
          fill="none"
          stroke="rgba(212, 175, 55, 0.55)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* --- 2. Orthogonal Cross-Ring Spokes --- */}
        {/* North Spoke: O1 -> I1 */}
        <line x1="400" y1="90" x2="400" y2="290" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* East Spoke: O3 -> I3 */}
        <line x1="710" y1="400" x2="510" y2="400" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* South Spoke: O5 -> I5 */}
        <line x1="400" y1="710" x2="400" y2="510" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* West Spoke: O7 -> I7 */}
        <line x1="90" y1="400" x2="290" y2="400" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />

        {/* --- 3. Diagonal Corner Lines --- */}
        {/* Top-Left: O0 -> I0 */}
        <line x1="90" y1="90" x2="290" y2="290" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* Top-Right: O2 -> I2 */}
        <line x1="710" y1="90" x2="510" y2="290" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* Bottom-Right: O4 -> I4 */}
        <line x1="710" y1="710" x2="510" y2="510" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />
        {/* Bottom-Left: O6 -> I6 */}
        <line x1="90" y1="710" x2="290" y2="510" stroke="rgba(212, 175, 55, 0.55)" strokeWidth="4" />

        {/* --- 4. Extra Center Hub Spokes (25-Point Koti Variant Only) --- */}
        {variant === 'koti-25' && (
          <g className="animate-in fade-in duration-300">
            {/* Center Vertical */}
            <line x1="400" y1="290" x2="400" y2="510" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 3" />
            {/* Center Horizontal */}
            <line x1="290" y1="400" x2="510" y2="400" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 3" />
            {/* Center Diagonals */}
            <line x1="290" y1="290" x2="510" y2="510" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 3" />
            <line x1="510" y1="290" x2="290" y2="510" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 3" />
          </g>
        )}

        {/* --- 4.5. Active Flike / Mill Laser Beam Highlighting --- */}
        {activeMills.map((m, idx) => {
          const c1 = POINT_COORDINATES[m.p1];
          const c3 = POINT_COORDINATES[m.p3];
          const isWhiteMill = m.color === 'w';
          return (
            <g key={`active-mill-${idx}`} className="animate-pulse pointer-events-none">
              {/* Diffuse Outer Glow */}
              <line
                x1={c1.x}
                y1={c1.y}
                x2={c3.x}
                y2={c3.y}
                stroke={isWhiteMill ? '#facc15' : '#ef4444'}
                strokeWidth={9}
                strokeLinecap="round"
                opacity={0.4}
                filter="url(#goldGlow)"
              />
              {/* Sharp Laser Core */}
              <line
                x1={c1.x}
                y1={c1.y}
                x2={c3.x}
                y2={c3.y}
                stroke={isWhiteMill ? '#fef08a' : '#fca5a5'}
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={0.95}
              />
            </g>
          );
        })}

        {/* --- 5. Intersections / Points & Cattle Rendering --- */}
        {pointsToRender.map((pt) => {
          const coord = POINT_COORDINATES[pt];
          const cow = board[pt];

          const isSelected = selectedCow === pt;
          const isLegalTarget = highlightedDestinations.includes(pt);
          const isHoveredLanding = dragVisual?.hoverTarget === pt;
          const isShootable = shootPending && shootableCows.includes(pt);
          const isLastMoveSquare = lastMove?.to === pt || lastMove?.from === pt;
          const isBeingDragged = dragVisual?.source === pt;
          const isHintTarget = hintAction?.to === pt || hintAction?.shot === pt;
          const isHintSource = hintAction?.from === pt;
          const isInActiveMill = activeMills.some((m) => m.p1 === pt || m.p2 === pt || m.p3 === pt);

          const isCenter = pt === 'C0';

          return (
            <g
              key={pt}
              onClick={() => handlePointClick(pt)}
              onPointerDown={(e) => {
                if (cow) {
                  handlePointerDownCow(pt, e);
                }
              }}
              className="cursor-pointer group select-none"
              style={{ touchAction: 'none' }}
            >
              {/* Massive Touch Area (r=42) to guarantee 100% reliable clicks and drops */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={42}
                fill="transparent"
                className="cursor-pointer select-none"
              />

              {/* Intersection Base Rivet */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isCenter ? 12 : 8}
                fill={isCenter ? '#f59e0b' : '#2a2d36'}
                stroke="rgba(212, 175, 55, 0.7)"
                strokeWidth={isCenter ? 3 : 2}
                className="transition-colors group-hover:fill-amber-400/80"
              />

              {/* Hovered Drag Landing Zone Beacon (Pulsing Green Halo) */}
              {isHoveredLanding && (
                <g filter="url(#greenGlow)">
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={32}
                    fill="rgba(34, 197, 94, 0.55)"
                    stroke="#22c55e"
                    strokeWidth="4"
                    className="animate-pulse"
                  />
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={18}
                    fill="#4ade80"
                  />
                </g>
              )}

              {/* Legal Move Target Ring (Clear Landing Drop Zone) */}
              {!isHoveredLanding && isLegalTarget && (
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={22}
                  fill="rgba(34, 197, 94, 0.4)"
                  stroke="#22c55e"
                  strokeWidth="3.5"
                  className="animate-pulse"
                />
              )}

              {/* Coach Hint Target Landing Beacon */}
              {isHintTarget && (
                <g filter="url(#goldGlow)">
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={28}
                    fill="rgba(255, 204, 0, 0.35)"
                    stroke="#ffcc00"
                    strokeWidth="3.5"
                    className="animate-pulse"
                  />
                  <circle cx={coord.x} cy={coord.y} r={10} fill="#ffcc00" />
                </g>
              )}

              {/* Placing Phase Open Spot Target Ring */}
              {phase === 'placing' && !shootPending && cow === null && !isHoveredLanding && (
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={16}
                  fill="rgba(212, 175, 55, 0.2)"
                  stroke="rgba(212, 175, 55, 0.6)"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              )}

              {/* Cow Piece Rendering */}
              {cow && (
                <g
                  className={`transition-opacity ${isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'}`}
                >
                  {/* Selected Cow Pulsing Aura */}
                  {isSelected && !isBeingDragged && (
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={30}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="4"
                      filter="url(#goldGlow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Coach Hint Source Cow Aura */}
                  {isHintSource && !isBeingDragged && !isSelected && (
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={32}
                      fill="none"
                      stroke="#ffcc00"
                      strokeWidth="4"
                      filter="url(#goldGlow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Active Mill Cow Flike Halo */}
                  {isInActiveMill && !isSelected && !isBeingDragged && (
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={30}
                      fill="none"
                      stroke={cow === 'w' ? '#facc15' : '#ef4444'}
                      strokeWidth={3}
                      strokeDasharray="6 3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Shootable Cow Target Reticle */}
                  {isShootable && (
                    <g className="animate-pulse">
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={32}
                        fill="rgba(239, 68, 68, 0.25)"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                      />
                      <line x1={coord.x - 36} y1={coord.y} x2={coord.x + 36} y2={coord.y} stroke="#ef4444" strokeWidth="2" />
                      <line x1={coord.x} y1={coord.y - 36} x2={coord.x} y2={coord.y + 36} stroke="#ef4444" strokeWidth="2" />
                    </g>
                  )}

                  {/* Last Move Indicator Highlight */}
                  {isLastMoveSquare && (
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={28}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.5)"
                      strokeWidth="3"
                    />
                  )}

                  {/* Outer Cow Token */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={24}
                    fill={cow === 'w' ? 'url(#whiteCowGrad)' : 'url(#blackCowGrad)'}
                    stroke={cow === 'w' ? '#94a3b8' : '#ef4444'}
                    strokeWidth={cow === 'w' ? 2 : 2.5}
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
                    className={cow === turn ? 'cursor-grab active:cursor-grabbing' : ''}
                  />

                  {/* Inner Concentric Cattle Ring for Tactile Feel */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={15}
                    fill="none"
                    stroke={cow === 'w' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}
                    strokeWidth="1.5"
                  />

                  {/* Cattle Horn / Center Mark */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={4}
                    fill={cow === 'w' ? '#0f172a' : '#f59e0b'}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* --- 6. Floating Dragged Cow Token (Follows Cursor/Finger with 0 Latency) --- */}
        {dragVisual && (
          <g
            transform={`translate(${dragVisual.x}, ${dragVisual.y})`}
            className="pointer-events-none drop-shadow-2xl select-none"
          >
            {/* Glowing Golden Drag Aura */}
            <circle
              cx={0}
              cy={0}
              r={34}
              fill="none"
              stroke="#facc15"
              strokeWidth="4"
              filter="url(#goldGlow)"
              className="animate-pulse"
            />
            {/* Elevated Floating Cow Token */}
            <circle
              cx={0}
              cy={0}
              r={27}
              fill={dragVisual.cowColor === 'w' ? 'url(#whiteCowGrad)' : 'url(#blackCowGrad)'}
              stroke={dragVisual.cowColor === 'w' ? '#facc15' : '#ef4444'}
              strokeWidth={3}
            />
            <circle
              cx={0}
              cy={0}
              r={16}
              fill="none"
              stroke={dragVisual.cowColor === 'w' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}
              strokeWidth="1.5"
            />
            <circle
              cx={0}
              cy={0}
              r={4.5}
              fill={dragVisual.cowColor === 'w' ? '#0f172a' : '#f59e0b'}
            />
          </g>
        )}
      </svg>
    </div>
  );
};
