'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  CalendarRange,
  ChartColumnDecreasing,
  Check,
  ChevronDown,
  Inbox,
  LayoutTemplate,
  Plus,
  Receipt,
  Settings,
  X,
} from 'lucide-react'
import { CreateMonthModal } from '@/components/CreateMonthModal'
import {
  DASHBOARD_PATHS,
} from '@/lib/dashboard-pages'
import { EXPENSES_AND_INCOME_PATH } from '@/lib/dashboard-route-storage'
import { tryNavigate } from '@/lib/navigation-guard'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [DASHBOARD_PATHS.home]: CalendarRange,
  [EXPENSES_AND_INCOME_PATH]: Receipt,
  [DASHBOARD_PATHS.debtOverview]: ChartColumnDecreasing,
  [DASHBOARD_PATHS.archive]: Archive,
  [DASHBOARD_PATHS.settings]: Settings,
}

type DashboardSidebarProps = {
  onNavigate?: () => void
}

function guardedNav(
  e: React.MouseEvent,
  href: string,
  router: ReturnType<typeof useRouter>,
  onNavigate?: () => void
) {
  e.preventDefault()
  tryNavigate(() => {
    router.push(href)
    onNavigate?.()
  })
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data, getActiveBoard, setActiveBoard, archiveBoard, deleteBoard } = useMyPayBoard()
  const [monthBoardsOpen, setMonthBoardsOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(
    () => pathname.startsWith(DASHBOARD_PATHS.settings)
  )
  const [createMonthOpen, setCreateMonthOpen] = useState(false)
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null)
  const [pendingDeleteBoardId, setPendingDeleteBoardId] = useState<string | null>(null)

  const activeBoard = getActiveBoard()
  const visibleBoards = useMemo(
    () =>
      [...data.boards]
        .filter(b => b.status !== 'archived')
        .sort((a, z) => a.year - z.year || a.month - z.month),
    [data.boards]
  )

  useEffect(() => {
    setHoveredBoardId(current =>
      current && visibleBoards.some(board => board.id === current) ? current : null
    )
    setPendingDeleteBoardId(current =>
      current && visibleBoards.some(board => board.id === current) ? current : null
    )
  }, [visibleBoards])

  const templatesActive = pathname.startsWith(DASHBOARD_PATHS.settingsTemplates)
  const settingsActive =
    pathname.startsWith(DASHBOARD_PATHS.settings) && !templatesActive
  const monthBoardHomeActive = pathname === DASHBOARD_PATHS.home

  function isActivePath(href: string): boolean {
    if (href === DASHBOARD_PATHS.home) return monthBoardHomeActive
    if (href === DASHBOARD_PATHS.settings) return settingsActive
    return pathname.startsWith(href)
  }

  const debtActive = isActivePath(DASHBOARD_PATHS.debtOverview)
  const archiveActive = isActivePath(DASHBOARD_PATHS.archive)
  const expensesActive = isActivePath(EXPENSES_AND_INCOME_PATH)

  return (
    <>
      <nav className="flex-1">
        <div className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.06em] text-(--text-tertiary)/85 uppercase">
          Workspace
        </div>

        <div
          className={cn(
            'nav-item w-full',
            monthBoardHomeActive && activeBoard && 'active'
          )}
        >
          <button
            type="button"
            onClick={() => setMonthBoardsOpen(o => !o)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-[10px] border-0 bg-transparent p-0 text-inherit"
          >
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Pay Boards</span>
          </button>
          <button
            type="button"
            aria-label="New Pay Board"
            title="New Pay Board"
            onClick={e => {
              e.stopPropagation()
              setCreateMonthOpen(true)
            }}
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) transition hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={monthBoardsOpen ? 'Collapse Pay Boards' : 'Expand Pay Boards'}
            onClick={() => setMonthBoardsOpen(o => !o)}
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-(--text-tertiary) transition hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                !monthBoardsOpen && '-rotate-90'
              )}
            />
          </button>
        </div>

        {monthBoardsOpen ? (
          <div className="mt-0.5 ml-3 space-y-0.5">
            {visibleBoards.map(board => {
              const isActive = activeBoard?.id === board.id && monthBoardHomeActive
              const deletePending = pendingDeleteBoardId === board.id
              const actionsVisible =
                hoveredBoardId === board.id || pendingDeleteBoardId === board.id

              return (
                <div
                  key={board.id}
                  className="nav-sub-row"
                  onMouseEnter={() => setHoveredBoardId(board.id)}
                  onMouseLeave={() => {
                    setHoveredBoardId(current => (current === board.id ? null : current))
                  }}
                >
                  <Link
                    href={DASHBOARD_PATHS.home}
                    onClick={e => {
                      e.preventDefault()
                      tryNavigate(() => {
                        setActiveBoard(board.id)
                        router.push(DASHBOARD_PATHS.home)
                        onNavigate?.()
                      })
                    }}
                    className={cn('nav-sub-item', isActive && 'active')}
                  >
                    <span className="truncate">{board.label}</span>
                  </Link>
                  <div
                    className={cn(
                      'flex shrink-0 items-center gap-0.5 transition-opacity ease-out',
                      actionsVisible
                        ? 'pointer-events-auto opacity-100 duration-150'
                        : 'pointer-events-none opacity-0 duration-200'
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`Archive ${board.label}`}
                      title="Archive"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        archiveBoard(board.id)
                        setPendingDeleteBoardId(current =>
                          current === board.id ? null : current
                        )
                      }}
                      className="inline-flex size-6 cursor-pointer items-center justify-center text-(--text-tertiary) transition-colors duration-150 ease-out hover:text-(--text-primary)"
                    >
                      <Inbox className="size-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={
                        deletePending
                          ? `Confirm delete ${board.label}`
                          : `Delete ${board.label}`
                      }
                      title={deletePending ? 'Confirm delete' : 'Delete'}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!deletePending) {
                          setPendingDeleteBoardId(board.id)
                          return
                        }
                        deleteBoard(board.id)
                        setPendingDeleteBoardId(null)
                      }}
                      className={cn(
                        'inline-flex size-6 cursor-pointer items-center justify-center text-(--text-tertiary) transition-colors duration-150 ease-out hover:text-(--danger)',
                        deletePending && 'text-(--danger)'
                      )}
                    >
                      {deletePending ? (
                        <Check className="size-[15px]" strokeWidth={2.25} aria-hidden />
                      ) : (
                        <X className="size-3.5" strokeWidth={1.75} aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="mt-3 space-y-1">
          <Link
            href={DASHBOARD_PATHS.debtOverview}
            onClick={e => guardedNav(e, DASHBOARD_PATHS.debtOverview, router, onNavigate)}
            className={cn('nav-item', debtActive && 'active')}
          >
            <ChartColumnDecreasing className="h-4 w-4 shrink-0" />
            <span>Debt Tracker</span>
          </Link>
        </div>

        <div className="my-5 border-t border-border/60" />

        <div className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.06em] text-(--text-tertiary)/85 uppercase">
          Manage
        </div>

        <div className="space-y-1">
          <Link
            href={EXPENSES_AND_INCOME_PATH}
            onClick={e => guardedNav(e, EXPENSES_AND_INCOME_PATH, router, onNavigate)}
            className={cn('nav-item', expensesActive && 'active')}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>Bills &amp; Income</span>
          </Link>
          <Link
            href={DASHBOARD_PATHS.settingsTemplates}
            onClick={e => guardedNav(e, DASHBOARD_PATHS.settingsTemplates, router, onNavigate)}
            className={cn('nav-item', templatesActive && 'active')}
          >
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            <span>Templates</span>
          </Link>
          <Link
            href={DASHBOARD_PATHS.archive}
            onClick={e => guardedNav(e, DASHBOARD_PATHS.archive, router, onNavigate)}
            className={cn('nav-item', archiveActive && 'active')}
          >
            <Archive className="h-4 w-4 shrink-0" />
            <span>Archive</span>
          </Link>
        </div>

        <div className="my-5 border-t border-border/60" />

        <div className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.06em] text-(--text-tertiary)/85 uppercase">
          System
        </div>

        <div>
          <button
            type="button"
            onClick={() => setSettingsOpen(o => !o)}
            className={cn(
              'nav-item w-full',
              settingsActive && 'active'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Settings</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-(--text-tertiary) transition-transform',
                !settingsOpen && '-rotate-90'
              )}
            />
          </button>
          {settingsOpen ? (
            <div className="mt-0.5 ml-3 space-y-0.5">
              <div className="nav-sub-row">
                <Link
                  href={DASHBOARD_PATHS.settings}
                  onClick={e => guardedNav(e, DASHBOARD_PATHS.settings, router, onNavigate)}
                  className={cn(
                    'nav-sub-item',
                    pathname === DASHBOARD_PATHS.settings && 'active'
                  )}
                >
                  Overview
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </nav>
      <CreateMonthModal open={createMonthOpen} onClose={() => setCreateMonthOpen(false)} />
    </>
  )
}
