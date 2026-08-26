import { createContext } from 'react'

export interface SetContextValue {
  set: string
  setSet: (set: string) => void
}

export const SetContext = createContext<SetContextValue | null>(null)
