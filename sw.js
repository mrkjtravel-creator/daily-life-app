// ── sw.js — Service Worker (PWA offline support) ─────────
const CACHE = 'daily-life-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'src/styles/reset.css',
  'src/styles/variables.css',
  'src/styles/app.css',
  'src/data/store.js',
  'src/data/events.js',
  'src/data/habits.js',
  'src/components/weekstrip.js',
  'src/components/modal.js',
  'src/components/navbar.js',
  'src/screens/home.js',
  'src/screens/timeline.js',
  'src/screens/calendar.js',
  'src/screens/profile.js',
  'src/app.js',
];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
);

self.addEventListener('fetch', e =>
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
);
