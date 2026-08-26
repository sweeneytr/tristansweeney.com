import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router'
import { PairLandsPanel } from './components/PairLandsPanel'
import { SearchPanel } from './components/SearchPanel'
import { SetCombobox } from './components/SetCombobox'
import { ToastItem, type ToastMessage } from './components/Toast'
import { SetProvider } from './SetContext'
import { useSet } from './useSet'

let nextToastId = 1

function NavSetFields() {
  const { set, setSet, set2, setSet2 } = useSet()
  return (
    <div className="nav-sets">
      <div className="field set">
        <label>Set</label>
        <SetCombobox value={set} onChange={setSet} placeholder="MH3" />
      </div>
      <div className="field set">
        <label>Back set</label>
        <SetCombobox value={set2} onChange={setSet2} placeholder="MH2" />
      </div>
    </div>
  )
}

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  function pushToast(html: string, ok: boolean) {
    const id = nextToastId++
    setToasts((t) => [...t, { id, html, ok }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5300)
  }

  return (
    <SetProvider>
      <header>
        <div className="brand">
          <h1>DualDisk</h1>
          <span className="subtitle">CubeCobra set builder</span>
        </div>
        <nav className="tabs">
          <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Search</NavLink>
          <NavLink to="/pair" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Pair Lands</NavLink>
        </nav>
        <NavSetFields />
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
    </SetProvider>
  )
}
