/* Service worker : rend l'application installable et utilisable hors ligne. */
const VERSION = 'bibliotheque-v1';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/util.js',
  'js/store.js',
  'js/ui.js',
  'js/grid.js',
  'js/modals.js',
  'js/views-dashboard.js',
  'js/views-libraries.js',
  'js/views-books.js',
  'js/views-search.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const cache = await caches.open(VERSION);
        return (await cache.match('./index.html'))
          || (await cache.match('./'))
          || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    if (hit) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok && fresh.type === 'basic') await cache.put(req, fresh.clone());
        } catch (e) { /* hors ligne : le cache suffit */ }
      })());
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') await cache.put(req, res.clone());
      return res;
    } catch (e) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
