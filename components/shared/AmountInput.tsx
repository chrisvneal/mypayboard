'use client'

import { forwardRef, useRef, type CSSProperties, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { formatMoneyInputDraft } from '@/lib/money-input'

export type AmountInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  style?: CSSProperties
  /** Debt balance / available credit fields may go negative; standard bill/income amounts do not. */
  allowNegative?: boolean
  autoFocus?: boolean
}

function sanitizeAmountDraft(raw: string, allowNegative: boolean): string {
  let cleaned = raw.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, '')
  if (allowNegative) {
    const negative = cleaned.startsWith('-')
    cleaned = cleaned.replace(/-/g, '')
    if (negative) cleaned = `-${cleaned}`
  }
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onChange, onBlur, onKeyDown, placeholder = '$0.00', className, style, allowNegative = false, autoFocus = false },
  ref
) {
  const selectAllOnNextFocusRef = useRef(true)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(sanitizeAmountDraft(e.target.value, allowNegative))
  }

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (!selectAllOnNextFocusRef.current) return
    e.currentTarget.select()
    selectAllOnNextFocusRef.current = false
  }

  const handleBlur = () => {
    selectAllOnNextFocusRef.current = true
    onChange(formatMoneyInputDraft(value))
    onBlur?.()
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
    />
  )
})
