import { useEffect, useState } from 'react'

export interface ToastMessage {
  id: number
  html: string
  ok: boolean
}

export function ToastItem({ toast }: { toast: ToastMessage }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`toast ${toast.ok ? 'ok' : 'err'}`}
      style={{ opacity: fading ? 0 : 1 }}
      dangerouslySetInnerHTML={{ __html: toast.html }}
    />
  )
}
