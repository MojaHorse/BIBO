'use client';

import { useEffect } from 'react';

export function PWARegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Obscura PWA service worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('PWA registration notice:', err);
          });
      });
    }
  }, []);

  return null;
}
