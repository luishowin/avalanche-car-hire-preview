// Keep the offline cache limited to this public fallback. Private requests always use the network.
const prefix = 'avalanche-offline:'+self.registration.scope+':';
const cacheName = prefix+'v1';
const offline = new URL('offline/',self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.add(offline))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys =>
  Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && event.request.method === 'GET') {
    event.respondWith(fetch(event.request).catch(() => caches.match(offline)));
  }
});
