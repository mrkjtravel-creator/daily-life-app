// ── sw.js — Service Worker (PWA offline support) ─────────
const CACHE_NAME = 'daily-life-v1.8';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'src/styles/reset.css',
  'src/styles/variables.css',
  'src/styles/app.css',
  'src/data/store.js',
  'src/data/events.js',
  'src/data/habits.js',
  'src/data/gcal.js',
  'src/components/weekstrip.js',
  'src/components/modal.js',
  'src/components/navbar.js',
  'src/screens/home.js',
  'src/screens/timeline.js',
  'src/screens/calendar.js',
  'src/screens/profile.js',
  'src/app.js',
];

// Install: Cache all essential assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate for local assets, Network-First for others
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Only handle GET requests and local assets
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(networkResponse => {
        // Cache the new version if it's a successful local asset fetch
        if (networkResponse && networkResponse.status === 200 && ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')))) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
