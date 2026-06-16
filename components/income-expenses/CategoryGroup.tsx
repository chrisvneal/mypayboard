'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type CategoryGroupProps = {
  title: string
  count: number
  total: number
  totalTone?: 'navy' | 'green'
  countLabel?: string
  secondaryCountLabel?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
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
  secondaryCountLabel,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  bulkOpenSignal,
  children,
}: CategoryGroupProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen

  useEffect(() => {
    if (controlledOpen !== undefined) return
    if (!bulkOpenSignal || bulkOpenSignal.id === 0) return
    queueMicrotask(() => setInternalOpen(bulkOpenSignal.open))
  }, [bulkOpenSignal, controlledOpen])

  const toggleOpen = () => {
    const nextOpen = !open
    if (controlledOpen !== undefined) {
      onOpenChange?.(nextOpen)
      return
    }
    setInternalOpen(nextOpen)
  }

  return (
    <section className="overflow-hidden rounded-t-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
      <div
        role="button"
        tabIndex={0}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          toggleOpen()
        }}
        onKeyDown={e => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          e.stopPropagation()
          toggleOpen()
        }}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition duration-200 ease-out hover:bg-(--bg-secondary)',
          open && 'bg-(--navy-light) hover:bg-(--navy-light)'
        )}
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
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[12px] text-(--text-tertiary)',
                  open && 'font-medium text-(--text-secondary)'
                )}
              >
                {count} {count === 1 ? countLabel.replace(/s$/, '') : countLabel}
              </span>
              {secondaryCountLabel && (
                <>
                  <span
                    className={cn(
                      'size-1 rounded-full bg-(--text-tertiary)',
                      open && 'bg-(--text-secondary)'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'text-[12px] text-(--text-tertiary)',
                      open && 'font-medium text-(--text-secondary)'
                    )}
                  >
                    {secondaryCountLabel}
                  </span>
                </>
              )}
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
      </div>
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
