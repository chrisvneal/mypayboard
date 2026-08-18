'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

type ArchiveClearAllButtonProps = {
  count: number
  /** Singular noun for the item type, e.g. "bill", "income source", "board". */
  itemLabel: string
  onConfirm: () => void
}

export function ArchiveClearAllButton({ count, itemLabel, onConfirm }: ArchiveClearAllButtonProps) {
  const [pending, setPending] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pending) return

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return
      setPending(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [pending])

  if (count === 0) return null

  const countLabel = `${count} ${itemLabel}${count === 1 ? '' : 's'}`

  return (
    <div ref={rootRef} className="flex items-center gap-3">
      {pending ? (
        <>
          <span className="text-[12px] font-medium text-(--text-secondary)">
            Permanently delete {countLabel}?
          </span>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              setPending(false)
            }}
            className="cursor-pointer text-[12px] font-semibold text-(--danger) transition duration-200 ease-out hover:opacity-80"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setPending(false)}
            className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setPending(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--danger)"
        >
          <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Delete All
        </button>
      )}
    </div>
  )
}
