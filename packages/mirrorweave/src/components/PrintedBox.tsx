import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getSnapshot, setPrinted, subscribe } from '../lib/printed'

export const usePrinted = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** Single pair: printed or not. */
export function PrintedBox({ pairKey }: { pairKey: string }) {
  const printed = usePrinted()
  return (
    <label className="printed" title="Mark this pair as printed">
      <input
        type="checkbox"
        checked={!!printed[pairKey]}
        onChange={(e) => setPrinted([pairKey], e.target.checked)}
      />
      <span>Printed</span>
    </label>
  )
}

/** Section header: checks every pair in the section, indeterminate when partial. */
export function PrintedSectionBox({ keys }: { keys: readonly string[] }) {
  const printed = usePrinted()
  const done = keys.filter((k) => printed[k]).length
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = done > 0 && done < keys.length
  }, [done, keys.length])

  return (
    <label className="printed sec-print" title="Mark every pair in this section as printed">
      <input
        ref={ref}
        type="checkbox"
        checked={keys.length > 0 && done === keys.length}
        onChange={(e) => setPrinted(keys, e.target.checked)}
      />
      <span>Printed <b className="print-count">{done}/{keys.length}</b></span>
    </label>
  )
}

/** Clears every printed mark. Two-step, because it throws away tracked progress. */
export function ClearPrintedButton({ keys }: { keys: readonly string[] }) {
  const printed = usePrinted()
  const done = keys.filter((k) => printed[k]).length
  const [armed, setArmed] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (done === 0) return null

  return (
    <button
      className="copybtn"
      type="button"
      data-state={armed ? 'err' : undefined}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setArmed(false), 3000)
          return
        }
        window.clearTimeout(timer.current)
        setArmed(false)
        setPrinted(keys, false)
      }}
    >
      {armed ? `Clear ${done}? Click again` : 'Clear printed'}
    </button>
  )
}
