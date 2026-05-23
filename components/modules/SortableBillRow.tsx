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
}

export function SortableBillRow(props: SortableBillRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.bill.id,
    data: {
      type: 'bill',
      moduleId: props.moduleId,
      billId: props.bill.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
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
