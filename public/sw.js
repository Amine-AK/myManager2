// ==========================================
// myManager PWA - Service Worker
// Offline Shell & Dynamic Asset Cache
// ==========================================

const CACHE_NAME = 'mymanager-shell-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest'
];

// 1. Installation - Cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activation - Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch - Smart offline caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // RULE A: Strictly bypass API routes (/api/*)
  // Data persistence, offline queuing, and synchronization are handled by IndexedDB & SyncEngine
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // RULE B: Navigation requests (HTML Shell)
  // Stale-while-revalidate with offline fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match('/index.html') || await caches.match('/');
          return cachedShell || Response.error();
        })
    );
    return;
  }

  // RULE C: Static Assets (/assets/*, fonts, svg icons)
  // Cache-First with network fallback & dynamic cache population
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // If offline and asset is not cached, return empty or fallback
            return Response.error();
          });
      })
    );
    return;
  }

  // RULE D: Default Stale-While-Revalidate for other static requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
