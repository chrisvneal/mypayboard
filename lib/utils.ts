import { useEffect, useState, useSyncExternalStore } from 'react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ignore outside-click when the target is a portaled overlay used inside inline edit forms. */
export function isPortaledEditOverlayTarget(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null
  if (!el?.closest) return false
  if (el.closest('[data-icon-picker]')) return true
  if (el.closest('[data-slot="select-content"]')) return true
  if (el.closest('[data-slot="dropdown-menu-content"]')) return true
  if (el.closest('[data-slot="popover-content"]')) return true
  // Dismiss-outside clicks land outside the portal while the select is still open.
  if (document.querySelector('[data-slot="select-content"][data-state="open"]')) return true
  return false
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
