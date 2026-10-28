# BIBO Multi-Discipline Game Engines Audit & Remediation Report

**Date**: 2026-10-28  
**Engines Audited**: Checkers (American 8x8), Morabaraba (Standard 24-Point & Koti 25-Point), Chess (chess.js + Minimax AI + Stockfish Worker)  
**Status**: All Critical Inconsistencies Remediated & Verified with 36 Automated Tests  

---

## 1. Executive Summary

During competitive gameplay on `bibogames.vercel.app`, abnormal and un-intuitive piece movements were reported—specifically in **Checkers**, where regular pieces (men) were moving and jumping backwards towards the player's own back rank.

An exhaustive line-by-line audit across all three game engines (`src/lib/checkers-engine.ts`, `src/lib/morabaraba-engine.ts`, `src/lib/chess-ai.ts`, and their board UI adapters) was conducted. The investigation pinpointed:
1. **The Checkers "Smoking Gun"**: Regular men had been coded with 4-directional jumps (`[[-1, -1], [-1, 1], [1, -1], [1, 1]]`) under an "International Draughts rule" comment. Combined with standard mandatory captures (`mandatoryJumps: true`), whenever an opponent piece was positioned diagonally behind a regular man with an empty square beyond it, the engine flagged this backward jump as mandatory, suppressing all forward moves and forcing the player to jump backwards into their own back rank.
2. **Crowning King Turn Continuation**: Newly crowned kings were immediately queried for jump continuation on the promotion turn, allowing pieces that just reached the back rank to immediately jump backwards off the king row.
3. **Flying Kings Mismatch**: Kings possessed long-distance bishop-like sliding moves across open diagonals, conflicting with standard 8x8 American Checkers (English Draughts) rules.
4. **Morabaraba Placement Phase Cow Relocation**: Placed cows could be dragged or repositioned during the Placement phase (`phase === 'placing'`), violating traditional Morabaraba and MSSA tournament rules where placed cows are fixed until all 24 cows are placed.
5. **Morabaraba Bot Evaluation Asymmetry**: Bot AI minimax evaluation assumed the bot was always Black (`b`), causing self-sabotaging play when the bot played White (`w`).
6. **Chess Engine Verification**: Chess minimax and Stockfish worker were audited; piece-square tables and Alpha-Beta minimax were confirmed aligned with rank/file coordinate systems.

---

## 2. Detailed Engine Audit Findings & Remediation

### 2.1 Checkers Engine (`src/lib/checkers-engine.ts`)

| Area | Prior Implementation (Defective) | Standard Rule / Fix Applied | Impact |
| :--- | :--- | :--- | :--- |
| **Regular Men Jumps** | `jumpDirs = [[-1,-1], [-1,1], [1,-1], [1,1]]` (All 4 diagonals) | `jumpDirs = this.getMoveDirections(p)` (Forward only: `dr = -1` for White, `dr = +1` for Black) | Eliminates forced backward jumps; men can never move or jump backwards. |
| **King Movement** | Raycasting sliding loops along diagonals (`while(true) { nr = r + dr*step... }`) | 1-step moves in 4 diagonal directions: `dr = ±1, dc = ±1` | Eliminates illegal flying kings; standard 8x8 American checkers rules enforced. |
| **King Jumps** | Raycast jumping opponent at arbitrary distance with arbitrary landing square | Jump adjacent opponent (`dr, dc`), landing immediately behind (`dr * 2, dc * 2`) | Standard 1-piece jump mechanics for Kings. |
| **Crowning King Rule** | `turnSwitched = false` if jump available from coronation square | `if (isCapture && !isPromotion)` halts multi-jump immediately upon crowning | Crowning on back rank immediately terminates turn. |
| **Mandatory Captures** | Suppressed forward moves when backward jump was available | Only evaluates legal forward jumps for men and 1-step jumps for kings | No spurious mandatory backward jump alerts. |

### 2.2 Morabaraba Engine (`src/lib/morabaraba-engine.ts`)

