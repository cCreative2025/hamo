'use client';

import { useEffect } from 'react';
import { registerServiceWorker, setupInstallPrompt } from '@/lib/pwa';

export const PWAInitializer: React.FC = () => {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Setup install prompt
    setupInstallPrompt();
  }, []);

  return null;
};
