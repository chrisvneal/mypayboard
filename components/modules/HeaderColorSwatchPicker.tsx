'use client'

import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  getSwatchGradientEndpoint,
  isNeutralHeaderColor,
  parseHeaderColor,
  serializeHeaderColor,
} from './header-colors'
import { cn } from '@/lib/utils'

type HeaderColorSwatchPickerProps = {
  value?: string
  onChange: (serialized: string) => void
  className?: string
}

export function HeaderColorSwatchPicker({ value, onChange, className }: HeaderColorSwatchPickerProps) {
  const { color: activeColor, gradient } = parseHeaderColor(value)
  const isNeutral = isNeutralHeaderColor(value)

  // Gradient endpoint for the currently selected swatch (null for neutral/unknown colors)
  const gradientEndpoint = isNeutral ? null : getSwatchGradientEndpoint(activeColor)

  // Track background previews what dragging will produce
  const trackBackground = gradientEndpoint
    ? `linear-gradient(to right, ${activeColor}, ${gradientEndpoint})`
    : undefined

  function handleSwatchSelect(hex: string) {
    onChange(serializeHeaderColor(hex, gradient))
  }

  function handleNeutralSelect() {
    onChange(NEUTRAL_HEADER_COLOR)
  }

  function handleGradientChange(newGradient: number) {
    onChange(serializeHeaderColor(activeColor, newGradient))
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {/* Swatch row */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          title="Neutral"
          aria-label="Neutral header"
          className={cn(
            'size-7 shrink-0 rounded-full border border-(--border-strong) bg-(--bg-secondary) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
            isNeutral && 'ring-2 ring-(--navy) ring-offset-1'
          )}
          onClick={handleNeutralSelect}
        />
        {HEADER_COLOR_SWATCHES.map(sw => (
          <button
            key={`hdr-${sw.value}`}
            type="button"
            title={sw.label}
            aria-label={`${sw.label} header`}
            className={cn(
              'size-7 shrink-0 rounded-full border border-(--border-strong) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
              !isNeutral && activeColor.toUpperCase() === sw.value.toUpperCase() &&
                'ring-2 ring-(--navy) ring-offset-1'
            )}
            style={{ backgroundColor: sw.value }}
            onClick={() => handleSwatchSelect(sw.value)}
          />
        ))}
      </div>

      {/* Gradient slider — hidden when neutral is active or no endpoint exists */}
      {!isNeutral && gradientEndpoint && (
        <div className="relative mt-1">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={gradient}
            onChange={e => handleGradientChange(Number(e.target.value))}
            aria-label="Gradient intensity"
            className="header-gradient-slider w-full"
            style={{ background: trackBackground }}
          />
        </div>
      )}
    </div>
  )
}
