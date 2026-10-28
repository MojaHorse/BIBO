'use client';

import React from 'react';
import { PlayerColor } from '@/lib/games/types';
import { Handshake, X, Check } from 'lucide-react';

interface DrawOfferModalProps {
  isOpen: boolean;
  pendingFrom: PlayerColor | null;
  myRole: PlayerColor | 'spectator' | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const DrawOfferModal: React.FC<DrawOfferModalProps> = ({
  isOpen,
  pendingFrom,
  myRole,
  onAccept,
  onDecline,
}) => {
  if (!isOpen || !pendingFrom) return null;

  const isIncoming = pendingFrom !== myRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#171719] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[#FF6A00]">
          <Handshake className="w-7 h-7" />
        </div>

        {isIncoming ? (
          <>
            <h3 className="text-lg font-bold text-[#F8F1E5] font-['Sora']">Draw Offered</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              Your opponent has proposed a peaceful mutual draw.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-rose-500" />
                <span>Decline</span>
              </button>
              <button
                onClick={onAccept}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-xs font-semibold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Accept Draw</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[#F8F1E5] font-['Sora']">Draw Offer Sent</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              Waiting for opponent to review your draw proposal...
            </p>
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-xs font-medium text-zinc-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-ping" />
                Awaiting Opponent Decision
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
