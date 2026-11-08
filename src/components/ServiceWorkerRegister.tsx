'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // O APK usa o bundle local; service worker só faz sentido no navegador/PWA.
    if (Capacitor.isNativePlatform()) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          for (const registration of registrations) registration.unregister();
        })
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(e => {
      console.error('Service worker registration failed:', e);
    });
  }, []);

  return null;
}
