// Service worker minimal pour rendre Mahu installable (PWA) : app-shell en
// cache pour un chargement instantane au retour, sans essayer de mettre en
// cache les reponses d'API (donnees toujours fraiches).
const CACHE_NAME = "mahu-shell-v2"
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

  // Navigations (chargement d'une page HTML) : toujours le reseau en
  // premier. Cache-first sur une navigation servait une page perimee -
  // referencant les vieux chunks JS d'un build precedent - a chaque retour
  // sur le site apres un redeploiement, meme quand tout marchait cote
  // serveur. Le cache ne sert plus que de secours hors-ligne ici.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error())),
    )
    return
  }

  // Assets statiques (JS/CSS/images) : cache-first reste correct, leurs
  // noms de fichiers sont hashes par build donc jamais perimes.
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
        .catch(() => cached || Response.error())
      return cached || network
    }),
  )
})
