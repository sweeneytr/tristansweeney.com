import { createContext } from 'react'

export interface SetContextValue {
  set: string
  setSet: (set: string) => void
  set2: string
  setSet2: (set: string) => void
}

export const SetContext = createContext<SetContextValue | null>(null)
