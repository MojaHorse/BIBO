# BIBO Platform — Complete Pages & Features Architectural Audit

This document provides a comprehensive review of **every page**, **every feature**, **its purpose**, and **its file location** across the BIBO codebase.

---

## 1. Platform Overview & Tech Stack

**BIBO** is a real-time, tactile board game arena and competitive gaming platform unifying three classic strategy disciplines:
1. **Chess** (Standard 8×8 FIDE rules with Stockfish 16 AI integration)
2. **Checkers / Draughts** (American 8×8 with mandatory captures, multi-jumps, and king crowning)
3. **Morabaraba / Umlabalaba** (Traditional African 24-point mill board game with Placing, Moving, and Flying phases)

### Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS v4 (Custom OLED dark aesthetic, `#FF6A00` to `#FF173D` gradient highlights)
- **Database & Auth**: PostgreSQL via Neon Serverless, Prisma ORM 6.4, bcryptjs, custom JWT/session handling
- **Real-Time Multiplayer**: Server-Sent Events (SSE) room architecture with in-memory state broadcasting
- **AI & Evaluation**: Stockfish 16 (Web Worker WASM) + rule-based heuristic engines for Checkers and Morabaraba
- **Audio & Haptics**: Web Audio API tone synthesis (no external MP3/WAV assets) + mobile Vibration API
- **PWA**: Service Worker (`public/sw.js`), Web App Manifest (`manifest.json`), home-screen install banners

---

## 2. Master Route & Page Directory

| Route URL | File Location | Primary Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | High-conversion marketing landing page & waitlist registration |
| `/home` | `src/app/home/page.tsx` | Main dashboard & player hub with recent matches & rankings |
| `/play` | `src/app/play/page.tsx` | Universal game lobby, quick matchmaking, and Chess game arena |
| `/play/chess` | `src/app/play/chess/page.tsx` | Semantic redirect to `/play` |
| `/checkers` | `src/app/checkers/page.tsx` | Dedicated Checkers (8×8 Draughts) game arena & AI coach |
| `/play/checkers` | `src/app/play/checkers/page.tsx` | Semantic redirect to `/checkers` |
| `/morabaraba` | `src/app/morabaraba/page.tsx` | Dedicated Morabaraba game arena, kraal board & AI coach |
| `/play/morabaraba` | `src/app/play/morabaraba/page.tsx` | Semantic redirect to `/morabaraba` |
| `/puzzles` | `src/app/puzzles/page.tsx` | Tactical puzzle training across Chess, Checkers & Morabaraba |
| `/archive` | `src/app/archive/page.tsx` | Match history vault, offline storage sync & PGN interactive replay |
| `/compete` | `src/app/compete/page.tsx` | Competitive hub with tournament brackets and game leaderboards |
| `/tournaments` | `src/app/tournaments/page.tsx` | Semantic redirect to `/compete` |
| `/rankings` | `src/app/rankings/page.tsx` | Global ranking leaderboards (Blitz, Rapid, Checkers, Morabaraba, XP) |
| `/friends` | `src/app/friends/page.tsx` | Social system: presence, direct duels, room sharing & spectating |
| `/profile` | `src/app/profile/page.tsx` | Player profile, multi-game ELO ratings, XP tier insignia, and career stats |
| `/settings` | `src/app/settings/page.tsx` | System preferences: board materials, audio themes, and engine ergonomics |
| `/login` | `src/app/login/page.tsx` | Player authentication: credentials sign-in & one-click guest play |
| `/signup` | `src/app/signup/page.tsx` | Player registration: account creation with handle, email & password |
| `/onboarding` | `src/app/onboarding/page.tsx` | Visual 3-step slide onboarding walkthrough for new users |
| `/splash` | `src/app/splash/page.tsx` | Mobile PWA launch screen with BIBO mascot and quick-enter |

---

## 3. Deep-Dive Page & Feature Breakdown

