const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingFns = new Map<string, () => void>()

/**
 * Fires every still-pending debounced write immediately, in place of
 * whatever remained of its delay. Wired to beforeunload/pagehide below so a
 * write scheduled right before the user reloads/navigates away doesn't get
 * silently destroyed along with its setTimeout — confirmed bug: completing
 * the onboarding tour and immediately reloading lost the tourCompletedAt
 * write with no error, since the 500ms timer never got the chance to fire.
 */
function flushPendingWrites(): void {
  for (const [key, timer] of timers) {
    clearTimeout(timer)
    const fn = pendingFns.get(key)
    pendingFns.delete(key)
    fn?.()
  }
  timers.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingWrites)
  // pagehide fires more reliably than beforeunload on mobile Safari and for
  // tab close/backgrounding — both are registered since neither alone is
  // consistent across browsers.
  window.addEventListener('pagehide', flushPendingWrites)
}

/** Coalesces rapid calls sharing the same key into a single trailing-edge invocation. */
export function debounceWrite(key: string, fn: () => void, delayMs = 500): void {
  const existing = timers.get(key)
  if (existing) clearTimeout(existing)
  pendingFns.set(key, fn)
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      pendingFns.delete(key)
      fn()
    }, delayMs)
  )
}
