import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const KEY = 'mirrorweave-theme'
const ORDER: Theme[] = ['system', 'light', 'dark']
const LABEL: Record<Theme, string> = { system: '◐ System', light: '☀ Light', dark: '☾ Dark' }

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return 'system'
}

function apply(t: Theme) {
  const el = document.documentElement
  if (t === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => { apply(theme) }, [theme])
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  return (
    <button
      className="copybtn themebtn"
      type="button"
      title={`Theme: ${theme} (click for ${next})`}
      onClick={() => {
        try { next === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, next) } catch {}
        setTheme(next)
      }}
    >
      {LABEL[theme]}
    </button>
  )
}