### 3.1. Landing Page (`/`)
- **File**: `src/app/page.tsx`
- **Purpose**: Welcomes new visitors, establishes the BIBO brand identity, showcases the three game disciplines, and converts visitors into active players or waitlist members.
- **Key Features**:
  1. **Sticky Glassmorphism Header**: Brand logo, smooth scroll links (`#home`, `#games`, `#how-it-works`, `#about`, `#news`), "Play Now" primary CTA, and responsive mobile sliding navigation drawer.
  2. **Cinematic Hero Section**: Full-bleed gameboard artwork featuring the 3D BIBO Cat mascot, tagline *"Three classic games. One place to play."*, and live stat pills (3 classic games, 100k+ moves, 0 downloads needed).
  3. **Interactive Modals**:
     - `WaitlistModal` (`src/components/landing/WaitlistModal.tsx`): Collects user email and preferred game discipline with instant confirmation.
     - `WatchHowItWorksModal` (`src/components/landing/WatchHowItWorksModal.tsx`): Feature overview and guided video tour.
  4. **The Three Classics Showcase**: Ivory-themed interactive cards for Chess (8×8), Checkers (8×8 American Draughts), and Morabaraba (24-point traditional mill) with piece counts, tactical complexity, and direct "Play" links.
  5. **Three-Step Workflow (`#how-it-works`)**: Visual guide covering:
     - Step 1: *Pick your discipline*
     - Step 2: *Match or invite* (quick pairing or private room code)
     - Step 3: *Analyze & climb* (tactical coach, PGN export, ELO progression)
  6. **Cultural & Community Section (`#about`)**: Highlighting the preservation of African board game heritage (Morabaraba) alongside global classics.
  7. **Footer (`#news`)**: Quick navigation, newsletter subscription input, social channels, and copyright notice.

---

### 3.2. Home Dashboard (`/home`)
- **File**: `src/app/home/page.tsx`
- **Purpose**: Central command center for authenticated users and guests, offering instant match entry, game discipline selection, match history preview, and leaderboard standing.
- **Key Features**:
  1. **Dynamic Welcome Banner**: Displays current player handle, active ELO, and quick action buttons ("Find a Game" and "Friends").
  2. **Discipline Cards**:
     - *Chess*: Link to `/play` with indicators for FIDE legality, Stockfish coach, and standard 8×8 mode.
     - *Checkers*: Link to `/checkers` highlighting forced jumps, multi-captures, and king crowning.
     - *Morabaraba*: Link to `/morabaraba` highlighting the traditional 24-point board, drop/slide/fly phases.
  3. **Recent Matches Vault Preview**: Real-time list of the player's last 5 completed games loaded from `/api/matches` with win/loss badges, time control, date, and link to full `/archive`.
  4. **Leaderboard Snapshot**: Top 5 players with rank badges, titles (Grandmaster, Master, Expert, Tactician), avatars, and live ELO ratings.
  5. **Live ELO Badge**: Quick widget displaying current player's rating and rank standing.

---

### 3.3. Play Arena & Chess Hub (`/play`)
- **File**: `src/app/play/page.tsx`
- **Purpose**: Serves as both the central game lobby (multi-discipline matchmaking & room creation) and the active real-time Chess game arena.
- **Key Features**:
  1. **Unified Lobby Mode**:
     - Discipline selector (Chess, Checkers, Morabaraba).
     - Game mode switch: Online Ranked Match vs Local AI Bot duel.
     - Time control presets: 1m (Bullet), 3m (Blitz), 5m (Rapid), 10m (Classical).
     - Action mode: Quick Auto-Matchmaking vs Custom Room Code.
  2. **In-Place Inline Matchmaking**:
     - Real-time queue polling via `/api/matchmaking` with live second counter.
     - Auto-cancellation and match-found transition with instant redirect to assigned room and role (`w` or `b`).
  3. **Active Chess Match Arena**:
     - Board rendering via `ChessBoard` (`src/components/ChessBoard.tsx`) with drag-and-drop and tap-to-move.
     - Move legality enforcement via `chess.js` and `ChessAdapter` (`src/lib/games/chess-adapter.ts`).
     - Real-time Stockfish 16 engine evaluation bar (`EvalBar.tsx`) showing advantage in centipawns or mate count.
     - Live AI Coach commentary card (`CoachCard.tsx`) offering textual advice and blunder warnings.
     - Captured pieces material difference indicator (`PlayerCard.tsx`).
     - Dual countdown clocks with increment handling.
  4. **Multiplayer Room Sync**:
     - Hook `useMultiplayerRoom` connects via SSE (`/api/rooms/[roomId]/stream`).
     - Synchronizes moves, game state FEN, clocks, draw offers, resignations, and in-game chat messages.
  5. **Post-Game Analysis & Review**:
     - `GameReviewModal` (`src/components/GameReviewModal.tsx`): Evaluates full game moves, classifies moves into Brilliant, Great, Best, Good, Inaccuracy, Mistake, Blunder, calculates player accuracy percentages and ACPL.
     - Save match to vault (`saveMatchToVault`) and PostgreSQL database.

