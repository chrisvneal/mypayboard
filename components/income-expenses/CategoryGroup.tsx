'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type CategoryGroupProps = {
  title: string
  count: number
  total: number
  totalTone?: 'navy' | 'green'
  countLabel?: string
  defaultOpen?: boolean
  bulkOpenSignal?: {
    id: number
    open: boolean
  }
  children: ReactNode
}

export function CategoryGroup({
  title,
  count,
  total,
  totalTone = 'navy',
  countLabel = 'bills',
  defaultOpen = true,
  bulkOpenSignal,
  children,
}: CategoryGroupProps) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!bulkOpenSignal || bulkOpenSignal.id === 0) return
    queueMicrotask(() => setOpen(bulkOpenSignal.open))
  }, [bulkOpenSignal])

  return (
    <section className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition duration-200 ease-out hover:bg-(--bg-secondary)"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-(--text-tertiary) transition-transform duration-200 ease-out',
            open && 'rotate-90'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="truncate text-[14px] font-semibold text-(--text-primary)">{title}</h3>
            <span className="text-[11px] text-(--text-tertiary)">
              {count} {count === 1 ? countLabel.replace(/s$/, '') : countLabel}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'shrink-0 text-right text-[14px] font-semibold tabular-nums text-(--text-primary)',
            totalTone === 'green' && 'text-(--green)'
          )}
        >
          {totalTone === 'green' ? '+' : ''}
          {formatCurrency(total)}
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[--module-divider-color]">{children}</div>
        </div>
      </div>
    </section>
  )
}
