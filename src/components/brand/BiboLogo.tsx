'use client';

import React from 'react';

interface BiboMascotProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * BIBO Cat Mascot
 * Official high-resolution brand icon from /logos/BIBO_icon_orange.png
 */
export const BiboCatMascot: React.FC<BiboMascotProps> = ({
  className = '',
  size = 40,
  glow = false,
}) => {
  return (
    <img
      src="/logos/BIBO_icon_orange.png"
      alt="BIBO"
      width={size}
      height={Math.round(size * (1188 / 1300))}
      style={{ width: size, height: 'auto' }}
      className={`shrink-0 object-contain select-none transition-transform duration-200 ${
        glow ? 'drop-shadow-[0_0_16px_rgba(255,106,0,0.45)]' : ''
      } ${className}`}
    />
  );
};

interface BiboLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitle?: string;
  glow?: boolean;
}

/**
 * Official Horizontal BIBO Brand Logo with Typography
 */
export const BiboLogo: React.FC<BiboLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = false,
  subtitle = 'STRATEGY ARENA',
  glow = false,
}) => {
  const heights = {
    xs: 20,
    sm: 26,
    md: 32,
    lg: 42,
    xl: 54,
  };

  const h = heights[size];

  return (
    <div className={`flex flex-col justify-center select-none ${className}`}>
      <img
        src="/logos/horizontal_logo_light.png"
        alt="BIBO"
        height={h}
        style={{ height: h, width: 'auto', maxWidth: '100%' }}
        className={`object-contain transition-transform duration-200 ${
          glow ? 'drop-shadow-[0_0_16px_rgba(255,106,0,0.35)]' : ''
        }`}
      />
      {showSubtitle && (
        <span className="text-[8px] uppercase font-bold tracking-[0.15em] text-zinc-400 mt-0.5 font-mono whitespace-nowrap">
          {subtitle}
        </span>
      )}
    </div>
  );
};

interface BiboFullLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
  variant?: 'light' | 'white' | 'dark';
}

/**
 * Official Full Stacked BIBO Brand Logo (Mascot + Custom Brand Typography)
 * Sourced directly from /logos/full_logo_orange_light.png
 */
export const BiboFullLogo: React.FC<BiboFullLogoProps> = ({
  className = '',
  size = 140,
  glow = true,
  variant = 'light',
}) => {
  const src =
    variant === 'white'
      ? '/logos/full_logo_white.png'
      : variant === 'dark'
      ? '/logos/full_logo_orange_dark.png'
      : '/logos/full_logo_orange_light.png';

  return (
    <img
      src={src}
      alt="BIBO Arena"
      width={size}
      height={Math.round(size * (4028 / 4468))}
      style={{ width: size, height: 'auto' }}
      className={`shrink-0 object-contain select-none transition-transform duration-200 ${
        glow ? 'drop-shadow-[0_0_24px_rgba(255,106,0,0.4)]' : ''
      } ${className}`}
    />
  );
};

/**
 * App Icon Card matching the Brand Elements rounded squircle mockup
 */
export const BiboAppIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-2xl bg-gradient-to-b from-[#222226] to-[#171719] border border-white/[0.08] shadow-xl flex items-center justify-center p-2 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-radial from-[#FF6A00]/15 via-transparent to-transparent opacity-80" />
      <BiboCatMascot size={size * 0.72} glow />
    </div>
  );
};
