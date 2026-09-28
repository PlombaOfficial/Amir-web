const CACHE = 'amirweb-v9-studio';
const BASE = new URL('./', self.location.href);
const ASSETS = ['index.html','assets/css/styles.css?v=9','assets/js/main.js?v=9','assets/js/i18n.js?v=9','assets/fonts/manrope-latin.woff2','assets/fonts/manrope-cyrillic.woff2','assets/fonts/manrope-cyrillic-ext.woff2','assets/img/hero-devices.webp','assets/img/logo-mark.png','favicon.svg','manifest.json','assets/css/experience.css?v=9','assets/js/experience.js?v=9','assets/img/hero-devices-dark.webp','assets/img/cafe.webp','assets/img/shop.webp','assets/img/workspace.webp','assets/img/sharyn-screen.webp','assets/img/teacher-screen.webp'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(p => new URL(p, BASE).href))).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('amirweb-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== BASE.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(new URL('index.html', BASE).href, copy))); }
      return res;
    }).catch(() => caches.match(new URL('index.html', BASE).href)));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req);
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit || Response.error());
    event.waitUntil(fresh);
    return hit || fresh;
  }));
});
