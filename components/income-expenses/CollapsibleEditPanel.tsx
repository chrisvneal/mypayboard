'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CollapsibleEditPanelProps = {
  open: boolean
  children: ReactNode
  className?: string
}

/**
 * Smooth expand/collapse for inline edit forms. Keeps children mounted until
 * the close transition finishes (avoids max-height snap / column jump).
 */
export function CollapsibleEditPanel({ open, children, className }: CollapsibleEditPanelProps) {
  const [keepMounted, setKeepMounted] = useState(open)

  useEffect(() => {
    if (open) setKeepMounted(true)
  }, [open])

  const showChildren = open || keepMounted

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-200 ease-in-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
      onTransitionEnd={event => {
        if (event.propertyName !== 'grid-template-rows') return
        if (!open) setKeepMounted(false)
      }}
    >
      <div className="min-h-0 overflow-hidden">{showChildren ? children : null}</div>
    </div>
  )
}
