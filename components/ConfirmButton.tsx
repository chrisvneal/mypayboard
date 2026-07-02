'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ConfirmButtonProps = {
  label: string
  confirmLabel: string
  onConfirm: () => void
  icon?: ReactNode
  confirmIcon?: ReactNode
  className?: string
  title?: string
  'aria-label'?: string
}

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  icon,
  confirmIcon,
  className,
  title,
  'aria-label': ariaLabel,
}: ConfirmButtonProps) {
  const [pending, setPending] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pending) return

    function handlePointerDown(e: PointerEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return
      setPending(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [pending])

  useEffect(() => {
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  }, [])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-input p-1 text-(--text-tertiary) transition-colors duration-150 hover:text-(--text-primary) xl:min-h-0 xl:min-w-0',
        pending && 'text-(--navy)',
        className
      )}
      title={pending ? confirmLabel : title ?? label}
      aria-label={pending ? confirmLabel : ariaLabel ?? label}
      onPointerDown={e => e.stopPropagation()}
      onPointerEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }}
      onPointerLeave={() => { leaveTimer.current = setTimeout(() => setPending(false), 600) }}
      onClick={e => {
        e.stopPropagation()
        if (!pending) {
          setPending(true)
          return
        }
        onConfirm()
        setPending(false)
      }}
    >
      {pending ? (confirmIcon ?? icon) : icon}
    </button>
  )
}
