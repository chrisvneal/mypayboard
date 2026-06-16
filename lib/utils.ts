import { useEffect, useState, useSyncExternalStore } from 'react'
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

/**
 * Returns true when the viewport is narrower than `breakpoint` pixels.
 * Defaults to 768px (Tailwind `md`). Updates on resize.
 * Safe to call during SSR — returns false until mounted.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}
