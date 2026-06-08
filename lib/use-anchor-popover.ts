import { useLayoutEffect, useState } from 'react'

const GAP = 6

export type AnchorPopoverPosition = {
  top: number
  left: number
  width: number
}

type UseAnchorPopoverOptions = {
  estHeight?: number
  width?: number
}

export function useAnchorPopover(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  { estHeight = 320, width = 280 }: UseAnchorPopoverOptions = {}
) {
  const [position, setPosition] = useState<AnchorPopoverPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      let left = rect.left
      let top = rect.bottom + GAP

      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }
      if (top + estHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - estHeight - GAP)
      }

      setPosition({ top, left, width })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef, estHeight, open, width])

  return open ? position : null
}
