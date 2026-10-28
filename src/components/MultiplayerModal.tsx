'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Users, ArrowRight, Share2 } from 'lucide-react';
import { getPlayerSession } from '@/lib/session';
import { GameId } from '@/lib/games/types';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: GameId;
  variant?: string;
  gameTitle?: string;
  currentUser?: { id: string; handle: string; rating?: number; blitzRating?: number } | null;
  onRoomCreated: (roomId: string, inviteUrl: string, playerToken?: string) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  gameId = 'chess',
  variant,
  gameTitle,
  currentUser,
  onRoomCreated,
}) => {
  const [timeControl, setTimeControl] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const displayTitle =
    gameTitle ||
    (gameId === 'checkers'
      ? 'Checkers'
      : gameId === 'morabaraba'
      ? 'Morabaraba'
      : 'Chess');

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const session = getPlayerSession();
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeControlMinutes: timeControl,
          player: session,
          gameId,
          variant,
        }),
      });

      const data = await res.json();
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        onRoomCreated(data.roomId, data.inviteUrl, data.playerToken);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `BIBO ${displayTitle} Match Challenge`,
          text: `Play ${displayTitle} with me live on BIBO!`,
          url: inviteUrl,
        });
      } catch {
        // user dismissed dialog
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#16171b] border border-white/[0.08] rounded-2xl text-zinc-100 p-5 sm:p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Create {displayTitle} Arena
            </h2>
            <p className="text-xs text-zinc-500">Live P2P link for 2-player match</p>
          </div>
        </div>

        {inviteUrl ? (
          <div className="flex flex-col gap-3.5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Share this invite link with your opponent. As soon as they join, the match starts automatically.
            </p>

            <div className="flex items-center gap-2 p-1.5 bg-[#111215] border border-white/[0.06] rounded-xl">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="bg-transparent text-xs font-mono text-zinc-300 flex-1 outline-none px-2 select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg btn-tactile text-white font-mono text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span>Awaiting opponent connection...</span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleShare}
                className="w-full py-2.5 px-3 rounded-xl bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 text-[#38bdf8] border border-[#38bdf8]/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>SHARE INVITE (WHATSAPP / CHAT)</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl btn-primary-red text-white text-xs font-bold transition cursor-pointer"
              >
                GO TO BOARD
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Select Time Control:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '1m Bullet', min: 1 },
                  { label: '3m Blitz', min: 3 },
                  { label: '5m Blitz', min: 5 },
                  { label: '10m Rapid', min: 10 },
                ].map((tc) => (
                  <button
                    key={tc.min}
                    type="button"
                    onClick={() => setTimeControl(tc.min)}
                    className={`py-2 px-1 text-center rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                      timeControl === tc.min
                        ? 'bg-white text-black font-extrabold shadow-sm'
                        : 'bg-[#1c1d22] text-zinc-400 border border-white/[0.04] hover:text-white'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-2.5 rounded-xl btn-primary-red text-white font-bold text-xs disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Creating Arena...' : 'Generate Match Link'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
