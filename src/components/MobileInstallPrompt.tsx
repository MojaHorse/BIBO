'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function MobileInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as any).standalone);

    if (isStandalone) return;

    // Check recent dismissal
    const lastDismissed = localStorage.getItem('obscura_pwa_dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 7 * 86400000) {
      return;
    }

    setDismissed(false);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = isIOS && /safari/.test(userAgent) && !/crios|fxios/.test(userAgent);

    if (isSafari) {
      setShowIOSPrompt(true);
      return;
    }

    // Android / Chromium PWA install event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    try {
      localStorage.setItem('obscura_pwa_dismissed', String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  };

  if (dismissed || (!showIOSPrompt && !showAndroidPrompt)) {
    return null;
  }

  return (
    <div className="md:hidden fixed top-3 left-3 right-3 z-50 bg-[#16171b]/95 border border-[#38bdf8]/30 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e60012] to-[#38bdf8] flex items-center justify-center text-white text-base font-black shrink-0 shadow-sm">
            ♞
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-white">Install BIBO Mobile</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">PWA</span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              {showIOSPrompt
                ? 'Tap Share ⎋ then "Add to Home Screen"'
                : 'Install native standalone console experience'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showAndroidPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold text-xs transition shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          {showIOSPrompt && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 text-zinc-300 text-[10px] font-bold font-mono">
              <Share className="w-3 h-3 text-[#38bdf8]" />
              <span>Share → Add</span>
            </div>
          )}

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
