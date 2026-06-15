'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BillRow, type BillRowProps } from './BillRow'

type SortableBillRowProps = Omit<
  BillRowProps,
  'sortable' | 'dragAttributes' | 'dragListeners' | 'isDragging'
> & {
  showInsertionLine?: boolean
  insertionLineAfter?: boolean
  /** Called once when a drag begins — used to clear any active column sort. */
  onDragStart?: () => void
}

export function SortableBillRow({ onDragStart, ...props }: SortableBillRowProps) {
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
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
