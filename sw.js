/* =====================================================
   Service Worker — Tréninkový deník (Offline-First PWA)
   ===================================================== */

const CACHE_NAME = 'treninkovy-denik-v16';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './logo-blue.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './libs/roboto.js',
  './modules/storage.js',
  './modules/projects.js',
  './modules/sessions.js',
  './modules/exercises.js',
  './modules/payments.js',
  './modules/players.js',
  './modules/settings.js',
  './modules/pdf.js'
];

// Install — cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first strategy (ideal for offline-first apps)
self.addEventListener('fetch', event => {
  // Skip non-GET requests and external CDN requests (jsPDF etc.)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For external CDN resources, use network-first with cache fallback
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For local assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
