'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { HeaderVisual } from './header-colors'

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
  allPaid: _allPaid,
  unreadNotes,
  headerVisual,
}: ModuleTabsProps) {
  void _allPaid
  const trackRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Partial<Record<ModuleTabId, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const btn = btnRefs.current[active]
    const track = trackRef.current
    if (!btn || !track) return
    const br = btn.getBoundingClientRect()
    const tr = track.getBoundingClientRect()
    setIndicator({ left: br.left - tr.left, width: br.width })
  }, [active, unpaidCount, paidCount, unreadNotes])

  const countStyle = (tabId: ModuleTabId) =>
    active === tabId
      ? ({ color: headerVisual.subtitle } as const)
      : ({ color: 'var(--text-secondary)' } as const)

  return (
    <div className="module-tabs-bar overflow-hidden px-5 pt-2.5">
      <div ref={trackRef} className="bill-row module-tabs-row relative pb-px">
        <span aria-hidden />
        <span aria-hidden />
        <span aria-hidden />
        <div className="flex items-center gap-12" style={{ gridColumn: '4 / -1' }}>
          {TAB_DEFS.map(t => (
            <button
              key={t.id}
              ref={el => {
                btnRefs.current[t.id] = el
              }}
              type="button"
              className={cn(
                'relative shrink-0 py-2 pr-2 text-left text-[13px] font-medium tabular-nums transition-colors duration-150 ease-out',
                active === t.id
                  ? ''
                  : 'text-(--text-tertiary) hover:text-(--text-secondary)'
              )}
              onClick={() => onChange(t.id)}
              style={active === t.id ? { color: headerVisual.subtitle } : undefined}
            >
              {t.id === 'unpaid' && (
                <span className="inline-flex items-baseline gap-1.5">
                  <span>{t.label}</span>
                  <span className="text-[12px] font-semibold opacity-90" style={countStyle('unpaid')}>
                    {unpaidCount}
                  </span>
                </span>
              )}
              {t.id === 'paid' && (
                <span className="inline-flex items-baseline gap-1.5">
                  <span>{t.label}</span>
                  <span className="text-[12px] font-semibold opacity-90" style={countStyle('paid')}>
                    {paidCount}
                  </span>
                </span>
              )}
              {t.id === 'notes' && (
                <span className="inline-flex items-baseline gap-1.5">
                  <span>{t.label}</span>
                  {unreadNotes > 0 && (
                    <span className="text-[12px] font-semibold opacity-90" style={countStyle('notes')}>
                      {unreadNotes}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
        <span
          className="pointer-events-none absolute bottom-0 h-px rounded-full transition-[left,width] duration-200 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            backgroundColor: headerVisual.subtitle,
          }}
        />
      </div>
    </div>
  )
}
