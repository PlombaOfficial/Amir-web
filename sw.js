/* Ускоряет повторные заходы и даёт сайту открываться без интернета.
   Важно: обновления сайта видны сразу — страница всегда берётся из сети,
   а стили, шрифты и картинки после отдачи из кэша тут же обновляются в фоне.

   Номер версии меняем при любой правке списка ниже — старый кэш
   удаляется при активации. */

const CACHE = 'amirweb-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/main.js',
  '/assets/js/i18n.js',
  '/assets/fonts/manrope-latin.woff2',
  '/assets/fonts/manrope-cyrillic.woff2',
  '/assets/fonts/manrope-cyrillic-ext.woff2',
  '/favicon.svg',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll падает целиком, если хоть один файл не скачался.
      // Кладём по одному: пропавшая иконка не должна ломать установку.
      .then((cache) => Promise.all(
        ASSETS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Страницы — сначала сеть, кэш только когда интернета нет.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Остальное — отдаём мгновенно из кэша и сразу обновляем в фоне.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })
    )
  );
});
