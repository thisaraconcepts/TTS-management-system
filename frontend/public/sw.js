/* TTS Portal service worker: makes the portal installable and keeps the app
   shell available on a poor connection. API data is never cached. */
const VERSION = 'tts-v1'
const SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/images/tts-crest.jpg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const isBypassed = (url) =>
  url.origin !== self.location.origin ||
  url.pathname.startsWith('/api') ||
  url.pathname.startsWith('/static') ||
  url.pathname.startsWith('/docs') ||
  url.pathname === '/sw.js'

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (isBypassed(url)) return

  // Pages: always try the network first so users get the latest build
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copy)) }
          return res
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/offline.html')))
    )
    return
  }

  // Hashed build assets never change: cache first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)) }
        return res
      }))
    )
    return
  }

  // Images and icons: serve cached copy, refresh in the background
  if (/^\/(images|icons)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)) }
          return res
        }).catch(() => hit)
        return hit || net
      })
    )
  }
})
