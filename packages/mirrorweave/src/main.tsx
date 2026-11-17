import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Mirrorweave } from './Mirrorweave'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Mirrorweave />
  </StrictMode>,
)
