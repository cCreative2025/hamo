/**
 * PWA Service Worker 등록
 */
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // New service worker available - notify user
            console.log('New version of app available');
            // Could emit event or dispatch Redux action here
          }
        });
      }
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

/**
 * 서비스 워커 업데이트 확인
 */
export const checkForUpdates = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update();
  }
};

/**
 * Install 프롬프트 처리 (PWA 설치 배너)
 */
export let deferredPrompt: any = null;

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Install prompt ready');
  });
};

export const showInstallPrompt = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  }
};

/**
 * 앱 설치 여부 확인
 */
export const isAppInstalled = async (): Promise<boolean> => {
  if ('getInstalledRelatedApps' in navigator) {
    const apps = await (navigator as any).getInstalledRelatedApps?.();
    return apps && apps.length > 0;
  }
  return false;
};
