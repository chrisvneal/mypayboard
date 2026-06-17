'use client'

import type { BoardMode } from '@/lib/board-workspace-types'
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
  boardMode?: BoardMode
  totalBillCount?: number
}

const LIVE_TAB_DEFS: { id: ModuleTabId; label: string }[] = [
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
  boardMode = 'live',
  totalBillCount,
}: ModuleTabsProps) {
  if (boardMode === 'template') {
    const count = totalBillCount ?? unpaidCount + paidCount
    return (
      <div className="module-tabs-bar shrink-0 py-3">
        <p className="text-left text-[13px] font-medium text-(--text-tertiary)">
          Bills · {count}
        </p>
      </div>
    )
  }

  const tabDefs = LIVE_TAB_DEFS

  const countStyle = (tabId: ModuleTabId) =>
    active === tabId
      ? ({ color: headerVisual.subtitle } as const)
      : ({ color: 'var(--text-secondary)' } as const)

  return (
    <div className="module-tabs-bar overflow-hidden">
      <div className="bill-row module-tabs-row">
        <span aria-hidden className="bill-row-header-check-slot hidden xl:block" />
        <span aria-hidden className="bill-row-header-pipe-slot hidden xl:block" />
        <div
          className="flex min-w-0 w-full items-center justify-between xl:justify-start xl:gap-8"
          style={{ gridColumn: '3 / -1' }}
        >
          {tabDefs.map(t => {
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                className={cn(
                  'relative flex-1 xl:flex-none shrink-0 inline-flex items-center justify-center rounded-md px-4 py-1.5 min-h-[44px] xl:min-h-0 text-[13px] font-medium tabular-nums transition-[color,background-color] duration-150 ease-out',
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