---

### 3.4. Checkers Arena (`/checkers`)
- **File**: `src/app/checkers/page.tsx`
- **Purpose**: Full-featured game arena for American 8×8 Checkers (Draughts) supporting bot play, online multiplayer, and specialized checkers coaching.
- **Key Features**:
  1. **Dedicated Checkers Board**: `CheckersBoard` (`src/components/checkers/CheckersBoard.tsx`) with custom dark/light tiles, piece crown graphics, and jump target indicators.
  2. **Rule Enforcement (`src/lib/checkers-engine.ts`)**:
     - Mandatory jump detection (players must capture if a jump is available).
     - Multi-jump continuation logic (locks active piece until all chain captures are completed).
     - King crowning upon reaching the opposing back rank, enabling backward diagonal movement.
  3. **Checkers AI Coach (`src/lib/checkers-coach.ts`)**:
     - Analyzes piece vulnerability, center control, king safety, and multi-jump tactics.
     - Provides dynamic tactical hints with visual board arrows/highlights.
  4. **Time Controls & Clocks**: Bullet, Blitz, and Rapid clocks synchronized with the server or local timer.
  5. **Online Room & SSE Integration**: Real-time P2P/online play via `/api/rooms` and `useMultiplayerRoom`.
  6. **Resign, Draw & In-Game Chat**: Integrated `DrawOfferModal`, `ResignConfirmModal`, and `InGameChatDrawer`.

---

### 3.5. Morabaraba Arena (`/morabaraba`)
- **File**: `src/app/morabaraba/page.tsx`
- **Purpose**: Authentic digital implementation of Morabaraba (Umlabalaba), the traditional southern African two-player strategy game.
- **Key Features**:
  1. **24-Point Kraal Board**: `MorabarabaBoard` (`src/components/morabaraba/MorabarabaBoard.tsx`) rendered with SVG geometry (three concentric squares, 8 spokes, 24 intersection points).
  2. **Three Game Phases (`src/lib/morabaraba-engine.ts`)**:
     - **Placing Phase**: Each player places 12 cows onto vacant intersection points.
     - **Moving Phase**: Players slide cows to adjacent connected points.
     - **Flying Phase**: When reduced to 3 cows, the player can fly to any vacant point on the board.
  3. **Mill Formation & Shooting Mechanics**:
     - Forming 3 cows in a line creates a "Mill" and unlocks a shooting action.
     - Enforces "cows in mills are protected" unless no free cows remain.
  4. **Morabaraba AI Coach (`src/lib/morabaraba-coach.ts`)**:
     - Heuristic evaluation for mill detection, spoke control, and target prioritization.
     - Generates tactical hints and recommended actions.
  5. **Bot AI & Real-time Multiplayer**: Supports offline bot duels (`MorabarabaAdapter.getAIMove`) and online multiplayer rooms with clock synchronization and state broadcasting.

---

### 3.6. Tactical Puzzles (`/puzzles`)
- **File**: `src/app/puzzles/page.tsx`
- **Purpose**: Daily training and tactical puzzle drills across Chess, Checkers, and Morabaraba.
- **Key Features**:
  1. **Discipline Switcher**: Seamlessly switch between Chess, Checkers, and Morabaraba puzzles.
  2. **Three Puzzle Modes**:
     - **Daily Puzzle**: One featured challenge per day with persistent streak tracking.
     - **Puzzle Rush (3 Strikes)**: Solve puzzles consecutively; 3 blunders end the run.
     - **Puzzle Rush (Timed)**: 3-minute survival mode solving as many puzzles as possible.
  3. **Interactive Validation**:
     - Automatically verifies player moves against solution tree (`validatePuzzleMove`).
     - Plays automated opponent counter-moves.
     - Provides instant visual feedback (correct green pulse / blunder red shake) and acoustic audio cues.
  4. **Tactical Hint System**: Highlights origin and destination squares on demand.
  5. **XP Rewards & Progression**: Grants Tactical XP calculated via `calculatePuzzleXp`, contributing to insignia tier leveling.

