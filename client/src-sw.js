const { offlineFallback, warmStrategyCache } = require('workbox-recipes');
const { CacheFirst } = require('workbox-strategies');
const { registerRoute } = require('workbox-routing');
const { CacheableResponsePlugin } = require('workbox-cacheable-response');
const { ExpirationPlugin } = require('workbox-expiration');
const { precacheAndRoute } = require('workbox-precaching/precacheAndRoute');

precacheAndRoute(self.__WB_MANIFEST);

const pageCache = new CacheFirst({
  cacheName: 'page-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

warmStrategyCache({
  urls: ['/index.html', '/'],
  strategy: pageCache,
});

registerRoute(({ request }) => request.mode === 'navigate', pageCache);

// TODO: Implement asset caching

// Cache names
const CACHE_NAME = 'my-cache';
const CACHE_STATIC_NAME = 'static-cache';

// Cached files
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/images/logo.png'
];

// Install service worker
self.addEventListener('install', (evt) => {
  console.log('Service worker installed');

  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching files');
        cache.addAll(FILES_TO_CACHE);
      })
  );
});

// Activate service worker
self.addEventListener('activate', (evt) => {
  console.log('Service worker activated');

  evt.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME && key !== CACHE_STATIC_NAME) {
          console.log('Deleting old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );

  self.clients.claim();
});

// Fetch assets
self.addEventListener('fetch', (evt) => {
  console.log('Fetch event for ', evt.request.url);

  if (evt.request.url.includes('/styles.')) {
    // Cache CSS files
    evt.respondWith(
      caches.open(CACHE_STATIC_NAME)
        .then(cache => {
          return cache.match(evt.request)
            .then(response => {
              return response || fetch(evt.request)
                .then(response => {
                  cache.put(evt.request, response.clone());
                  return response;
                });
            });
        })
    );
  } else {
    // Cache other assets
    evt.respondWith(
      caches.match(evt.request)
        .then(cacheRes => {
          return cacheRes || fetch(evt.request)
            .then(fetchRes => {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(evt.request.url, fetchRes.clone());
                  return fetchRes;
                })
            });
        })
    );
  }
});

registerRoute();
