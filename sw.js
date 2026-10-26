// service worker: offline copy of the atlas. Version eb60b7e0eb (built 20261026085426 UTC).
const CACHE = 'atlas-eb60b7e0eb';
const ASSETS = ["./", "index.html", "styles.css?v=eb60b7e0eb", "app.js?v=eb60b7e0eb", "data/bibliography.js?v=eb60b7e0eb", "data/meta.js?v=eb60b7e0eb", "data/monographs.js?v=eb60b7e0eb", "data/syntheses.js?v=eb60b7e0eb", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
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