---

### 3.7. Match Archive & Vault (`/archive`)
- **File**: `src/app/archive/page.tsx`
- **Purpose**: Comprehensive game log and analysis library allowing players to inspect previous matches, review notations, and step through replays.
- **Key Features**:
  1. **Offline-First Vault (`src/lib/match-vault.ts`)**: Loads immediately from local storage cache; syncs unsynced matches in the background to PostgreSQL (`/api/matches`).
  2. **Discipline Filters**: Filter match history by All, Chess, Checkers, or Morabaraba.
  3. **Performance Metrics**: Calculates overall games played, win rate percentage, wins, losses, and draws.
  4. **Interactive Game Replay (`src/components/ReplayModal.tsx`)**:
     - Step forward, backward, to start, or to end of any past game.
     - Auto-play playback with adjustable speed.
     - Interactive board reflecting move progression.
  5. **Notation & FEN Export**: View and copy full PGN/notation text and final FEN positions to clipboard.

---

### 3.8. Competition Hub (`/compete`) & Tournaments (`/tournaments`)
- **Files**: `src/app/compete/page.tsx` (and `src/app/tournaments/page.tsx` redirect)
- **Purpose**: Central arena for tournaments, scheduled events, and competitive brackets.
- **Key Features**:
  1. **Tab Navigation**: Upcoming Tournaments, Live Ongoing Tournaments, and Global Leaderboards.
  2. **Multi-Discipline Brackets**: Tournaments for Chess 8×8 (Swiss 5 Rounds), Checkers (Single Elimination), and Morabaraba Kraal Masters (Traditional 3-Phase).
  3. **Tournament Registration**: One-click join/leave action with player capacity trackers, prize XP pools, and time-until-start countdowns.
  4. **Integrated Game Leaderboards**: Filter rankings by discipline to review top performers, win rates, and win streaks.

---

### 3.9. Global Rankings (`/rankings`)
- **File**: `src/app/rankings/page.tsx`
- **Purpose**: Dedicated esports-style leaderboards tracking top players globally across multiple rating ladders.
- **Key Features**:
  1. **Category Tabs**: Blitz Chess, Checkers, Morabaraba, Tactical XP, and Rapid Chess.
  2. **Podium Display**: Highlighted top 3 cards with Gold, Silver, and Bronze badges, player avatars, ratings, and win rates.
  3. **Search & Filter**: Search players by handle in real time.
  4. **Detailed Ranks Table**: Displays rank number, player handle, verified human badge, insignia tier badge, rating, XP, win rate, and win streak.
  5. **Personal Standing Banner**: Persistent bottom widget highlighting the current user's personal rank and rating.

---

### 3.10. Friends & Social Hub (`/friends`)
- **File**: `src/app/friends/page.tsx`
- **Purpose**: Manage friends list, track online availability, challenge friends to duels, and spectate live games.
- **Key Features**:
  1. **Friend Filters**: Online Friends, All Friends, and Pending Requests.
  2. **Live Presence Indicators**: Green dot for online, purple badge for in-game (showing active game name), yellow for away, and gray for offline (with last-seen timestamp).
  3. **Direct Challenge Action**: One-click "Challenge" button creating an instant private room code and invitation link.
  4. **Spectate Mode**: Watch friends' matches in real time.
  5. **Add Friend & Invite Links**: Modal generating shareable room links and handles for quick invites via messaging apps (WhatsApp, Discord).

---

