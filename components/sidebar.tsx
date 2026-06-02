'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Archive,
  CalendarRange,
  Check,
  ChevronDown,
  CreditCard,
  MoreVertical,
  Settings,
  Wallet,
} from 'lucide-react'
import { CreateMonthModal } from '@/components/CreateMonthModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_PATHS,
  type DashboardNavItem,
} from '@/lib/dashboard-pages'
import { EXPENSES_AND_INCOME_PATH } from '@/lib/dashboard-route-storage'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [DASHBOARD_PATHS.home]: CalendarRange,
  [EXPENSES_AND_INCOME_PATH]: Wallet,
  [DASHBOARD_PATHS.debtOverview]: CreditCard,
  [DASHBOARD_PATHS.archive]: Archive,
  [DASHBOARD_PATHS.settings]: Settings,
}

type DashboardSidebarProps = {
  onNavigate?: () => void
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
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

  const settingsActive = pathname.startsWith(DASHBOARD_PATHS.settings)
  const templatesActive = pathname.startsWith(DASHBOARD_PATHS.settingsTemplates)
  const monthBoardHomeActive = pathname === DASHBOARD_PATHS.home

  function isActivePath(href: string): boolean {
    if (href === DASHBOARD_PATHS.home) return monthBoardHomeActive
    if (href === DASHBOARD_PATHS.settings) return settingsActive
    return pathname.startsWith(href)
  }

  function renderNavItem(item: DashboardNavItem) {
    if (item.href === DASHBOARD_PATHS.home) {
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => setMonthBoardsOpen(o => !o)}
            className={cn(
              'nav-item w-full rounded-l-none rounded-r-md',
              monthBoardHomeActive && 'active'
            )}
          >
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Month Boards</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-(--text-tertiary) transition-transform',
                !monthBoardsOpen && '-rotate-90'
              )}
            />
          </button>
          {monthBoardsOpen ? (
            <div className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2">
              {visibleBoards.map(board => {
                const isActive = activeBoard?.id === board.id && monthBoardHomeActive
                return (
                  <div
                    key={board.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-r-md',
                      isActive && 'bg-(--navy-light)'
                    )}
                  >
                    <Link
                      href={DASHBOARD_PATHS.home}
                      onClick={() => {
                        setActiveBoard(board.id)
                        onNavigate?.()
                      }}
                      className={cn('nav-item min-w-0 flex-1 rounded-l-none rounded-r-md pr-1 text-[12px]', isActive && 'active')}
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
          <button
            type="button"
            onClick={() => setCreateMonthOpen(true)}
            className="mt-2 ml-1 w-[calc(100%-4px)] cursor-pointer rounded-md border border-transparent px-3 py-2 text-left text-[12px] font-medium text-(--text-secondary) hover:border-border hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            + Create New Month
          </button>
        </div>
      )
    }

    if (item.href === DASHBOARD_PATHS.settings) {
      const Icon = NAV_ICONS[item.href] ?? Settings
      return (
        <div key={item.href}>
          <button
            type="button"
            onClick={() => setSettingsOpen(o => !o)}
            className={cn(
              'nav-item w-full rounded-l-none rounded-r-md',
              settingsActive && 'active'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-(--text-tertiary) transition-transform',
                !settingsOpen && '-rotate-90'
              )}
            />
          </button>
          {settingsOpen ? (
            <div className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2">
              <Link
                href={DASHBOARD_PATHS.settings}
                onClick={onNavigate}
                className={cn(
                  'nav-item rounded-l-none rounded-r-md text-[12px]',
                  pathname === DASHBOARD_PATHS.settings && !templatesActive && 'active'
                )}
              >
                Overview
              </Link>
              <Link
                href={DASHBOARD_PATHS.settingsTemplates}
                onClick={onNavigate}
                className={cn(
                  'nav-item rounded-l-none rounded-r-md text-[12px]',
                  templatesActive && 'active'
                )}
              >
                Templates
              </Link>
            </div>
          ) : null}
        </div>
      )
    }

    const Icon = NAV_ICONS[item.href] ?? Wallet
    const active = isActivePath(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn('nav-item rounded-l-none rounded-r-md', active && 'active')}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      <nav className="flex-1 space-y-1">
        {DASHBOARD_NAV_ITEMS.map(item => renderNavItem(item))}
      </nav>
      <CreateMonthModal open={createMonthOpen} onClose={() => setCreateMonthOpen(false)} />
    </>
  )
}
