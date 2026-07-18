'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Use the viewport for flip/shift — not overflow-hidden edit panels or module scroll areas. */
function viewportCollisionBoundary(): Element | undefined {
  if (typeof document === 'undefined') return undefined
  return document.documentElement
}

/** Cap menu height so collision detection matches the scrollable panel, not every item row. */
const SELECT_MENU_MAX_HEIGHT = 'max-h-60'

/**
 * Pass as a Select's `value` (instead of the real selected value) to keep Radix from ever
 * marking a SelectItem "selected" — it only auto-scrolls/focuses an item on open when one
 * matches `value`, so a value that never matches means the menu always opens at the top.
 * Pair with `<SelectValue>{yourDisplayText}</SelectValue>` to still show the current choice
 * in the trigger, and drive the real selection off `onValueChange` alone.
 */
export const SELECT_DISPLAY_ONLY_VALUE = '__select_display_only__'

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
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
  avoidCollisions = true,
  collisionPadding = 4,
  sticky = 'partial',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const collisionBoundary = viewportCollisionBoundary()

  // Belt-and-suspenders reset for menus whose value legitimately matches an item
  // (Radix scrolls that item into view on open). Selects that must always open at
  // the top regardless of current value should use SELECT_DISPLAY_ONLY_VALUE instead
  // of fighting Radix's focus/scroll behavior after the fact.
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const resetScroll = () => {
      viewport.scrollTop = 0
    }

    resetScroll()
    const frame = requestAnimationFrame(resetScroll)
    const timer = window.setTimeout(resetScroll, 0)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'z-70 overflow-hidden rounded-lg border border-border bg-(--bg-primary) text-(--text-primary) shadow-(--shadow-md)',
          SELECT_MENU_MAX_HEIGHT,
          position === 'popper' &&
            'min-w-[var(--radix-select-trigger-width)] data-[side=bottom]:translate-y-0 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        side={side}
        sideOffset={sideOffset}
        avoidCollisions={avoidCollisions}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        sticky={sticky}
        {...props}
      >
        <SelectPrimitive.Viewport
          ref={viewportRef}
          className={cn(
            SELECT_MENU_MAX_HEIGHT,
            'overflow-y-auto overscroll-contain scroll-pb-1 p-1'
          )}
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
