import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

/** Mounts the app under `basename`; client-only, since BrowserRouter needs `window`. */
export function Mirrorweave({ basename = '/' }: { basename?: string }) {
  return (
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  )
}
