/**
 * Full-page overlay while navigating from create-template modal to the editor.
 * If flash persists after prefetch + overlay, investigate Next.js route transition
 * timing (e.g. shared layout re-render) — overlay masking is the ceiling for this pass.
 */

const CLEAR_EVENT = 'mypayboard:clear-route-overlay'

export function clearRouteTransitionOverlay(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CLEAR_EVENT))
}

export function subscribeRouteTransitionOverlayClear(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CLEAR_EVENT, listener)
  return () => window.removeEventListener(CLEAR_EVENT, listener)
}
