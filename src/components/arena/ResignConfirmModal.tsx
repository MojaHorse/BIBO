'use client';

import React from 'react';
import { Flag, X } from 'lucide-react';

interface ResignConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResignConfirmModal: React.FC<ResignConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#171719] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-500">
          <Flag className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-[#F8F1E5] font-['Sora']">Resign Match?</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-6 leading-relaxed">
          Are you sure you want to forfeit? Your opponent will be immediately awarded the victory.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Keep Playing
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 active:scale-95 transition-transform"
          >
            Resign
          </button>
        </div>
      </div>
    </div>
  );
};
