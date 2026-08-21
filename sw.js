// ════════════════════════════════════════════════════════════════════════════
// ISE Driver App v3.0 — Service Worker
// Cache-first for app shell, network-pass for GAS API
// ════════════════════════════════════════════════════════════════════════════

var CACHE = 'ise-driver-v3-1';
var STATIC = [
  './',
  './index.html',
  './appconfig.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install — precache app shell
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC).catch(function(err) {
        console.warn('[SW] Precache partial fail:', err);
      });
    })
  );
});

// Activate — delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch — never cache GAS API calls
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // NEVER cache GAS / Google API
  if (url.indexOf('script.google.com') >= 0 ||
      url.indexOf('googleapis.com') >= 0 ||
      url.indexOf('macros/s/') >= 0) {
    return; // pass through to network
  }

  // Navigation (HTML pages): network first, cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).catch(function() {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Static CDN assets: cache first, background update
  if (url.indexOf('cdnjs') >= 0 || url.indexOf('jsdelivr') >= 0 ||
      url.indexOf('fonts.g') >= 0 || url.indexOf('fonts.googleapis') >= 0) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        var fetchPromise = fetch(e.request).then(function(res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return res;
        }).catch(function() { return cached; });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // App shell files: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
