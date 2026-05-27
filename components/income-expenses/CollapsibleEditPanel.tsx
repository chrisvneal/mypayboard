'use client'

import type { ReactNode } from 'react'
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
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-in-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
