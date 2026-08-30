import { useEffect, useState, type ReactNode } from 'react'
import { SetContext } from './set-context'

const SET_STORAGE_KEY = 'dualdisk.nav.set'
const SET2_STORAGE_KEY = 'dualdisk.nav.set2'

export function SetProvider({ children }: { children: ReactNode }) {
  const [set, setSet] = useState(() => localStorage.getItem(SET_STORAGE_KEY) ?? '')
  const [set2, setSet2] = useState(() => localStorage.getItem(SET2_STORAGE_KEY) ?? '')

  useEffect(() => {
    localStorage.setItem(SET_STORAGE_KEY, set)
  }, [set])

  useEffect(() => {
    localStorage.setItem(SET2_STORAGE_KEY, set2)
  }, [set2])

  return <SetContext.Provider value={{ set, setSet, set2, setSet2 }}>{children}</SetContext.Provider>
}
