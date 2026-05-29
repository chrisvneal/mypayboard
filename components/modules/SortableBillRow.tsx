'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BillRow, type BillRowProps } from './BillRow'

type SortableBillRowProps = Omit<
  BillRowProps,
  'sortable' | 'dragAttributes' | 'dragListeners' | 'isDragging'
> & {
  showInsertionLine?: boolean
  insertionLineAfter?: boolean
  /**
   * Suppress manual drag-reorder while a column sort is active. Otherwise a drag
   * writes a new bill order that the sorted view immediately re-sorts, so the row
   * appears to snap back. Clearing the sort restores hand-ordering.
   */
  dragDisabled?: boolean
}

export function SortableBillRow({ dragDisabled, ...props }: SortableBillRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.bill.id,
    data: {
      type: 'bill',
      moduleId: props.moduleId,
      billId: props.bill.id,
    },
    disabled: dragDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <BillRow
        {...props}
        sortable={!dragDisabled}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  )
}
