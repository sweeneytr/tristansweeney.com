import { useContext } from 'react'
import { SetContext } from './set-context'

export function useSet() {
  const ctx = useContext(SetContext)
  if (!ctx) throw new Error('useSet must be used within a SetProvider')
  return ctx
}
