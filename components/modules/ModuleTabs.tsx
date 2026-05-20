'use client'

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

function activeTabBackground(headerVisual: HeaderVisual): string {
  return `color-mix(in srgb, ${headerVisual.bg} 42%, transparent)`
}

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

  const countStyle = (tabId: ModuleTabId) =>
    active === tabId
      ? ({ color: headerVisual.subtitle } as const)
      : ({ color: 'var(--text-secondary)' } as const)

  return (
    <div className="module-tabs-bar overflow-hidden px-5">
      <div className="bill-row module-tabs-row">
        <span aria-hidden />
        <span aria-hidden />
        <span aria-hidden />
        <div className="flex items-center gap-12" style={{ gridColumn: '4 / -1' }}>
          {TAB_DEFS.map(t => {
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                className={cn(
                  'relative shrink-0 rounded-md px-4 py-1.5 text-center text-[13px] font-medium tabular-nums transition-[color,background-color] duration-150 ease-out',
                  isActive ? '' : 'text-(--text-tertiary) hover:text-(--text-secondary)'
                )}
                style={
                  isActive
                    ? {
                        color: headerVisual.subtitle,
                        backgroundColor: activeTabBackground(headerVisual),
                      }
                    : undefined
                }
                onClick={() => onChange(t.id)}
              >
                {t.id === 'unpaid' && (
                  <span className="inline-flex items-baseline justify-center gap-1.5">
                    <span>{t.label}</span>
                    <span
                      className="text-[12px] font-semibold opacity-90"
                      style={countStyle('unpaid')}
                    >
                      {unpaidCount}
                    </span>
                  </span>
                )}
                {t.id === 'paid' && (
                  <span className="inline-flex items-baseline justify-center gap-1.5">
                    <span>{t.label}</span>
                    <span
                      className="text-[12px] font-semibold opacity-90"
                      style={countStyle('paid')}
                    >
                      {paidCount}
                    </span>
                  </span>
                )}
                {t.id === 'notes' && (
                  <span className="inline-flex items-baseline justify-center gap-1.5">
                    <span>{t.label}</span>
                    {unreadNotes > 0 && (
                      <span
                        className="text-[12px] font-semibold opacity-90"
                        style={countStyle('notes')}
                      >
                        {unreadNotes}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
