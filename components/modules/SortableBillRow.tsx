'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { BillRow, type BillRowProps } from './BillRow'

type SortableBillRowProps = Omit<
  BillRowProps,
  'sortable' | 'dragAttributes' | 'dragListeners' | 'isDragging'
> & {
  showInsertionLine?: boolean
  insertionLineAfter?: boolean
  /** Called once when a drag begins — used to clear any active column sort. */
  onDragStart?: () => void
  /** True for one render pass right after this bill is added — plays a grow-in animation. */
  entering?: boolean
}

export function SortableBillRow({ onDragStart, entering, ...props }: SortableBillRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.bill.id,
    data: {
      type: 'bill',
      cardId: props.cardId,
      billId: props.bill.id,
    },
  })

  useEffect(() => {
    if (isDragging) onDragStart?.()
  }, [isDragging, onDragStart])

  // DnD transition is transform-only — paid text styling lives on BillRow and must not
  // share a wrapper transition that could delay color/font-style on reorder.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('min-w-0', entering && 'bill-row-entering')}
    >
      <BillRow
        {...props}
        sortable
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  )
}
