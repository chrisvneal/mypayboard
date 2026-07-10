'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { scrollExpandedFormWhenOpen } from '@/lib/pay-date-card-form-scroll'
import { cn } from '@/lib/utils'

type CollapsibleEditPanelProps = {
  open: boolean
  children: ReactNode
  className?: string
}

/**
 * Smooth expand/collapse for inline edit forms. Content stays mounted so close
 * transitions do not snap and internal form state is preserved.
 */
export function CollapsibleEditPanel({ open, children, className }: CollapsibleEditPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    return scrollExpandedFormWhenOpen(() => contentRef.current)
  }, [open])

  return (
    <div
      data-bills-income-edit-panel
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-in-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
    >
      <div ref={contentRef} className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
