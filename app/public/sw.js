// Guarda la app para que abra sin señal, pero deja que se actualice sola.
const CACHE = 'juntos-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.add('./')))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((llaves) => Promise.all(llaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return

  // La página: primero la red, para que una versión nueva llegue al abrirla.
  // Sin señal, la guardada.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copia))
          return res
        })
        .catch(() => caches.match('./').then((r) => r || caches.match(req)))
    )
    return
  }

  // Lo demás lleva su versión en el nombre del archivo: de la caché sin dudar,
  // y se guarda lo que aún no esté.
  e.respondWith(
    caches.match(req).then((guardada) =>
      guardada ||
      fetch(req).then((res) => {
        const copia = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copia))
        return res
      })
    )
  )
})
