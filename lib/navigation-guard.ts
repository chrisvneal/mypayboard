type NavigationBlocker = (onLeave: () => void) => void

let navigationBlocker: NavigationBlocker | null = null
let pendingLeave: (() => void) | null = null

export function setNavigationBlocker(blocker: NavigationBlocker | null) {
  navigationBlocker = blocker
  if (!blocker) pendingLeave = null
}

/** Run navigation now, or defer until the user confirms leaving. Returns false if deferred. */
export function tryNavigate(onLeave: () => void): boolean {
  if (!navigationBlocker) {
    onLeave()
    return true
  }
  pendingLeave = onLeave
  navigationBlocker(onLeave)
  return false
}

export function confirmPendingLeave() {
  const action = pendingLeave
  pendingLeave = null
  action?.()
}

export function cancelPendingLeave() {
  pendingLeave = null
}
