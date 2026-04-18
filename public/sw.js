const CACHE_NAME = 'dentis-admin-v3';
const STATIC_CACHE = 'dentis-static-v3';
const APP_SHELL = ['/', '/manifest.json', '/favicon.ico', '/admin-icon-192.png', '/admin-icon-512.png'];

// Кеш для статичних ассетів (JS/CSS з хешами в назві)
const STATIC_ASSETS = /\.(js|css|woff2?|png|webp|svg)$/;
// API запити - не кешуємо
const API_ROUTES = /\/api\/|\/proxy-api\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const { request } = event;
  const url = new URL(request.url);

  // API запити - network only
  if (API_ROUTES.test(url.pathname)) {
    return;
  }

  // Статичні ассети з хешем - cache first, long-term
  if (STATIC_ASSETS.test(url.pathname) && url.pathname.includes('.')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        }),
      ),
    );
    return;
  }

  // Навігаційні запити - stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      }),
    ),
  );
});

// Обробка повідомлень для активації нового SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
