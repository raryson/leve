const CACHE = 'leve-v9';
const PRECACHE = /* BUILD_ASSETS */ [];
const PUBLIC_PAGES = ['/privacy/', '/support/', '/delete-account/', '/terms/'];
const SHELL = ['/', ...PUBLIC_PAGES, '/legal.css', '/legal.js', '/manifest.webmanifest', '/manifest.en.webmanifest', '/icon.svg', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/favicon.ico', '/favicon-16.png', '/favicon-32.png', '/favicon-48.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...SHELL, ...PRECACHE])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('leve-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    const page = PUBLIC_PAGES.find(path => url.pathname === path || url.pathname === path.slice(0, -1) || url.pathname === path + 'index.html');
    // Only the app entry point may replace the root shell. Legal/help documents
    // have their own cache keys and offline fallbacks.
    const cacheKey = page || (url.pathname === '/' || url.pathname === '/index.html' ? '/' : null);
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok && cacheKey) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(cacheKey, copy)));
      }
      return response;
    }).catch(() => caches.match(page || '/').then(response => response || Response.error())));
    return;
  }
  if (!PRECACHE.includes(url.pathname) && !SHELL.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  })));
});
