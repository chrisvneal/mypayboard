'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Archive,
  CalendarRange,
  ChartColumnDecreasing,
  Check,
  ChevronDown,
  LayoutTemplate,
  MoreVertical,
  Receipt,
  Settings,
} from 'lucide-react'
import { CreateMonthModal } from '@/components/CreateMonthModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [openBoardMenuId, setOpenBoardMenuId] = useState<string | null>(null)
  const [pendingBoardAction, setPendingBoardAction] = useState<{
    boardId: string
    action: 'archive' | 'delete'
  } | null>(null)

  const activeBoard = getActiveBoard()
  const visibleBoards = useMemo(
    () =>
      [...data.boards]
        .filter(b => b.status !== 'archived')
        .sort((a, z) => a.year - z.year || a.month - z.month),
    [data.boards]
  )

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

        <button
          type="button"
          onClick={() => setMonthBoardsOpen(o => !o)}
          className={cn(
            'nav-item w-full',
            monthBoardHomeActive && activeBoard && 'active'
          )}
        >
          <CalendarRange className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Pay Boards</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-(--text-tertiary) transition-transform',
              !monthBoardsOpen && '-rotate-90'
            )}
          />
        </button>

        {monthBoardsOpen ? (
          <div className="mt-0.5 ml-3 space-y-0.5">
            <button
              type="button"
              onClick={() => setCreateMonthOpen(true)}
              className="w-full cursor-pointer rounded-md border border-transparent px-3 py-2 text-left text-[12px] font-medium text-(--text-secondary) hover:border-border hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
            >
              + New Pay Board
            </button>
            {visibleBoards.map(board => {
              const isActive = activeBoard?.id === board.id && monthBoardHomeActive
              return (
                <div key={board.id} className="group flex items-center gap-1">
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
                    className={cn('nav-sub-item min-w-0 flex-1 pr-1', isActive && 'active')}
                  >
                    <span className="truncate">{board.label}</span>
                  </Link>
                  <DropdownMenu
                    open={openBoardMenuId === board.id}
                    onOpenChange={open => {
                      setOpenBoardMenuId(open ? board.id : null)
                      if (!open) setPendingBoardAction(null)
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${board.label}`}
                        onClick={e => e.preventDefault()}
                        className="mr-1 inline-flex size-6 items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition group-hover:opacity-100 hover:bg-(--bg-tertiary) hover:text-(--text-primary) focus:opacity-100"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={event => {
                          event.preventDefault()
                          const isPending =
                            pendingBoardAction?.boardId === board.id &&
                            pendingBoardAction.action === 'archive'
                          if (!isPending) {
                            setPendingBoardAction({ boardId: board.id, action: 'archive' })
                            return
                          }
                          archiveBoard(board.id)
                          setPendingBoardAction(null)
                          setOpenBoardMenuId(null)
                        }}
                      >
                        {pendingBoardAction?.boardId === board.id &&
                        pendingBoardAction.action === 'archive' ? (
                          <span className="inline-flex items-center gap-1.5 text-(--navy)">
                            <Check className="size-3.5" />
                            Confirm Archive
                          </span>
                        ) : (
                          'Archive'
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-(--danger)"
                        onSelect={event => {
                          event.preventDefault()
                          const isPending =
                            pendingBoardAction?.boardId === board.id &&
                            pendingBoardAction.action === 'delete'
                          if (!isPending) {
                            setPendingBoardAction({ boardId: board.id, action: 'delete' })
                            return
                          }
                          deleteBoard(board.id)
                          setPendingBoardAction(null)
                          setOpenBoardMenuId(null)
                        }}
                      >
                        {pendingBoardAction?.boardId === board.id &&
                        pendingBoardAction.action === 'delete' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Check className="size-3.5" />
                            Confirm Delete
                          </span>
                        ) : (
                          'Delete'
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          ) : null}
        </div>
      </nav>
      <CreateMonthModal open={createMonthOpen} onClose={() => setCreateMonthOpen(false)} />
    </>
  )
}
