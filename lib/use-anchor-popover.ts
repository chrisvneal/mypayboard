import { useLayoutEffect, useState, type RefObject } from 'react'

const GAP = 6
const VIEWPORT_MARGIN = 8

export type AnchorPopoverPosition = {
  top: number
  left: number
}

type UseAnchorPopoverOptions = {
  estHeight?: number
  estWidth?: number
}

function computePosition(
  anchor: HTMLElement,
  popover: HTMLElement | null,
  estHeight: number,
  estWidth: number
): AnchorPopoverPosition {
  const rect = anchor.getBoundingClientRect()
  const width = popover?.getBoundingClientRect().width || estWidth
  const height = popover?.getBoundingClientRect().height || estHeight

  let left = rect.left + rect.width / 2 - width / 2
  let top = rect.bottom + GAP

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN))
  if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, rect.top - height - GAP)
  }

  return { top, left }
}

export function useAnchorPopover(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  { estHeight = 320, estWidth = 280 }: UseAnchorPopoverOptions = {}
) {
  const [position, setPosition] = useState<AnchorPopoverPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      setPosition(computePosition(anchor, popoverRef.current, estHeight, estWidth))
    }

    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef, popoverRef, estHeight, estWidth, open])

  return open ? position : null
}
