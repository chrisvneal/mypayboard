'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { headerTabBadgeStyle, type HeaderVisual } from './header-colors'

export type ModuleTabId = 'unpaid' | 'paid' | 'notes'

type ModuleTabsProps = {
  active: ModuleTabId
  onChange: (tab: ModuleTabId) => void
  unpaidCount: number
  paidCount: number
  allPaid: boolean
  unreadNotes: number
  headerVisual: HeaderVisual
}

const TAB_DEFS: { id: ModuleTabId; label: string }[] = [
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
  { id: 'notes', label: 'Notes' },
]

export function ModuleTabs({
  active,
  onChange,
  unpaidCount,
  paidCount,
  allPaid,
  unreadNotes,
  headerVisual,
}: ModuleTabsProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Partial<Record<ModuleTabId, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const tabBadgeStyle = useMemo(() => headerTabBadgeStyle(headerVisual), [headerVisual])

  useLayoutEffect(() => {
    const btn = btnRefs.current[active]
    const root = rootRef.current
    if (!btn || !root) return
    const br = btn.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    setIndicator({ left: br.left - rr.left, width: br.width })
  }, [active, unpaidCount, paidCount, unreadNotes])

  return (
    <div ref={rootRef} className="relative border-b border-border px-3 pt-2">
      <div className="flex">
        {TAB_DEFS.map(t => (
          <button
            key={t.id}
            ref={el => {
              btnRefs.current[t.id] = el
            }}
            type="button"
            className={cn(
              'relative flex-1 px-2 py-2 text-[13px] font-medium transition-colors duration-150 ease-out',
              active === t.id
                ? ''
                : 'text-(--text-tertiary) hover:text-(--text-secondary)'
            )}
            onClick={() => onChange(t.id)}
            style={active === t.id ? { color: headerVisual.subtitle } : undefined}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {t.label}
              {t.id === 'unpaid' && (
                <span className="badge" style={tabBadgeStyle}>
                  {unpaidCount}
                </span>
              )}
              {t.id === 'paid' && (
                <span className="badge" style={tabBadgeStyle}>
                  {paidCount}
                </span>
              )}
              {t.id === 'notes' && unreadNotes > 0 && (
                <span className="badge" style={tabBadgeStyle}>
                  {unreadNotes}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <span
        className="pointer-events-none absolute bottom-0 h-[2px] rounded-full transition-[left,width] duration-200 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          backgroundColor: headerVisual.subtitle,
        }}
      />
    </div>
  )
}
