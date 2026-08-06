import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * Tracks which single panel (by id) is open across all instances sharing a
 * store — opening one closes any other that was open. Backed by a plain
 * module-scoped store (not React context) so unrelated component trees
 * (e.g. board vs. template editor) can share exclusivity without prop
 * drilling.
 */
function createExclusivePanelStore() {
  let openId: string | null = null
  const listeners = new Set<() => void>()

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      return openId
    },
    open(id: string) {
      if (openId === id) return
      openId = id
      listeners.forEach(listener => listener())
    },
    close(id: string) {
      if (openId !== id) return
      openId = null
      listeners.forEach(listener => listener())
    },
  }
}

const moduleHeaderEditorStore = createExclusivePanelStore()

const getServerSnapshot = () => null

/** Exclusive-open state for pay date card header edit panels — opening one closes any other. */
export function useExclusiveHeaderEditor(cardId: string): [boolean, (open: boolean) => void] {
  const openId = useSyncExternalStore(
    moduleHeaderEditorStore.subscribe,
    moduleHeaderEditorStore.getSnapshot,
    getServerSnapshot
  )
  const isOpen = openId === cardId
  const setOpen = useCallback(
    (open: boolean) => {
      if (open) moduleHeaderEditorStore.open(cardId)
      else moduleHeaderEditorStore.close(cardId)
    },
    [cardId]
  )

  // If this card unmounts (e.g. board navigation) while its editor is open,
  // release the store slot instead of leaving it "open" for a future remount.
  useEffect(() => {
    return () => moduleHeaderEditorStore.close(cardId)
  }, [cardId])

  return [isOpen, setOpen]
}
