'use client'

/**
 * Reserved for future column-move UI. boardColumn is still persisted on
 * PayDateCard / TemplatePayDateCard and used for board layout — this control
 * is not mounted until we wire move-column back into the product.
 */

import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { BoardColumn } from '@/lib/types'
import { cn } from '@/lib/utils'

type PayDateCardColumnControlsProps = {
  boardColumn: BoardColumn
  onColumnChange: (column: BoardColumn) => void
  /** Match header menu icon color on tinted headers */
  iconColor?: string
}

export function PayDateCardColumnControls({
  boardColumn,
  onColumnChange,
  iconColor,
}: PayDateCardColumnControlsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        'opacity-0 transition-opacity duration-150 ease-out group-hover/header:pointer-events-auto group-hover/header:opacity-100'
      )}
    >
      {boardColumn === 2 ? (
        <button
          type="button"
          title="Move to left column"
          aria-label="Move to left column"
          className="rounded-md p-1 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: iconColor }}
          onClick={e => {
            e.stopPropagation()
            onColumnChange(1)
          }}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
      ) : null}
      {boardColumn === 1 ? (
        <button
          type="button"
          title="Move to right column"
          aria-label="Move to right column"
          className="rounded-md p-1 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: iconColor }}
          onClick={e => {
            e.stopPropagation()
            onColumnChange(2)
          }}
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
