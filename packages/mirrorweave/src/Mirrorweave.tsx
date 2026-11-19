import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { HomeContext } from './lib/home'
import './styles.css'

/** Mounts the app under `basename`; client-only, since BrowserRouter needs `window`. */
export function Mirrorweave({ basename = '/', home }: { basename?: string; home?: string }) {
  return (
    <BrowserRouter basename={basename}>
      <HomeContext.Provider value={home ?? null}>
        <App />
      </HomeContext.Provider>
    </BrowserRouter>
  )
}
