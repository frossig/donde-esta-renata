const CACHE_NAME = 'donde-esta-renata-v1'
const SHELL_ASSETS = ['/', '/login']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
})

self.addEventListener('fetch', (event) => {
  // Cache-first for shell assets, network-first for everything else
  if (SHELL_ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  }
})
