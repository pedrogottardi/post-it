'use client';

import { useEffect } from 'react';
import { APP_VERSION, APP_VERSION_CODE } from '@/lib/version';
import UpdateDialog from '@/components/UpdateDialog';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Set app version for auto-update service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__APP_VERSION__ = APP_VERSION;
      window.__APP_VERSION_CODE__ = APP_VERSION_CODE;
    }
  }, []);

  return (
    <>
      {children}
      <UpdateDialog />
    </>
  );
}