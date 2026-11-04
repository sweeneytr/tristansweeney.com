import { useCallback, useRef, useState } from 'react'

type State = 'idle' | 'ok' | 'err'

/** Copies Proxxied import lines. Clipboard API with an execCommand fallback. */
export function CopyButton({ lines, label }: { lines: string[]; label?: string }) {
  const [state, setState] = useState<State>('idle')
  const timer = useRef<number | undefined>(undefined)

  const copy = useCallback(async () => {
    const text = lines.join('\n')
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { ok = document.execCommand('copy') } catch { ok = false }
      document.body.removeChild(ta)
    }
    setState(ok ? 'ok' : 'err')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2200)
  }, [lines])

  return (
    <button className="copybtn" type="button" onClick={copy} data-state={state === 'idle' ? undefined : state}>
      {state === 'ok' ? `Copied ${lines.length} lines`
        : state === 'err' ? 'Copy failed'
        : (label ?? `Copy ${lines.length} for Proxxied`)}
    </button>
  )
}
