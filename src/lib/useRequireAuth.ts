'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getPlayerSession, isAuthenticatedSession, SESSION_UPDATED_EVENT, PlayerSession } from '@/lib/session';

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return isAuthenticatedSession(getPlayerSession());
  });

  useEffect(() => {
    const s = getPlayerSession();
    const authed = isAuthenticatedSession(s);

    const getRedirectTarget = () => {
      if (typeof window !== 'undefined') {
        return window.location.pathname + window.location.search;
      }
      return pathname || '/play';
    };

    if (!authed) {
      router.replace(`/login?redirect=${encodeURIComponent(getRedirectTarget())}`);
    }

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<PlayerSession>;
      if (customEvent?.detail) {
        const isAuth = isAuthenticatedSession(customEvent.detail);
        setIsAuthenticated(isAuth);
        if (!isAuth) {
          router.replace(`/login?redirect=${encodeURIComponent(getRedirectTarget())}`);
        }
      }
    };

    window.addEventListener(SESSION_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, handleSync);
  }, [pathname, router]);

  return { isAuthenticated };
}
