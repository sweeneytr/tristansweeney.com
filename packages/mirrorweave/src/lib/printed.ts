/**
 * "I printed this" state, persisted per viewer in localStorage.
 * Kept in a tiny external store so every view of the same pair stays in sync
 * without threading props through the tree.
 */
const KEY = 'mirrorweave:printed:v1'
const LEGACY_KEY = 'lorwyn-after-dark:printed:v1'  // pre-rename; read once so progress survives

export type PrintedMap = Readonly<Record<string, true>>

function load(): PrintedMap {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    return raw ? (JSON.parse(raw) as PrintedMap) ?? {} : {}
  } catch {
    return {} // private windows, blocked site data, thumbnailers
  }
}

let state: PrintedMap = load()
const listeners = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* not fatal */ }
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export const getSnapshot = (): PrintedMap => state

/** Mark or unmark any number of pairs at once. */
export function setPrinted(keys: readonly string[], on: boolean) {
  const next: Record<string, true> = { ...state }
  for (const k of keys) {
    if (on) next[k] = true
    else delete next[k]
  }
  state = next
  persist()
  listeners.forEach((fn) => fn())
}
