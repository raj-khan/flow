/**
 * The source of /sw.js, written by the build with the files of that build, so
 * the app opens with no connection. Hand rolled: the app shell is a short list,
 * and a generator would be a large dependency for it.
 *
 * - A page is fetched from the network first, so a deploy shows at once; with
 *   no network, the cached page, or the app for any of its routes.
 * - Everything else of our own comes from the cache first: built files have
 *   hashed names, so a cached one is never stale.
 * - Other origins (the hosted-links server, analytics) are left to the network.
 *
 * @param {string} version changes whenever the files do
 * @param {string[]} files the shell, as paths from the root
 * @returns {string}
 */
export function serviceWorkerSource(version, files) {
  return `// isketch service worker, build ${version}. Written by the build; do not edit.
const CACHE = ${JSON.stringify(`isketch-${version}`)}
const SHELL = ${JSON.stringify(files)}
const APP = '/index.html'
// A module import sends Origin and the install did not; the names are hashed, so Vary is moot.
const MATCH = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE)
        const page = url.pathname === '/' ? '/landing.html' : url.pathname
        return (
          (await cache.match(page, MATCH)) ?? (await cache.match(APP, MATCH)) ?? Response.error()
        )
      }),
    )
    return
  }

  event.respondWith(
    caches.match(request, MATCH).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
`
}

/** Files from public/ that the app shell needs, beside the build's own. */
export const PUBLIC_SHELL = Object.freeze([
  '/landing.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/analytics.js',
])

/**
 * The shell for a build: its entry pages and hashed files, then the public
 * ones, without maps or duplicates.
 * @param {string[]} built file names from the bundle, relative to the root
 * @returns {string[]}
 */
export function shellFiles(built) {
  const own = built
    .filter((name) => !name.endsWith('.map') && name !== 'sw.js')
    .map((name) => `/${name}`)
  return [...new Set([...own, ...PUBLIC_SHELL])].sort()
}
