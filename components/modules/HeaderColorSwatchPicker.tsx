'use client'

import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  isNeutralHeaderColor,
} from './header-colors'
import { cn } from '@/lib/utils'

type HeaderColorSwatchPickerProps = {
  value?: string
  onChange: (hex: string) => void
  className?: string
}

export function HeaderColorSwatchPicker({ value, onChange, className }: HeaderColorSwatchPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <button
        type="button"
        title="Neutral"
        aria-label="Neutral header"
        className={cn(
          'size-7 shrink-0 rounded-full border border-(--border-strong) bg-(--bg-secondary) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
          isNeutralHeaderColor(value) && 'ring-2 ring-(--navy) ring-offset-1'
        )}
        onClick={() => onChange(NEUTRAL_HEADER_COLOR)}
      />
      {HEADER_COLOR_SWATCHES.map(sw => (
        <button
          key={`hdr-${sw.value}`}
          type="button"
          title={sw.label}
          className={cn(
            'size-7 shrink-0 rounded-full border border-(--border-strong) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
            value?.toUpperCase() === sw.value.toUpperCase() && 'ring-2 ring-(--navy) ring-offset-1'
          )}
          style={{ backgroundColor: sw.value }}
          onClick={() => onChange(sw.value)}
        />
      ))}
    </div>
  )
}
