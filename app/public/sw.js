// Caché sencilla para que la app abra sin señal.
const CACHE = 'juntos-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.add('./')))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((llaves) =>
      Promise.all(llaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return

  e.respondWith(
    caches.match(req).then((guardada) => {
      const red = fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copia))
          return res
        })
        .catch(() => guardada || caches.match('./'))
      return guardada || red
    })
  )
})
