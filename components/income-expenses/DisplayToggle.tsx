'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Columns3 } from 'lucide-react'
import type { ExpenseDisplayPrefs } from '@/lib/userPrefs'

export type { ExpenseDisplayPrefs }

type DisplayToggleProps = {
  value: ExpenseDisplayPrefs
  onChange: (prefs: ExpenseDisplayPrefs) => void
}

export function DisplayToggle({ value, onChange }: DisplayToggleProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = 190
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const updatePref = (key: keyof ExpenseDisplayPrefs) => {
    onChange({ ...value, [key]: !value[key] })
  }

  const options: Array<{ key: keyof ExpenseDisplayPrefs; label: string }> = [
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'linkIcon', label: 'Link Icon' },
  ]

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-input border border-[--module-divider-color] bg-(--bg-primary) px-2.5 text-[12px] font-medium text-(--text-secondary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
        aria-expanded={open}
      >
        <Columns3 className="size-3.5" />
        Display
      </button>
      {open && position && (
        <div
          ref={panelRef}
          className="fixed z-50 w-[190px] rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-2 shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          {options.map(option => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-2 rounded-input px-2 py-1.5 text-[12px] text-(--text-secondary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
            >
              <input
                type="checkbox"
                checked={value[option.key]}
                onChange={() => updatePref(option.key)}
                className="size-3.5 accent-(--navy)"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </>
  )
}
