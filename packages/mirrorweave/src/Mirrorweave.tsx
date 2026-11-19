import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import rawPairs from './data/pairs.json'
import { HomeContext } from './lib/home'
import { imageUrls, startOffline } from './lib/offline'
import './styles.css'

/** Service worker that makes the app + every card image work offline (see site/public/mirrorweave-sw.js). */
export type OfflineConfig = { sw: string; scope: string }

/** Mounts the app under `basename`; client-only, since BrowserRouter needs `window`. */
export function Mirrorweave({ basename = '/', home, offline }: { basename?: string; home?: string; offline?: OfflineConfig }) {
  useEffect(() => {
    if (!offline) return
    const urls = imageUrls(rawPairs.flatMap((p) => [p.day, p.night]))
    void startOffline({ ...offline, urls })
  }, [offline])
  return (
    <BrowserRouter basename={basename}>
      <HomeContext.Provider value={home ?? null}>
        <App />
      </HomeContext.Provider>
    </BrowserRouter>
  )
}
