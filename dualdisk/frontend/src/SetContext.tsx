import { useState, type ReactNode } from 'react'
import { SetContext } from './set-context'

export function SetProvider({ children }: { children: ReactNode }) {
  const [set, setSet] = useState('')
  return <SetContext.Provider value={{ set, setSet }}>{children}</SetContext.Provider>
}
