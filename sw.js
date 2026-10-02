const CACHE_NAME = 'notepro-v2';
const APP_SHELL = [
  '/NotesPro/',
  '/NotesPro/index.html',
  '/NotesPro/style.css',
  '/NotesPro/app.js',
  '/NotesPro/manifest.json',
  '/NotesPro/icon-192.png',
  '/NotesPro/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Always check the network first for app files so GitHub Pages updates
  // become visible immediately. Cache is only the offline fallback.
  const url = new URL(request.url);
  const isAppFile =
    url.origin === self.location.origin &&
    /\.(html|js|css|json)$/.test(url.pathname);

  if (isAppFile || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/NotesPro/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
