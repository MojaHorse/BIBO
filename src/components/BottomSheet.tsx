'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[88dvh]',
}) => {
  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    haptics.tap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Sheet / Modal Container */}
      <div
        className={`relative w-full sm:max-w-xl bg-[#16171b] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col ${maxHeight} z-10 animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Mobile Drag Indicator Pill */}
        <div className="sm:hidden flex justify-center pb-2 pt-0.5">
          <div className="w-10 h-1 bg-zinc-600/60 rounded-full" />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between pb-3 border-b border-white/[0.06] mb-3 shrink-0">
            <div>
              {typeof title === 'string' ? (
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
            </div>

            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">{children}</div>
      </div>
    </div>
  );
};