### 3.11. User Profile (`/profile`)
- **File**: `src/app/profile/page.tsx`
- **Purpose**: Player identity management, career progression, multi-discipline ratings, and insignia showcase.
- **Key Features**:
  1. **Player Card**: Displays player handle, display name, avatar, play style (Tactical, Aggressive, Positional), join date, and Verified Human badge.
  2. **Multi-Discipline ELO Matrix**: Displays Blitz, Rapid, Bullet, Checkers, and Morabaraba ratings in a unified grid.
  3. **Tactical XP & Insignia System (`src/lib/insignias.ts`)**:
     - Visual badge icon for current tier (Novice, Apprentice, Strategist, Tactician, Master, Grandmaster, Legend).
     - Progress bar indicating XP needed to reach the next tier.
  4. **Career Statistics**: Win/Loss/Draw counter, win rate percentage, matches played, and puzzle rush high score.
  5. **Profile Editing & Onboarding**: Re-trigger `OnboardingModal` to update handle, avatar, or play style.
  6. **Authentication Controls**: Sign-in / registration triggers for guest accounts and logout button.

---

### 3.12. Settings & System Preferences (`/settings`)
- **File**: `src/app/settings/page.tsx`
- **Purpose**: Customize board visual themes, audio feedback, and gameplay ergonomics.
- **Key Features**:
  1. **Board Material Themes (`BoardTheme`)**:
     - *Noir Obsidian*: High-contrast dark OLED aesthetic (jet black & cream).
     - *Boxwood Timber*: Warm walnut and birch tournament timber.
     - *Slate Console*: Architectural slate gray with limestone accents.
  2. **Live Board Preview**: Interactive board preview showing chosen materials in real time.
  3. **Acoustic FX & Sound Themes (`SoundTheme`)**:
     - Sound presets: Mechanical Click, Crisp Wood, Synth Tone, Muted.
     - Audio enable/disable toggle.
     - Audio preview buttons: Move, Capture, Check, Victory.
  4. **Engine & Ergonomics Toggles**:
     - Auto-Queen promotion.
     - Board coordinate notations display.
     - Legal move destination dot highlights.
  5. **Persistence**: Saves state across the application via `SettingsContext` and `localStorage`.

---

### 3.13. Authentication & Onboarding
1. **Login Page (`src/app/login/page.tsx`)**:
   - Handle/email and password credential login.
   - Fallback guest play button (`Tactician_XXX`) for instant barrier-free access.
   - Connected to `/api/auth/login`.
2. **Sign Up Page (`src/app/signup/page.tsx`)**:
   - New account registration with handle validation, email check, and password hashing.
   - Connected to `/api/auth/register`.
3. **Onboarding Walkthrough (`src/app/onboarding/page.tsx`)**:
   - 3-step slide onboarding introducing multi-discipline gameplay, multiplayer challenges, and XP progression.
   - Step pagination dots, Skip button, and "Get Started" redirect.
4. **Splash Screen (`src/app/splash/page.tsx`)**:
   - Lightweight, mobile-optimized start page with pulsing mascot, branding, and tap-to-enter trigger.

---

## 4. API Endpoints & Backend Architecture

All API routes reside under `src/app/api/`:

