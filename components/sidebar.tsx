'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  CalendarRange,
  ChartColumnDecreasing,
  ChevronDown,
  LayoutTemplate,
  Plus,
  Receipt,
  Settings,
} from 'lucide-react'
import { CreateMonthModal } from '@/components/CreateMonthModal'
import {
  DASHBOARD_PATHS,
} from '@/lib/dashboard-pages'
import { BILLS_AND_INCOME_PATH } from '@/lib/dashboard-route-storage'
import { tryNavigate } from '@/lib/navigation-guard'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

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
  const { data, getActiveBoard, setActiveBoard, archiveBoard } = useMyPayBoard()
  const [mounted, setMounted] = useState(false)
  const [monthBoardsOpen, setMonthBoardsOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [createMonthOpen, setCreateMonthOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const activeBoard = getActiveBoard()
  const visibleBoards = useMemo(
    () =>
      [...data.boards]
        .filter(b => b.status !== 'archived')
        .sort((a, z) => a.year - z.year || a.month - z.month),
    [data.boards]
  )

  const templatesActive = pathname.startsWith(DASHBOARD_PATHS.settingsTemplates)
  const organizeActive = pathname.startsWith(DASHBOARD_PATHS.settingsOrganize)
  const settingsActive =
    pathname.startsWith(DASHBOARD_PATHS.settings) && !templatesActive
  const monthBoardHomeActive = pathname === DASHBOARD_PATHS.home

  function isActivePath(href: string): boolean {
    if (href === DASHBOARD_PATHS.home) return monthBoardHomeActive
    if (href === DASHBOARD_PATHS.settings) return settingsActive
    return pathname.startsWith(href)
  }

  const debtActive = isActivePath(DASHBOARD_PATHS.debtTracker)
  const archiveActive = isActivePath(DASHBOARD_PATHS.archive)
  const billsAndIncomeActive = isActivePath(BILLS_AND_INCOME_PATH)

  return (
    <>
      <nav className="flex-1">
        <div className="mb-3 px-3 text-[12px] font-medium tracking-[0.06em] uppercase">
          {/* data.workspaceName is a synchronous localStorage read — always
              empty on the server (no window during SSR), but can already
              hold a real value on the client's very first render (before
              hydration reconciles), which mismatches the server-rendered
              "Workspace" fallback. Gating on `mounted` (false on both server
              and the client's first paint) keeps that first render
              identical to the server's; the real value takes over right
              after mount, same pattern as the nav active-state below. */}
          {mounted && data.workspaceName
            ? <>
                <span className="text-(--text-primary)/90">{data.workspaceName}</span>
                <span className="text-(--text-secondary)/80"> Workspace</span>
              </>
            : <span className="text-(--text-secondary)/80">Workspace</span>
          }
        </div>

        <div
          className={cn(
            'nav-item w-full',
            mounted && monthBoardHomeActive && activeBoard && 'active'
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
            className="inline-flex size-11 xl:size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-nav)] text-(--text-tertiary) transition hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={monthBoardsOpen ? 'Collapse Pay Boards' : 'Expand Pay Boards'}
            onClick={() => setMonthBoardsOpen(o => !o)}
            className="inline-flex size-11 xl:size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-nav)] border-0 bg-transparent p-0 text-(--text-tertiary) transition hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                !monthBoardsOpen && '-rotate-90'
              )}
            />
          </button>
        </div>

        {mounted && monthBoardsOpen ? (
          <div className="mt-0.5 ml-3 space-y-0.5">
            {visibleBoards.map(board => {
              const isActive = activeBoard?.id === board.id && monthBoardHomeActive

              return (
                <div key={board.id} className="nav-sub-row group">
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
                    className={cn('nav-sub-item nav-sub-item-board', isActive && 'active')}
                  >
                    <span className="truncate">{board.label}</span>
                  </Link>
                  <div
                    className="flex shrink-0 items-center gap-0.5 xl:pointer-events-none xl:opacity-0 xl:transition-opacity xl:duration-0 xl:ease-out xl:group-hover:pointer-events-auto xl:group-hover:opacity-100 xl:group-hover:duration-150"
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
                      }}
                      className="inline-flex size-11 xl:size-6 cursor-pointer items-center justify-center text-(--text-tertiary) transition-colors duration-150 ease-out hover:text-(--text-primary)"
                    >
                      <Archive className="size-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="mt-3 space-y-1">
          <Link
            href={DASHBOARD_PATHS.debtTracker}
            onClick={e => guardedNav(e, DASHBOARD_PATHS.debtTracker, router, onNavigate)}
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
            href={BILLS_AND_INCOME_PATH}
            onClick={e => guardedNav(e, BILLS_AND_INCOME_PATH, router, onNavigate)}
            className={cn('nav-item', billsAndIncomeActive && 'active')}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>Bills &amp; Income</span>
          </Link>
          <div className="hidden md:block">
            <Link
              href={DASHBOARD_PATHS.settingsTemplates}
              onClick={e => guardedNav(e, DASHBOARD_PATHS.settingsTemplates, router, onNavigate)}
              className={cn('nav-item', templatesActive && 'active')}
            >
              <LayoutTemplate className="h-4 w-4 shrink-0" />
              <span>Templates</span>
            </Link>
          </div>
          <div className="hidden md:block">
            <Link
              href={DASHBOARD_PATHS.archive}
              onClick={e => guardedNav(e, DASHBOARD_PATHS.archive, router, onNavigate)}
              className={cn('nav-item', archiveActive && 'active')}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span>Archive</span>
            </Link>
          </div>
        </div>

        <div className="my-5 border-t border-border/60" />

        <div className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.06em] text-(--text-tertiary)/85 uppercase">
          System
        </div>

        <div>
          <button
            type="button"
            onClick={() => setSettingsOpen(o => !o)}
            aria-expanded={settingsOpen}
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
              <div className="nav-sub-row">
                <Link
                  href={DASHBOARD_PATHS.settingsOrganize}
                  onClick={e => guardedNav(e, DASHBOARD_PATHS.settingsOrganize, router, onNavigate)}
                  className={cn('nav-sub-item', organizeActive && 'active')}
                >
                  Organize Lists
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </nav>
      <CreateMonthModal
        open={createMonthOpen}
        onClose={() => setCreateMonthOpen(false)}
        onCreated={() => setMonthBoardsOpen(true)}
      />
    </>
  )
}
