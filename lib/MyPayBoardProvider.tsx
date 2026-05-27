'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useMyPayBoardStore, type MyPayBoardContextValue } from '@/lib/useMyPayBoard'

const MyPayBoardContext = createContext<MyPayBoardContextValue | null>(null)

export function MyPayBoardProvider({ children }: { children: ReactNode }) {
  const value = useMyPayBoardStore()
  return <MyPayBoardContext.Provider value={value}>{children}</MyPayBoardContext.Provider>
}

export function useMyPayBoard(): MyPayBoardContextValue {
  const value = useContext(MyPayBoardContext)
  if (value === null) {
    throw new Error('useMyPayBoard must be used within MyPayBoardProvider')
  }
  return value
}
