// service worker: offline copy of the atlas. Version 25427bf1c6 (built 20261027172707 UTC).
const CACHE = 'atlas-25427bf1c6';
const ASSETS = ["./", "index.html", "styles.css?v=25427bf1c6", "app.js?v=25427bf1c6", "data/bibliography.js?v=25427bf1c6", "data/meta.js?v=25427bf1c6", "data/monographs.js?v=25427bf1c6", "data/syntheses.js?v=25427bf1c6", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
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
