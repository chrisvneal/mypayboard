'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useIsClient } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type AppModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  /** Top-aligned dialog — avoids vertical jump when content height changes. */
  align?: 'center' | 'top' | 'center-stable'
  /**
   * With center-stable: distance from viewport top to dialog top (half of collapsed height).
   * Keeps the top edge fixed so extra body content grows downward only.
   */
  centerAnchorOffset?: string
  /** Omit the body section when description + footer are enough. */
  hideBody?: boolean
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  align = 'center',
  centerAnchorOffset = '9.75rem',
  hideBody = false,
}: AppModalProps) {
  const mounted = useIsClient()

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center p-4',
        align === 'top'
          ? 'items-start pt-[10vh]'
          : align === 'center-stable'
            ? 'items-start justify-center'
            : 'items-center'
      )}
      style={
        align === 'center-stable'
          ? ({ paddingTop: `calc(50vh - ${centerAnchorOffset})` } satisfies CSSProperties)
          : undefined
      }
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        aria-describedby={description ? 'app-modal-description' : undefined}
        className={cn(
          'relative z-10 w-full max-w-md rounded-lg border border-border bg-(--bg-primary) shadow-(--shadow-lg)',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="app-modal-title"
              className="text-base font-semibold tracking-tight text-(--text-primary)"
            >
              {title}
            </h2>
            {description ? (
              <p
                id="app-modal-description"
                className="mt-1 text-[13px] leading-relaxed text-(--text-secondary)"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 xl:size-8 shrink-0 cursor-pointer items-center justify-center rounded-input text-(--text-tertiary) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {!hideBody && children ? <div className="px-5 py-4">{children}</div> : null}
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
