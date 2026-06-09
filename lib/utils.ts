import { useSyncExternalStore } from 'react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safe message extraction for catch blocks — handles non-Error throws. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** True after client hydration — safe for createPortal without an effect. */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
