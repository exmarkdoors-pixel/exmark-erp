// EXMARK ERP Service Worker — Offline Caching & Background Sync
const CACHE_NAME = 'exmark-erp-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  // If running on localhost / 127.0.0.1, immediately self-unregister and skip
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    self.registration.unregister();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    self.registration.unregister();
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // COMPLETELY BYPASS on localhost/dev or for _next chunks, HMR, APIs, websockets
  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('webpack') ||
    url.pathname.includes('turbopack') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Network-first with cache fallback for HTML pages and static assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error - Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
