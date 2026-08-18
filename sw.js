// ISE Driver App — Service Worker
// Version bump when files change: v2.0.0
var CACHE_NAME = 'ise-driver-app-v2.1';
var SHELL = [
  './',
  './index.html',
  './appconfig.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Always pass through GAS + Google API calls (dynamic data)
  if (url.indexOf('script.google.com') >= 0 ||
      url.indexOf('googleapis.com') >= 0 ||
      url.indexOf('google.com/macros') >= 0) {
    return; // let network handle it
  }
  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache new files
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback: serve index.html
        return caches.match('./index.html');
      });
    })
  );
});
