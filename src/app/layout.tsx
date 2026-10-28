import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SettingsProvider } from '@/lib/settings-context';
import { ArenaModeProvider } from '@/lib/arena-mode-context';
import { QuickPlayProvider } from '@/lib/quick-play-context';
import { QuickPlayDrawer } from '@/components/QuickPlayDrawer';
import { PWARegistration } from '@/components/PWARegistration';
import { MobileInstallPrompt } from '@/components/MobileInstallPrompt';

export const viewport: Viewport = {
  themeColor: '#111215',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'BIBO — Strategy Arena (Chess, Checkers, Morabaraba)',
  description: 'Fast, tactile strategy gaming platform featuring Chess, Checkers, Morabaraba, AI Coaching, and Global Leaderboards.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BIBO',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#0c0d14] text-[#f1f3f9] font-sans antialiased selection:bg-[#ff334b] selection:text-white"
      >
        <SettingsProvider>
          <ArenaModeProvider>
            <QuickPlayProvider>
              <PWARegistration />
              <MobileInstallPrompt />
              {children}
              <QuickPlayDrawer />
            </QuickPlayProvider>
          </ArenaModeProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
