'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DayPicker,
  type DayButton,
  type Locale,
} from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const CELL_SIZE = '2rem'

function CalendarDayButton({
  className,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)
  Reflect.deleteProperty(props, 'day')
  Reflect.deleteProperty(props, 'locale')

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-input text-[13px] font-normal transition-colors duration-150 outline-none',
        modifiers.selected &&
          'bg-(--navy) font-medium text-(--text-inverse) hover:bg-(--navy) hover:text-(--text-inverse) focus-visible:ring-2 focus-visible:ring-(--navy)/30',
        modifiers.today &&
          !modifiers.selected &&
          'font-semibold text-(--navy) ring-1 ring-(--navy)/35 ring-inset',
        modifiers.outside && 'text-(--text-tertiary) opacity-50',
        modifiers.disabled && 'pointer-events-none text-(--text-tertiary) opacity-35',
        !modifiers.selected &&
          !modifiers.disabled &&
          'text-(--text-primary) hover:bg-(--bg-tertiary)',
        className
      )}
      {...props}
    />
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-3',
        month: 'grid w-full grid-cols-[2rem_1fr_2rem] items-center gap-y-3',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'col-start-1 row-start-1 size-7 justify-self-start text-(--text-secondary) hover:bg-(--bg-tertiary) hover:text-(--text-primary)'
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'col-start-3 row-start-1 size-7 justify-self-end text-(--text-secondary) hover:bg-(--bg-tertiary) hover:text-(--text-primary)'
        ),
        month_caption: 'col-start-2 row-start-1 flex h-7 items-center justify-center',
        caption_label: 'text-[13px] font-semibold text-(--text-primary) select-none',
        month_grid: 'col-span-3 row-start-2 w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex-1 text-center text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase select-none',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center select-none',
        outside: 'text-(--text-tertiary)',
        disabled: 'text-(--text-tertiary) opacity-35',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return (
            <Icon
              className={cn('size-4', chevronClassName)}
              strokeWidth={1.75}
              {...chevronProps}
            />
          )
        },
        DayButton: CalendarDayButton,
      }}
      style={
        {
          '--cell-size': CELL_SIZE,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
