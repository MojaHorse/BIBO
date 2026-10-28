'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  UserPlus,
  Radio,
  Swords,
  Eye,
  Check,
  Copy,
  Clock,
  Sparkles,
  X,
  Share2,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { getPlayerSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Friend {
  id: string;
  handle: string;
  status: 'online' | 'in_game' | 'away' | 'offline';
  gameActivity?: string;
  rating: number;
  lastSeen?: string;
  avatarBg: string;
}

export default function FriendsPage() {
  const { isAuthenticated } = useRequireAuth();
  const [filter, setFilter] = useState<'online' | 'all' | 'requests'>('online');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState<{ id: string; handle: string }>({ id: '', handle: '' });
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newFriendHandle, setNewFriendHandle] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const s = getPlayerSession();
    setSession({ id: s.id, handle: s.displayName || s.handle });

    // 1. Try loading user-saved friends
    let savedFriends: Friend[] = [];
    try {
      const saved = localStorage.getItem('bibo_friends');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          savedFriends = parsed;
        }
      }
    } catch {}

    if (savedFriends.length > 0) {
      setFriends(savedFriends);
      setLoading(false);
      return;
    }

    // 2. Otherwise populate with real registered players from database
    fetch('/api/rankings?limit=6')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.leaderboard && Array.isArray(data.leaderboard)) {
          const colors = [
            'from-[#FF6A00] to-[#FF173D]',
            'from-amber-500 to-red-500',
            'from-emerald-500 to-teal-600',
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-pink-600',
          ];
          const realPlayers: Friend[] = data.leaderboard
            .filter((p: any) => p.id !== s.id)
            .map((p: any, idx: number) => ({
              id: p.id,
              handle: p.handle,
              status: idx % 2 === 0 ? 'online' : 'in_game',
              gameActivity: idx % 2 === 0 ? 'In Lobby · Ready to duel' : 'Tactical Arena',
              rating: p.rating || p.blitzRating || 1200,
              avatarBg: colors[idx % colors.length],
            }));
          setFriends(realPlayers);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendHandle.trim()) return;

    const newF: Friend = {
      id: `f_${Date.now()}`,
      handle: newFriendHandle.trim(),
      status: 'online',
      gameActivity: 'Online · Just added',
      rating: 1250,
      avatarBg: 'from-[#FF6A00] to-amber-500',
    };

    const updated = [newF, ...friends];
    setFriends(updated);
    try {
      localStorage.setItem('bibo_friends', JSON.stringify(updated));
    } catch {}
    setNewFriendHandle('');
  };

  const handleChallenge = (friendHandle: string) => {
    const code = `bibo_${Math.random().toString(36).substring(2, 7)}`;
    setCreatedRoomCode(code);
    setInviteModalOpen(true);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/play?room=${createdRoomCode}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (search.trim()) {
      return f.handle.toLowerCase().includes(search.toLowerCase());
    }
    if (filter === 'online') {
      return f.status === 'online' || f.status === 'in_game' || f.status === 'away';
    }
    return true;
  });

  const onlineCount = friends.filter((f) => f.status === 'online' || f.status === 'in_game' || f.status === 'away').length;

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <BiboCatMascot size={32} glow />
          <p className="text-sm font-bold text-zinc-400">Authenticating tactician directory...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 pb-8">
        {/* Header (Matching Screen 7) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-[#FF6A00]" />
              <h1 className="text-2xl font-black text-white tracking-tight">Friends & Tacticians</h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              {friends.length} Friends · {onlineCount} Available Online
            </p>
          </div>

          <button
            onClick={() => {
              const code = `bibo_${Math.random().toString(36).substring(2, 7)}`;
              setCreatedRoomCode(code);
              setInviteModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl btn-bibo-primary text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Friends</span>
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#222226] border border-white/[0.08] flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends by handle..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 w-full"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[#222226] border border-white/[0.08] shrink-0">
            <button
              onClick={() => setFilter('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filter === 'online'
                  ? 'btn-bibo-primary shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>Online ({onlineCount})</span>
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'btn-bibo-primary shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({friends.length})
            </button>
          </div>
        </div>

        {/* Friends Cards List (Matching Screen 7) */}
        <div className="rounded-2xl bg-[#222226] border border-white/[0.08] overflow-hidden shadow-xl">
          {filteredFriends.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              No friends matching your filter. Use the input below to add players!
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${friend.avatarBg} flex items-center justify-center text-sm font-black text-white shadow-sm`}>
                        {friend.handle.slice(0, 1).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#222226] ${
                        friend.status === 'online'
                          ? 'bg-[#22C55E]'
                          : friend.status === 'in_game'
                          ? 'bg-[#38bdf8]'
                          : friend.status === 'away'
                          ? 'bg-amber-400'
                          : 'bg-zinc-600'
                      }`} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white truncate">{friend.handle}</span>
                        <span className="text-[10px] font-mono text-zinc-500 font-bold">
                          {friend.rating} ELO
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 truncate">
                        {friend.gameActivity || friend.lastSeen}
                      </span>
                    </div>
                  </div>

                  {/* Context Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {friend.status === 'in_game' ? (
                      <Link
                        href="/play"
                        className="px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#28282e] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>Spectate</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleChallenge(friend.handle)}
                        className="px-3.5 py-1.5 rounded-xl btn-bibo-primary text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Challenge</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA Button (Screen 7) */}
        <button
          onClick={() => {
            const code = `bibo_${Math.random().toString(36).substring(2, 7)}`;
            setCreatedRoomCode(code);
            setInviteModalOpen(true);
          }}
          className="w-full py-3.5 px-4 rounded-2xl btn-bibo-primary text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-[0.98] transition font-sora"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Friends</span>
        </button>

        {/* Quick Add Friend Input */}
        <form
          onSubmit={handleAddFriend}
          className="rounded-2xl bg-[#222226] border border-white/[0.08] p-4 flex items-center gap-3"
        >
          <input
            type="text"
            value={newFriendHandle}
            onChange={(e) => setNewFriendHandle(e.target.value)}
            placeholder="Enter player handle to add friend..."
            className="flex-1 bg-[#171719] border border-white/[0.06] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FF6A00]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl btn-bibo-secondary text-xs font-bold hover:text-white shrink-0 cursor-pointer"
          >
            Add Friend
          </button>
        </form>

        {/* Challenge / Invite Room Modal */}
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-[#222226] border border-white/20 p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col gap-4 relative">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <BiboCatMascot size={36} glow />
                <div>
                  <h3 className="text-base font-black text-white">Private Duel Invite</h3>
                  <p className="text-xs text-zinc-400">Share with a friend to play instantly</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#171719] border border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Room Code</span>
                  <span className="text-sm font-black font-mono text-[#FF6A00] tracking-wider truncate">
                    {createdRoomCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl btn-bibo-secondary text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/play?room=${createdRoomCode}`}
                  className="flex-1 py-2.5 px-4 rounded-xl btn-bibo-primary text-xs font-black uppercase tracking-wider text-center"
                >
                  Enter Room
                </Link>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl btn-bibo-secondary text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
