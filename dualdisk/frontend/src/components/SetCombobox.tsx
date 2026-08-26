import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchSets } from '../api'
import type { SetInfo } from '../types'
import { SetIcon } from './SetIcon'

let setsCache: SetInfo[] | null = null
let setsPromise: Promise<SetInfo[]> | null = null

function loadSets(): Promise<SetInfo[]> {
  if (setsCache) return Promise.resolve(setsCache)
  setsPromise ??= fetchSets().then((sets) => {
    setsCache = sets
    return sets
  })
  return setsPromise
}

export function SetCombobox({ value, onChange, placeholder }: { value: string; onChange: (code: string) => void; placeholder?: string }) {
  const [sets, setSets] = useState<SetInfo[] | null>(setsCache)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!setsCache) loadSets().then(setSets)
  }, [])

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const query = value.trim().toLowerCase()

  const selected = useMemo(
    () => sets?.find((s) => s.code.toLowerCase() === query),
    [sets, query],
  )
  const invalid = sets !== null && query.length > 0 && !selected

  const suggestions = useMemo(() => {
    if (!sets || !query) return []
    return sets
      .filter((s) => s.code.toLowerCase().startsWith(query) || s.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.code.toLowerCase().startsWith(query)
        const bStarts = b.code.toLowerCase().startsWith(query)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [sets, query])

  function select(s: SetInfo) {
    onChange(s.code.toUpperCase())
    setOpen(false)
  }

  return (
    <div className={`set-combobox ${invalid ? 'invalid' : ''}`} ref={containerRef}>
      {selected && <SetIcon setCode={selected.code} />}
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'MH3'}
        spellCheck={false}
      />
      {open && suggestions.length > 0 && (
        <ul className="set-suggestions">
          {suggestions.map((s) => (
            <li key={s.code} onMouseDown={() => select(s)}>
              <SetIcon setCode={s.code} />
              <span className="code">{s.code.toUpperCase()}</span>
              <span className="name">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
