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

/**
 * Swallows the single native `click` event that's already guaranteed to follow
 * the current pointerdown/pointerup pair, before it reaches its target.
 *
 * Any handler that opens new interactive content (e.g. a modal/sheet) in
 * response to `pointerup`/`pointerdown` — rather than `click` — still has a
 * browser-generated `click` event coming right behind it, for both real mouse
 * clicks and touch. If that handler swaps out the DOM the click's original
 * target lived in, the browser re-targets the click by hit-testing the *new*
 * DOM at the same screen coordinates instead of dropping it. Landing on a
 * freshly-mounted `<select>`/`<input>` there opens/focuses it unintentionally
 * — this looks like random per-instance state leakage, but it's a stray click
 * on new content. Call this in the same handler that swaps the DOM, before
 * the click has a chance to fire; it intercepts (capture phase, before any
 * target-specific listener) and discards exactly one click, then removes itself.
 */
export function suppressNextClick(): void {
  const handler = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }
  document.addEventListener('click', handler, { capture: true, once: true })
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
