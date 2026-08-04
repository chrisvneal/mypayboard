'use client'

import { useEffect, useEffectEvent, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Keeps keyboard focus inside a modal dialog and restores it when the dialog closes. */
export function useDialogAccessibility(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  const closeDialog = useEffectEvent(() => onClose())

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const dialog = dialogRef.current
    if (!dialog) return
    const activeDialog = dialog

    const focusable = () => Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')

    requestAnimationFrame(() => {
      const target = activeDialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? focusable()[0] ?? activeDialog
      target.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        activeDialog.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => previouslyFocused?.focus())
    }
  }, [dialogRef, open])
}
