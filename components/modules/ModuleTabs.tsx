'use client'

import { cn } from '@/lib/utils'
import type { HeaderVisual } from './header-colors'

export type ModuleTabId = 'unpaid' | 'paid' | 'notes'

type ModuleTabsProps = {
  active: ModuleTabId
  onChange: (tab: ModuleTabId) => void
  unpaidCount: number
  paidCount: number
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
  unreadNotes,
  headerVisual,
}: ModuleTabsProps) {

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
                        backgroundColor: headerVisual.tabActiveBg,
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
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <span>{t.label}</span>
                    {unreadNotes > 0 && (
                      <span
                        className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
                        style={{
                          backgroundColor: headerVisual.tabActiveBg,
                          color: headerVisual.subtitle,
                        }}
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
