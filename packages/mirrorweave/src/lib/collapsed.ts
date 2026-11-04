/**
 * Which sections are folded away. Persisted so a section you have finished with
 * stays shut across reloads and across the three views.
 */
const KEY = 'mirrorweave:collapsed:v1'
const LEGACY_KEY = 'lorwyn-after-dark:collapsed:v1'  // pre-rename; read once so progress survives

export type CollapsedMap = Readonly<Record<string, true>>

function load(): CollapsedMap {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    return raw ? (JSON.parse(raw) as CollapsedMap) ?? {} : {}
  } catch {
    return {}
  }
}

let state: CollapsedMap = load()
const listeners = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* not fatal */ }
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const getSnapshot = (): CollapsedMap => state

export function toggleCollapsed(id: string) {
  const next: Record<string, true> = { ...state }
  if (next[id]) delete next[id]
  else next[id] = true
  state = next
  persist()
  listeners.forEach((fn) => fn())
}

export function setAllCollapsed(ids: readonly string[], on: boolean) {
  const next: Record<string, true> = { ...state }
  for (const id of ids) {
    if (on) next[id] = true
    else delete next[id]
  }
  state = next
  persist()
  listeners.forEach((fn) => fn())
}
