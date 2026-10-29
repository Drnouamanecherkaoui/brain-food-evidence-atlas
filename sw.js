// service worker: offline copy of the atlas. Version 79c5a4bb7f (built 20261029084347 UTC).
const CACHE = 'atlas-79c5a4bb7f';
const ASSETS = ["./", "index.html", "styles.css?v=79c5a4bb7f", "app.js?v=79c5a4bb7f", "data/bibliography.js?v=79c5a4bb7f", "data/details.js?v=79c5a4bb7f", "data/meta.js?v=79c5a4bb7f", "data/monographs.js?v=79c5a4bb7f", "data/syntheses.js?v=79c5a4bb7f", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('atlas-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {  // pages: network first so new versions arrive, cache when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));  // versioned assets: cache first
});
