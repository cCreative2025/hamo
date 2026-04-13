// Service Worker for Hamo PWA

const CACHE_NAME = 'hamo-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/styles/globals.css',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const clonedResponse = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }

        return response;
      })
      .catch(() => {
        // Return cached version if available
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('오프라인 상태입니다', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Background sync (선택사항)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-drawings') {
    event.waitUntil(
      // 동기화 로직 구현
      Promise.resolve()
    );
  }
});
