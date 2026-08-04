// Service worker minimal pour rendre Mahu installable (PWA) : app-shell en
// cache pour un chargement instantane au retour, sans essayer de mettre en
// cache les reponses d'API (donnees toujours fraiches).
const CACHE_NAME = "mahu-shell-v1"
const APP_SHELL = ["/", "/dashboard", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  // Ne jamais mettre en cache les appels API - toujours des donnees fraiches.
  if (url.pathname.startsWith("/api/")) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
