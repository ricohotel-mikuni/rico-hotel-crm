// Intentionally does NOT cache anything. This is a live, frequently-updated
// business app — a caching service worker risks serving stale screens/data
// after a deploy. Its only job is to exist, so the app satisfies PWA
// installability checks (Chrome/Android) and can run standalone from the
// iOS/Android home screen. All requests just pass straight through to the
// network.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // no-op: let the browser handle the request normally
})
