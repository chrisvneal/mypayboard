'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { schedulePortaledOverlayScroll } from '@/lib/pay-date-card-form-scroll'
import { cn } from '@/lib/utils'

function Select({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const releaseHeadroomRef = React.useRef<() => void>(() => {})

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      onOpenChange?.(open)
      if (!open) {
        releaseHeadroomRef.current()
        releaseHeadroomRef.current = () => {}
        return
      }
      releaseHeadroomRef.current = schedulePortaledOverlayScroll(
        () => {
          const trigger = document.querySelector(
            '[data-slot="select-trigger"][data-state="open"]'
          )
          return trigger instanceof HTMLElement ? trigger : null
        },
        () => {
          const content = document.querySelector(
            '[data-slot="select-content"][data-state="open"]'
          )
          return content instanceof HTMLElement ? content : null
        }
      )
    },
    [onOpenChange]
  )

  return <SelectPrimitive.Root data-slot="select" onOpenChange={handleOpenChange} {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'field-control flex h-9 w-full cursor-pointer items-center justify-between gap-2 border border-border px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none transition-colors hover:bg-(--bg-secondary) focus:border-(--navy) disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-(--text-tertiary)" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  side = 'bottom',
  sideOffset = 4,
  avoidCollisions = false,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const resetScroll = () => {
      viewport.scrollTop = 0
    }

    resetScroll()
    const frame = requestAnimationFrame(resetScroll)
    const timer = window.setTimeout(resetScroll, 0)
    const settleTimer = window.setTimeout(resetScroll, 32)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      window.clearTimeout(settleTimer)
    }
  }, [])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'z-70 overflow-hidden rounded-lg border border-border bg-(--bg-primary) text-(--text-primary) shadow-(--shadow-md)',
          'max-h-[var(--radix-select-content-available-height,24rem)]',
          position === 'popper' &&
            'min-w-[var(--radix-select-trigger-width)] data-[side=bottom]:translate-y-0 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        side={side}
        sideOffset={sideOffset}
        avoidCollisions={avoidCollisions}
        {...props}
      >
        <SelectPrimitive.Viewport
          ref={viewportRef}
          className="max-h-[var(--radix-select-content-available-height,24rem)] overflow-y-auto overscroll-contain scroll-pb-1 p-1"
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  hideIndicator = false,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item> & { hideIndicator?: boolean }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full !cursor-pointer select-none items-center rounded-input py-2 pl-2 text-[13px] outline-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary) data-highlighted:bg-(--bg-tertiary) data-disabled:pointer-events-none data-disabled:opacity-50',
        hideIndicator ? 'pr-2' : 'pr-8',
        className
      )}
      {...props}
    >
      {!hideIndicator ? (
        <span className="absolute right-2 flex size-4 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <Check className="size-3.5 text-(--navy)" />
          </SelectPrimitive.ItemIndicator>
        </span>
      ) : null}
      <SelectPrimitive.ItemText className="cursor-pointer">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2 py-1.5 text-xs font-medium text-(--text-tertiary)', className)}
      {...props}
    />
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('mx-2 my-1 h-px bg-(--module-divider-color)', className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
