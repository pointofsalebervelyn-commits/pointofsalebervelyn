const CACHE_NAME = 'bopstina-shell-v10';
const APP_SHELL = [
  '/html/',
  '/html/index.html',
  '/css/style.css',
  '/javascript/app.js?v=10',
  '/javascript/config.js',
  '/manifest.webmanifest',
  '/assets/bopstina-192.png',
  '/assets/bopstina-512.png',
  '/assets/bosptina%20logo.jpg',
  '/assets/Bopstina%20login%20pic.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
