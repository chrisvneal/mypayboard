const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Coalesces rapid calls sharing the same key into a single trailing-edge invocation. */
export function debounceWrite(key: string, fn: () => void, delayMs = 500): void {
  const existing = timers.get(key)
  if (existing) clearTimeout(existing)
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      fn()
    }, delayMs)
  )
}
