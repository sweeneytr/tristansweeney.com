import { artUrl, symbolUrl } from './scryfall'

/** The bits of a card face needed to work out which remote images it uses. */
export type FaceLike = { id: string; cost: string; oracle: string }

const codes = (text: string) => Array.from(text.matchAll(/\{([^}]+)\}/g), (m) => m[1])

/** Every remote image the splash/app can show: mana symbols first (tiny), then card art. */
export function imageUrls(faces: FaceLike[]): string[] {
  const symbols = new Set<string>()
  const art = new Set<string>()
  for (const f of faces) {
    art.add(artUrl(f.id))
    for (const c of [...codes(f.cost), ...codes(f.oracle)]) symbols.add(symbolUrl(c))
  }
  return [...symbols, ...art]
}

const loaded = () =>
  document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((r) => addEventListener('load', () => r(), { once: true }))

/** Fetch `urls` a few at a time, low priority. Through the service worker each response also lands in the offline cache. */
async function warm(urls: string[], concurrency: number) {
  let next = 0
  const worker = async () => {
    while (next < urls.length) {
      if (!navigator.onLine) return
      const url = urls[next++]
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit', priority: 'low' } as RequestInit)
        await res.arrayBuffer().catch(() => undefined) // drain so the worker's cache.put completes
      } catch {
        /* offline / blocked: the next visit will try again */
      }
      await new Promise((r) => setTimeout(r, 25))
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
}

/**
 * Register the offline service worker, then quietly warm every image in `urls` after the page has loaded.
 * Safe to call from any page: it respects Data Saver and does nothing off the browser.
 */
export async function startOffline({ sw, scope, urls, concurrency = 3 }: { sw: string; scope: string; urls: string[]; concurrency?: number }) {
  if (typeof window === 'undefined') return
  await loaded()
  const sws = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
  if (sws) {
    try {
      await sws.register(sw, { scope })
      await sws.ready
      // the worker claims this page on activation; give it a moment so the warm-up fetches go through it
      if (!sws.controller) await new Promise<void>((r) => { sws.addEventListener('controllerchange', () => r(), { once: true }); setTimeout(r, 1500) })
    } catch (e) {
      console.warn('mirrorweave: offline worker unavailable', e)
    }
  }
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  await new Promise<void>((r) => (idle ? idle(() => r()) : setTimeout(r, 1500)))
  await warm(urls, concurrency)
}