| Endpoint | Method | File Location | Purpose & Implementation |
|---|---|---|---|
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` | Authenticates player handle/password via bcrypt; issues JWT auth cookie and returns user profile. |
| `/api/auth/register` | POST | `src/app/api/auth/register/route.ts` | Validates handle uniqueness, creates user record in Prisma/Neon PostgreSQL, and logs in. |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | Clears authentication session cookies. |
| `/api/auth/me` | GET | `src/app/api/auth/me/route.ts` | Returns currently authenticated user session or guest status. |
| `/api/auth/check-handle` | GET | `src/app/api/auth/check-handle/route.ts` | Real-time handle availability check during registration. |
| `/api/auth/google` | GET | `src/app/api/auth/google/route.ts` | Initiates Google OAuth 2.0 authentication flow. |
| `/api/auth/google/callback` | GET | `src/app/api/auth/google/callback/route.ts` | Exchanges OAuth code for Google user profile and establishes session. |
| `/api/auth/onboarding` | POST | `src/app/api/auth/onboarding/route.ts` | Updates initial user preferences (avatar, handle, play style). |
| `/api/auth/[...path]` | ALL | `src/app/api/auth/[...path]/route.ts` | Catch-all handler for auth sub-routes. |
| `/api/matches` | GET, POST | `src/app/api/matches/route.ts` | **GET**: Fetches player's completed matches. **POST**: Saves match record (PGN, FEN, ELO delta, winner) to DB. |
| `/api/matchmaking` | POST | `src/app/api/matchmaking/route.ts` | Handles queue `join`, `poll`, and `cancel` requests via `matchmaking-manager.ts`. |
| `/api/rankings` | GET | `src/app/api/rankings/route.ts` | Returns global leaderboard rankings sorted by rating or XP. |
| `/api/neon/health` | GET | `src/app/api/neon/health/route.ts` | Database connection health check verifying Neon PostgreSQL latency. |
| `/api/rooms` | POST | `src/app/api/rooms/route.ts` | Creates a new game room with time control and game discipline; returns room ID and invite URL. |
| `/api/rooms/[roomId]` | GET | `src/app/api/rooms/[roomId]/route.ts` | Retrieves sanitized state of a specific game room. |
| `/api/rooms/[roomId]/stream` | GET | `src/app/api/rooms/[roomId]/stream/route.ts` | **Server-Sent Events (SSE)** endpoint broadcasting real-time moves, clocks, chats, and game over events. |
| `/api/rooms/[roomId]/move` | POST | `src/app/api/rooms/[roomId]/move/route.ts` | Validates and applies a move to the active room state; broadcasts to opponent via SSE. |
| `/api/rooms/[roomId]/chat` | POST | `src/app/api/rooms/[roomId]/chat/route.ts` | Relays chat messages and emoji reactions between players in a room. |
| `/api/rooms/[roomId]/draw` | POST | `src/app/api/rooms/[roomId]/draw/route.ts` | Proposes, accepts, or declines draw offers. |
| `/api/rooms/[roomId]/resign` | POST | `src/app/api/rooms/[roomId]/resign/route.ts` | Handles player resignation and ends room match. |
| `/api/rooms/[roomId]/rematch` | POST | `src/app/api/rooms/[roomId]/rematch/route.ts` | Handles rematch requests and room state resets. |

---

## 5. Shared UI Components Catalog

All shared UI components reside in `src/components/`:

| Component | File Location | Purpose |
|---|---|---|
| `AppShell` | `src/components/AppShell.tsx` | Global layout wrapper providing the sidebar navigation, top header, active match banner, user status, and mobile thumb bar. |
| `ActiveMatchBanner` | `src/components/ActiveMatchBanner.tsx` | Top banner alerting players to an active ongoing match, allowing one-click reconnection from any page. |
| `ChessBoard` | `src/components/ChessBoard.tsx` | Interactive 8×8 Chessboard supporting drag-and-drop, tap-to-move, check indicators, move hints, and board flipping. |
| `CheckersBoard` | `src/components/checkers/CheckersBoard.tsx` | Interactive 8×8 Checkers board with crown pieces, legal jump dots, and multi-jump focus. |
| `MorabarabaBoard` | `src/components/morabaraba/MorabarabaBoard.tsx` | SVG-rendered traditional 24-point Morabaraba board with interactive points, lines, cow pieces, and mill highlights. |
| `CoachCard` | `src/components/CoachCard.tsx` | AI Coach widget delivering contextual evaluation, mistake warnings, and tactical suggestions. |
| `EvalBar` | `src/components/EvalBar.tsx` | Vertical engine evaluation bar showing white/black positional balance in real time. |
| `PlayerCard` | `src/components/PlayerCard.tsx` | Player header card displaying handle, avatar, ELO rating, clock timer, and captured pieces. |
| `MoveHistory` | `src/components/MoveHistory.tsx` | Scrollable table displaying algebraic move notations with click-to-view historical plies. |
| `MobileMoveTicker` | `src/components/MobileMoveTicker.tsx` | Space-efficient horizontal move ticker designed for mobile viewports. |
| `MobileThumbBar` | `src/components/MobileThumbBar.tsx` | Mobile-friendly bottom navigation bar for quick access to Home, Play, Puzzles, Compete, and Profile. |
| `MobileInstallPrompt` | `src/components/MobileInstallPrompt.tsx` | PWA home-screen install banner with tailored instructions for iOS and Android. |
| `GameControls` | `src/components/GameControls.tsx` | Action buttons for Flip Board, Resign, Offer Draw, New Game, and Audio toggle. |
| `GameReviewModal` | `src/components/GameReviewModal.tsx` | Post-game modal displaying Stockfish accuracy scores, move classifications, and key blunder breakdowns. |
| `ReplayModal` | `src/components/ReplayModal.tsx` | Interactive game replay viewer with step-by-step playback controls and notation display. |
| `MultiplayerModal` | `src/components/MultiplayerModal.tsx` | Modal for creating game rooms, selecting time controls, and copying invite links/codes. |
| `AuthModal` | `src/components/AuthModal.tsx` | Modal dialog for signing in, registering, or continuing as guest without leaving the current page. |
| `OnboardingModal` | `src/components/OnboardingModal.tsx` | Interactive modal allowing players to configure avatar, handle, and play style. |
| `InGameChatDrawer` | `src/components/arena/InGameChatDrawer.tsx` | Live in-game chat drawer supporting text messages and quick tactical emoji reactions. |
| `DrawOfferModal` | `src/components/arena/DrawOfferModal.tsx` | In-game dialog for offering or accepting draws. |
| `ResignConfirmModal` | `src/components/arena/ResignConfirmModal.tsx` | Confirmation dialog preventing accidental match resignation. |
| `UniversalArena` | `src/components/arena/UniversalArena.tsx` | Unified arena container wrapping desktop and mobile layouts for game play. |
| `PlayDesktopView` | `src/components/arena/PlayDesktopView.tsx` | Multi-column desktop layout featuring board, sidebar, clocks, coach, and move history. |
| `PlayMobileView` | `src/components/arena/PlayMobileView.tsx` | Ergonomic mobile layout with vertical board positioning, bottom sheets, and thumb controls. |
| `DisciplineIcon` | `src/components/icons/DisciplineIcon.tsx` | Dynamic icon component rendering Swords (Chess), Crown (Checkers), or Shield (Morabaraba). |
| `BiboLogo` | `src/components/brand/BiboLogo.tsx` | Brand vector logos and the 3D BIBO Cat mascot illustration. |
| `PWARegistration` | `src/components/PWARegistration.tsx` | Client component handling Service Worker registration and update notifications. |

---

## 6. Core Game Engines, AI & Utility Libraries

All core application logic resides in `src/lib/`:

| Module | File Location | Key Capabilities |
|---|---|---|
| `games/types.ts` | `src/lib/games/types.ts` | Defines the `IGameEngine` universal interface unifying Chess, Checkers, and Morabaraba under a common API contract. |
| `games/chess-adapter.ts` | `src/lib/games/chess-adapter.ts` | Adapter wrapping `chess.js` to implement `IGameEngine` for standard chess. |
| `games/checkers-adapter.ts` | `src/lib/games/checkers-adapter.ts` | Adapter wrapping `CheckersEngine` for checkers rule evaluation and AI bot moves. |
| `games/morabaraba-adapter.ts` | `src/lib/games/morabaraba-adapter.ts` | Adapter wrapping `MorabarabaEngine` for 3-phase morabaraba logic and bot decisions. |
| `games/useGameArena.ts` | `src/lib/games/useGameArena.ts` | Universal React hook handling clock timers, move execution, AI bot turns, alerts, and victory conditions. |
| `games/useMultiplayerRoom.ts` | `src/lib/games/useMultiplayerRoom.ts` | Universal SSE hook managing room connection, state synchronization, clock sync, and real-time chat. |
| `checkers-engine.ts` | `src/lib/checkers-engine.ts` | Standalone American 8×8 Checkers rules engine: board matrices, valid diagonal moves, forced jumps, multi-jump chains, and king promotion. |
| `morabaraba-engine.ts` | `src/lib/morabaraba-engine.ts` | Standalone Morabaraba rules engine: 24 board points, connectivity graph, mill detection lines, placing/moving/flying phases, and shoot validations. |
| `stockfish.ts` | `src/lib/stockfish.ts` | Web Worker client communicating with Stockfish 16 WASM for real-time evaluations and game reviews. |
| `chess-coach.ts` | `src/lib/chess-coach.ts` | Natural-language chess coaching engine translating centipawn changes into actionable advice and blunder alerts. |
| `checkers-coach.ts` | `src/lib/checkers-coach.ts` | Checkers coaching engine evaluating piece exposure, king safety, and multi-jump opportunities. |
| `morabaraba-coach.ts` | `src/lib/morabaraba-coach.ts` | Morabaraba coaching engine analyzing mill formation risks, spoke control, and cow defense. |
| `chess-sound.ts` | `src/lib/chess-sound.ts` | Web Audio API acoustic synthesizer generating smooth sine/triangle sound FX for moves, captures, checks, and victories. |
| `haptics.ts` | `src/lib/haptics.ts` | Vibration API integration providing tactile pulse patterns for moves, captures, checks, and errors on mobile devices. |
| `session.ts` | `src/lib/session.ts` | Manages player identity, handles, ratings, and XP across localStorage with window event synchronization. |
| `match-vault.ts` | `src/lib/match-vault.ts` | Offline-first match storage persisting games locally and syncing them to `/api/matches` when online. |
| `matchmaking-manager.ts` | `src/lib/matchmaking-manager.ts` | In-memory queue matching players by discipline, time control, and rating proximity. |
| `room-manager.ts` | `src/lib/room-manager.ts` | Server-side active room state store maintaining timers, player roles, and SSE message distribution. |
| `puzzles.ts` | `src/lib/puzzles.ts` | Curated puzzle dataset across Chess, Checkers, and Morabaraba with step-by-step move validation. |
| `puzzle-persistence.ts` | `src/lib/puzzle-persistence.ts` | Tracks solved puzzle IDs, daily completion streaks, and Puzzle Rush high scores. |
| `progression.ts` | `src/lib/progression.ts` | Tactical XP calculation rules for puzzle solves, match outcomes, and leveling formulas. |
| `insignias.ts` | `src/lib/insignias.ts` | Tier insignia mappings from Novice up to Legend based on cumulative player XP. |
| `elo.ts` | `src/lib/elo.ts` | Standard Elo rating calculation algorithm computing rating deltas based on match outcomes and player rating differentials. |
| `api-cache.ts` | `src/lib/api-cache.ts` | Stale-While-Revalidate (SWR) client-side caching layer for API requests. |
| `settings-context.tsx` | `src/lib/settings-context.tsx` | Global React context preserving user board themes, sound preferences, and UI options. |
| `active-match.ts` | `src/lib/active-match.ts` | Global active match session tracker powering the top reconnection banner. |

---

## 7. Data Storage & Schema (Prisma)

The persistence layer (`prisma/schema.prisma`) defines two core relational models:

1. **`User`**:
   - `id`: UUID primary key.
   - `handle` / `email`: Unique credentials.
   - `passwordHash`: bcrypt hashed string.
   - `displayName`, `avatar`, `playStyle`: Profile customizations.
   - `bulletRating`, `blitzRating`, `rapidRating`, `checkersRating`, `morabarabaRating`: Individual discipline ELO ratings (default 1200).
   - `xp`: Cumulative tactical experience points.
   - `onboarded`, `isPro`, `stripeCustId`: Account flags.

2. **`Match`**:
   - `id`: UUID primary key.
   - `gameId`: Discipline identifier (`chess`, `checkers`, `morabaraba`).
   - `variant`: Board variation (e.g. `standard`, `american-8x8`, `standard-24`).
   - `whiteId` / `blackId`: References to the `User` model.
   - `timeControl`: Time control string (e.g. `5+0`, `3+2`).
   - `winnerId`: Handle/ID of the victor or null on draw.
   - `resultType`: Win condition (e.g. `checkmate`, `resignation`, `timeout`, `draw`).
   - `pgn`: Complete algebraic move notation.
   - `finalFen`: Board state string at game conclusion.
   - `rated`: Boolean flag.
   - `ratingDelta`: Elo points awarded or deducted.
