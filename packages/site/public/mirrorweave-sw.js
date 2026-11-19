/* Mirrorweave offline worker. Served from the site root so its scope can be "/mirrorweave" (covering the
   splash at /mirrorweave and the app at /mirrorweave/browse/...). Bump VERSION to drop every cache.

   - pages:       network-first (3.5s), falling back to the cached copy; app deep links share one cached shell
   - /_astro/*:   cache-first (hashed, immutable)
   - Scryfall art + mana symbols: cache-first, re-fetched as CORS so responses aren't opaque (opaque responses
                  count ~7MB each against storage quota)
   - Google Fonts: stale-while-revalidate */
const VERSION = 'v1'
const SHELL = `mw-shell-${VERSION}`
const STATIC = `mw-static-${VERSION}`
const IMAGES = `mw-img-${VERSION}`
const KEEP = [SHELL, STATIC, IMAGES]

const SPLASH = '/mirrorweave'
const BROWSE = '/mirrorweave/browse'
const IMG_HOSTS = new Set(['cards.scryfall.io', 'svgs.scryfall.io']) // both send access-control-allow-origin: *
const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])

/** Cache key for a navigation: every /mirrorweave/browse/... deep link is the same HTML shell. */
function pageKey(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p.startsWith(BROWSE) ? BROWSE : p
}

/* ---------- install: precache both pages and everything they load ---------- */

const decode = (s) => s.replace(/&amp;/g, '&')

/** Cache `url` (and, for JS/CSS, whatever it references) into STATIC. */
async function crawl(url, seen) {
  if (seen.has(url)) return
  seen.add(url)
  const u = new URL(url, self.location.origin)
  const cors = u.origin !== self.location.origin
  let res
  try { res = await fetch(u.href, cors ? { mode: 'cors', credentials: 'omit' } : { cache: 'reload' }) } catch { return }
  if (!res.ok) return
  const cache = await caches.open(STATIC)
  await cache.put(u.href, res.clone())
  const type = res.headers.get('content-type') || ''
  if (!/javascript|css/.test(type)) return
  const text = await res.text()
  const refs = new Set()
  for (const m of text.matchAll(/\/_astro\/[^"'`\s)\\]+/g)) refs.add(m[0])
  if (/javascript/.test(type)) for (const m of text.matchAll(/["'](\.{1,2}\/[^"'\s]+?\.(?:js|css))["']/g)) refs.add(new URL(m[1], u).pathname)
  if (/css/.test(type)) for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (!m[1].startsWith('data:')) refs.add(new URL(m[1], u).href)
  }
  await Promise.allSettled([...refs].map((r) => crawl(r, seen)))
}

async function precache() {
  const shell = await caches.open(SHELL)
  const seen = new Set()
  for (const page of [SPLASH, BROWSE]) {
    let res
    try { res = await fetch(page, { cache: 'reload' }) } catch { continue }
    if (!res.ok) continue
    await shell.put(page, res.clone())
    const html = await res.text()
    const refs = new Set()
    for (const m of html.matchAll(/\/_astro\/[^"'\s<>)\\]+/g)) refs.add(m[0])
    for (const m of html.matchAll(/https:\/\/fonts\.googleapis\.com\/css2[^"'\s<>]+/g)) refs.add(decode(m[0]))
    await Promise.allSettled([...refs].map((r) => crawl(r, seen)))
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mw-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/* ---------- fetch strategies ---------- */

async function navigate(req, url) {
  const cache = await caches.open(SHELL)
  const key = pageKey(url.pathname)
  const cached = await cache.match(key)
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(key, res.clone())
    return res
  })
  if (!cached) return network
  // flaky connection: don't make the user wait on a hung request when a cached copy exists
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), 3500))
  return Promise.race([network.catch(() => cached), timeout])
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req.url)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) cache.put(req.url, res.clone())
  return res
}

/** Cross-origin variant: fetch with CORS so the cached response is readable/not opaque.
    The symbol CDN only sends access-control-allow-origin when the request carries an Origin header, so a copy the
    browser's HTTP cache kept from an earlier plain <img> load fails the CORS check; retrying with cache: 'reload'
    goes back to the network (with Origin) and fixes that. */
async function cacheFirstCors(req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req.url)
  if (hit) return hit
  const attempt = (cacheMode) => fetch(req.url, { mode: 'cors', credentials: 'omit', cache: cacheMode })
  try {
    let res
    try { res = await attempt('default') } catch { res = await attempt('reload') }
    if (res.ok) cache.put(req.url, res.clone())
    return res
  } catch {
    return fetch(req) // CORS refused or network down: let the browser try normally (uncached)
  }
}

async function staleWhileRevalidate(event, name) {
  const req = event.request
  const cache = await caches.open(name)
  const hit = await cache.match(req.url)
  const refresh = fetch(req.url, { mode: 'cors', credentials: 'omit' })
    .then((res) => { if (res.ok) cache.put(req.url, res.clone()); return res })
    .catch(() => undefined)
  if (hit) { event.waitUntil(refresh); return hit }
  return (await refresh) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate') {
    if (url.origin === self.location.origin && pageKey(url.pathname).startsWith('/mirrorweave')) event.respondWith(navigate(req, url))
    return
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_astro/')) event.respondWith(cacheFirst(req, STATIC))
  } else if (IMG_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirstCors(req, IMAGES))
  } else if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, STATIC))
  }
})
