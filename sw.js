// Bump CACHE version (e.g. 'cosmic-v2') whenever assets change to force fresh install
const CACHE = 'cosmic-v1';
const ASSETS = ['/', '/index.html', '/app.css', '/app.js',
                '/content.en.js', '/content.zh.js',
                '/manifest.json', '/cosmic-daily-icon-192.png', '/cosmic-daily-icon.png'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);

self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
);

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
