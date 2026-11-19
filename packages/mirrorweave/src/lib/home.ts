import { createContext, useContext } from 'react'

/** Where the wordmark links to (the splash page); null hides the link. */
export const HomeContext = createContext<string | null>(null)
export const useHome = () => useContext(HomeContext)
