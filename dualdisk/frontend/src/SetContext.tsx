import { useState, type ReactNode } from 'react'
import { SetContext } from './set-context'

export function SetProvider({ children }: { children: ReactNode }) {
  const [set, setSet] = useState('')
  const [set2, setSet2] = useState('')
  return <SetContext.Provider value={{ set, setSet, set2, setSet2 }}>{children}</SetContext.Provider>
}
