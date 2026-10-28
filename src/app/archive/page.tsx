'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  Swords,
  Copy,
  Check,
  FileText,
  TrendingUp,
  Shield,
  User,
  Clock,
  Trophy,
  Crown,
  X,
  Database,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Play,
} from 'lucide-react';
import { getPlayerSession } from '@/lib/session';
import { getRankFromXp } from '@/lib/progression';
import { getLocalMatches, syncPendingMatches, VaultMatch } from '@/lib/match-vault';
import { fetchWithSWR } from '@/lib/api-cache';
import { AppShell } from '@/components/AppShell';
import { ReplayModal } from '@/components/ReplayModal';
import { DisciplineIcon } from '@/components/icons/DisciplineIcon';

interface MatchRecord {
  id: string;
  gameId?: 'chess' | 'checkers' | 'morabaraba';
  whiteId: string;
  blackId: string;
  white: { handle: string; blitzRating?: number; xp?: number };
  black: { handle: string; blitzRating?: number; xp?: number };
  timeControl: string;
  winnerId: string | null;
  resultType: string;
  pgn: string;
  finalFen: string;
  rated: boolean;
  ratingDelta: number;
  createdAt: string;
}

function ArchivePageContent() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [gameFilter, setGameFilter] = useState<'all' | 'chess' | 'checkers' | 'morabaraba'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPgn, setSelectedPgn] = useState<{ id: string; pgn: string } | null>(null);
  const [replayMatch, setReplayMatch] = useState<MatchRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; handle: string; xp: number } | null>(null);
  const [userXp, setUserXp] = useState<number>(0);
  const [isOfflineVault, setIsOfflineVault] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    const session = getPlayerSession();
    setCurrentUser({ id: session.id, handle: session.handle, xp: session.xp });
    setUserXp(session.xp);

    // 1. Instant local vault load
    const local = getLocalMatches();
    const unsynced = local.filter((m) => !m.synced);
    setPendingSyncCount(unsynced.length);

    const localMapped: MatchRecord[] = local.map((m) => ({
      id: m.id,
      gameId: m.gameId || 'chess',
      whiteId: m.whiteId,
      blackId: m.blackId,
      white: { handle: m.whiteHandle || m.whiteId },
      black: { handle: m.blackHandle || m.blackId },
      timeControl: m.timeControl,
      winnerId: m.winnerId,
      resultType: m.resultType,
      pgn: m.pgn,
      finalFen: m.finalFen,
      rated: m.rated,
      ratingDelta: m.ratingDelta,
      createdAt: m.createdAt,
    }));

    if (localMapped.length > 0) {
      setMatches(localMapped);
      setLoading(false);
    }

    // 2. SWR Cached Fetch for server database & background merge
    fetchWithSWR<{ matches: MatchRecord[] }>(
      '/api/matches',
      (data) => {
        setIsOfflineVault(false);
        if (data?.matches) {
          const remoteMatches: MatchRecord[] = data.matches;
          const remoteIds = new Set(remoteMatches.map((r) => r.id));
          const onlyInLocal = localMapped.filter((l) => !remoteIds.has(l.id));
          setMatches([...onlyInLocal, ...remoteMatches]);
        }
        setLoading(false);
      },
      { ttlMs: 30_000 }
    )
      .then(() => {
        syncPendingMatches().then(() => {
          const remaining = getLocalMatches().filter((m) => !m.synced);
          setPendingSyncCount(remaining.length);
        });
      })
      .catch((err) => {
        console.warn('Network or DB unreachable, active on local offline vault:', err);
        setIsOfflineVault(true);
        setLoading(false);
      });
  }, []);

  const handleCopyPgn = (id: string, pgn: string) => {
    navigator.clipboard.writeText(pgn);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return 'RECENT';
    }
  };

  const totalMatches = matches.length;
  const userMatches = currentUser
    ? matches.filter((m) => m.whiteId === currentUser.id || m.blackId === currentUser.id)
    : matches;
  const userWins = currentUser
    ? userMatches.filter((m) => m.winnerId === currentUser.id).length
    : 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 select-none">
      {/* Console Archive Header */}
      <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#22c55e]/15 text-[#22c55e] flex items-center justify-center font-bold">
            <Database className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Match Vault & PGN Ledger
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Neon Lakebase PostgreSQL Telemetry Logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 font-mono text-xs text-amber-400">
              <CloudOff className="w-3.5 h-3.5 animate-pulse" />
              <span>{pendingSyncCount} PENDING SYNC</span>
            </div>
          ) : isOfflineVault ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-white/10 font-mono text-xs text-zinc-300">
              <CloudOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>OFFLINE VAULT</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs text-emerald-400">
              <CloudCheck className="w-3.5 h-3.5" />
              <span>LAKEBASE SYNCED</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1d22] border border-white/[0.06] font-mono text-xs">
            <span className="text-zinc-500 font-bold">TOTAL MATCHES:</span>
            <span className="font-bold text-[#22c55e] text-sm">{totalMatches}</span>
          </div>
        </div>
      </div>

      {/* Rank Progression Hero Banner */}
      {(() => {
        const rankInfo = getRankFromXp(userXp);
        return (
          <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 sm:p-5 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider">
                  TACTICIAN STANDING
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-white/10 text-[#ffcc00] border border-[#ffcc00]/20">
                  {rankInfo.tier.badge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                <span className="text-zinc-500">CAREER XP:</span>
                <span className="font-mono text-sm font-bold text-[#ffcc00]">{userXp.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">
                  {rankInfo.tier.title}
                </span>
                <span className="text-xs text-zinc-400">
                  {rankInfo.tier.league} League · Division {rankInfo.tier.division}
                </span>
              </div>

              {rankInfo.nextTier && (
                <div className="flex flex-col sm:items-end text-xs">
                  <span className="text-zinc-500 font-medium">NEXT ADVANCEMENT</span>
                  <span className="font-bold text-white">{rankInfo.nextTier.title} ({rankInfo.nextTier.minXp.toLocaleString()} XP)</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold text-zinc-400">
                <span>Division Progress</span>
                <span className="text-[#22c55e]">{rankInfo.progressPercent}%</span>
              </div>
              <div className="w-full bg-[#1c1d22] h-2.5 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-[#22c55e] h-full rounded-full transition-all duration-500"
                  style={{ width: `${rankInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Telemetry Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#16171b] border border-white/[0.06] flex flex-col gap-0.5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Games Recorded</span>
          <span className="text-2xl font-bold text-white mt-1">{totalMatches}</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Persisted to PostgreSQL</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#16171b] border border-white/[0.06] flex flex-col gap-0.5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Victory Tally</span>
          <span className="text-2xl font-bold text-[#22c55e] mt-1">{userWins}</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">
            Across {userMatches.length} player matches
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#16171b] border border-white/[0.06] flex flex-col gap-0.5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Database Storage</span>
          <span className="text-2xl font-bold text-[#38bdf8] mt-1">PGN 100%</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Complete algebraic notation</span>
        </div>
      </div>

      {/* Match Ledger Records */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 p-1 bg-[#16171b] border border-white/[0.06] rounded-xl text-xs font-bold">
            <button
              onClick={() => setGameFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                gameFilter === 'all'
                  ? 'bg-white/10 text-white font-extrabold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Disciplines
            </button>
            <button
              onClick={() => setGameFilter('chess')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                gameFilter === 'chess'
                  ? 'bg-white/10 text-white font-extrabold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>Chess</span>
            </button>
            <button
              onClick={() => setGameFilter('checkers')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                gameFilter === 'checkers'
                  ? 'bg-white/10 text-white font-extrabold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Checkers</span>
            </button>
            <button
              onClick={() => setGameFilter('morabaraba')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                gameFilter === 'morabaraba'
                  ? 'bg-white/10 text-white font-extrabold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#FF173D]" />
              <span>Morabaraba</span>
            </button>
          </div>
          <span className="text-xs font-bold text-zinc-500 font-mono">
            {matches.filter((m) => gameFilter === 'all' || (m.gameId || 'chess') === gameFilter).length} RECORDED
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-6 h-6 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400 animate-pulse font-mono">
              Accessing Neon ledger...
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-white/[0.06] p-6 bg-[#16171b]">
            <span className="text-base font-bold text-white block mb-1">
              No Matches Recorded Yet
            </span>
            <p className="text-xs text-zinc-400 mb-4">
              Play a match against the machine or invite a companion in the arena to populate the ledger.
            </p>
            <Link
              href="/play"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary-red text-white text-xs font-bold"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Launch Arena</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {matches
              .filter((m) => gameFilter === 'all' || (m.gameId || 'chess') === gameFilter)
              .map((m) => {
              const isWhiteWin = m.winnerId === m.whiteId;
              const isBlackWin = m.winnerId === m.blackId;
              const isDraw = !m.winnerId;

              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-[#16171b] hover:bg-[#1c1d22] border border-white/[0.06] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left: Date, Players, and Rating */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-extrabold text-[10px] uppercase flex items-center gap-1">
                        <DisciplineIcon gameId={m.gameId || 'chess'} size={12} />
                        <span>{m.gameId === 'checkers' ? 'Checkers' : m.gameId === 'morabaraba' ? 'Morabaraba' : 'Chess'}</span>
                      </span>
                      <span>·</span>
                      <span>{formatDate(m.createdAt)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3 h-3 text-[#ffcc00]" />
                        <span>{m.timeControl}m Clock</span>
                      </span>
                      {m.rated && (
                        <>
                          <span>·</span>
                          <span className="text-[#22c55e]">RATED [±{m.ratingDelta}]</span>
                        </>
                      )}
                    </div>

                    {/* Opponents Matchup */}
                    <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                      <span className="flex items-center gap-1.5 truncate">
                        <Shield className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                        <span className={isWhiteWin ? 'text-[#22c55e] font-black' : ''}>{m.white?.handle || m.whiteId || 'White'}</span>
                        {m.white?.xp !== undefined && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white/10 text-zinc-300">
                            {getRankFromXp(m.white.xp).tier.badge}
                          </span>
                        )}
                      </span>

                      <span className="text-zinc-600 text-xs font-mono">vs</span>

                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-[#e60012] shrink-0" />
                        <span className={isBlackWin ? 'text-[#22c55e] font-black' : ''}>{m.black?.handle || m.blackId || 'Black'}</span>
                        {m.black?.xp !== undefined && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-white/10 text-zinc-300">
                            {getRankFromXp(m.black.xp).tier.badge}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Result Tag & Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs font-mono">
                    {/* Result Pill */}
                    <div
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isDraw
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
                      }`}
                    >
                      {m.resultType}
                    </div>

                    {/* Copy PGN Button */}
                    {/* Replay Board */}
                    <button
                      onClick={() => setReplayMatch(m)}
                      title="Interactive Move-by-Move Replay"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FF6A00] to-[#FF173D] hover:brightness-110 text-white font-bold text-[10px] transition shadow-sm cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Replay</span>
                    </button>

                    <button
                      onClick={() => handleCopyPgn(m.id, m.pgn)}
                      title="Copy PGN Notation"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-300 transition text-[11px]"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-[#22c55e]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === m.id ? 'COPIED' : 'PGN'}</span>
                    </button>

                    {/* Inspect PGN */}
                    <button
                      onClick={() => setSelectedPgn({ id: m.id, pgn: m.pgn })}
                      title="View Full PGN"
                      className="p-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] text-zinc-400 hover:text-white transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PGN Viewer Modal */}
      {selectedPgn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-xl bg-[#16171b] border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <span className="font-extrabold uppercase tracking-wider text-white">PGN Notation Log</span>
              <button
                onClick={() => setSelectedPgn(null)}
                className="p-1 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3 bg-[#111215] border border-white/[0.06] rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300">
              {selectedPgn.pgn || 'No PGN telemetry recorded for this match.'}
            </pre>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => handleCopyPgn(selectedPgn.id, selectedPgn.pgn)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary-red text-white font-bold text-xs transition"
              >
                {copiedId === selectedPgn.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedPgn.id ? 'Copied' : 'Copy PGN'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Move-by-Move Replay Modal */}
      {replayMatch && (
        <ReplayModal
          match={{
            id: replayMatch.id,
            gameId: replayMatch.gameId,
            whiteHandle: replayMatch.white.handle,
            blackHandle: replayMatch.black.handle,
            timeControl: replayMatch.timeControl,
            resultType: replayMatch.resultType,
            pgn: replayMatch.pgn,
            finalFen: replayMatch.finalFen,
          }}
          onClose={() => setReplayMatch(null)}
        />
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <AppShell>
      <ArchivePageContent />
    </AppShell>
  );
}
