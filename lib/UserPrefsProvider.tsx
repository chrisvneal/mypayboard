'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useUserPrefsStore } from '@/lib/userPrefs'

type UserPrefsContextValue = ReturnType<typeof useUserPrefsStore>

const UserPrefsContext = createContext<UserPrefsContextValue | null>(null)

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const value = useUserPrefsStore()
  return <UserPrefsContext.Provider value={value}>{children}</UserPrefsContext.Provider>
}

export function useUserPrefs(): UserPrefsContextValue {
  const value = useContext(UserPrefsContext)
  if (value === null) {
    throw new Error('useUserPrefs must be used within UserPrefsProvider')
  }
  return value
}