| Area | Prior Implementation (Defective) | Standard Rule / Fix Applied | Impact |
| :--- | :--- | :--- | :--- |
| **Placement Phase Relocation** | `repositionCow` and UI allowed dragging/moving cows already placed on board | Placed cows are fixed during placement phase; `repositionCow` disabled; UI alerts players that cows cannot move until all 24 are placed | Conforms to official MSSA tournament & traditional rules. |
| **Bot AI Polarity** | `bestScore = -Infinity` with `score > bestScore` assumed bot is always Black; White bot maximized Black score | Polarity dynamically checks `isBotBlack = this.turn === 'b'`; White minimizes, Black maximizes | Eliminates bot self-sabotage when bot plays White. |
| **Minimax Turn Sync** | Hardcoded `isMaximizing = false` after every branch | Driven by `clone.getTurn() === 'b'` | Accurate multi-ply search during shoot resolutions. |
| **Mill Protection** | Verified: Standard 24-point protects cows in mills unless all opponent cows are in mills; 25-point Koti variant has no mill immunity | Preserved variant integrity | Distinct authentic cultural gameplay preserved. |

### 2.3 Chess Engine (`src/lib/chess-ai.ts` & `src/lib/games/chess-adapter.ts`)

| Area | Audit Verification | Status |
| :--- | :--- | :--- |
| **Rank/File Indexing** | `squareIdx = r * 8 + c` (White), `flippedIdx = (7 - r) * 8 + c` (Black) verified against chess.js 0-indexed rank 8 -> rank 1 representation | Confirmed correct. Starting pawns on rank 2/7 receive appropriate development bonuses. |
| **Minimax Depth & Pruning** | Alpha-Beta pruning with move shuffling for variety | Depth 2 (Medium), Depth 3 (Hard) with tactical checkmate detection (`±99999`). Verified. |
| **Stockfish Worker** | UCI protocol bridge via `/public/engine/stockfish.js` for post-game accuracy and live eval | Cached evaluation with 3-second fallback to prevent UI thread lock. Verified. |

---

## 3. Test Suite Verification

All 36 unit tests passed without failure:
- `tests/checkers-flying-kings-multijump.test.ts`: 6 tests verifying forward-only regular men moves/jumps, 1-step King moves/jumps, crowning turn completion, and multi-jump execution.
- `tests/game-engine-robustness.test.ts`: 8 tests verifying Chess, Checkers, and Morabaraba engine adapters, placement phase immobility, and multiplayer echo defense.
- `tests/strict-auth-gate-and-real-data.test.ts` & `tests/auth-guest-removal.test.ts`: Session and auth security integrity.
- `tests/landing-preview-isolation.test.ts`: Zero-persistence in-memory game previews.
- `tests/security-rating-and-matches.test.ts` & `tests/devops-observability.test.ts`: Rating isolation and API observability.

---

## 4. Modified Files Summary

- [`src/lib/checkers-engine.ts`](file:///Users/david/Downloads/BIBO/src/lib/checkers-engine.ts): Fixed regular men jumps to forward-only; removed flying king sliding and long-distance jumps; enforced coronation turn termination.
- [`src/components/morabaraba/MorabarabaBoard.tsx`](file:///Users/david/Downloads/BIBO/src/components/morabaraba/MorabarabaBoard.tsx): Disabled dragging/moving placed cows during placement phase; added educational feedback.
- [`src/lib/morabaraba-engine.ts`](file:///Users/david/Downloads/BIBO/src/lib/morabaraba-engine.ts): Disabled `repositionCow`; fixed bot AI evaluation polarity for White vs Black.
- [`tests/checkers-flying-kings-multijump.test.ts`](file:///Users/david/Downloads/BIBO/tests/checkers-flying-kings-multijump.test.ts): Realigned unit tests to verify standard American 8x8 rules.
- [`tests/game-engine-robustness.test.ts`](file:///Users/david/Downloads/BIBO/tests/game-engine-robustness.test.ts): Added placement phase immobility and checkers rule assertions.
