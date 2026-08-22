import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { PairLandsPanel } from './components/PairLandsPanel'
import { SearchPanel } from './components/SearchPanel'
import { ToastItem, type ToastMessage } from './components/Toast'

let nextToastId = 1

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  function pushToast(html: string, ok: boolean) {
    const id = nextToastId++
    setToasts((t) => [...t, { id, html, ok }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5300)
  }

  return (
    <>
      <header>
        <div className="brand">
          <h1>DualDisk</h1>
          <span className="subtitle">CubeCobra set builder</span>
        </div>
        <nav className="tabs">
          <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Search</NavLink>
          <NavLink to="/pair" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Pair Lands</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<SearchPanel pushToast={pushToast} />} />
          <Route path="/pair" element={<PairLandsPanel />} />
        </Routes>
      </main>

      <div className="toast-container">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
      </div>
    </>
  )
}
