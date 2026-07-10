'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useClerk } from '@clerk/nextjs'
import { DashboardSidebar } from '@/components/sidebar'
import { Logo } from '@/components/ui/Logo'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { resolveUserAvatarStyle } from '@/components/modules/header-colors'
import type { User } from '@/lib/types'
import { storeLastDashboardPath } from '@/lib/dashboard-route-storage'
import { DASHBOARD_NAV_ITEMS, DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { MyPayBoardProvider, useMyPayBoard } from '@/lib/MyPayBoardProvider'
import { readUserTheme, useUserPrefs } from '@/lib/userPrefs'
import { clearSessionUser, syncFromClerk } from '@/lib/session'
import { suppressThemeTransitions } from '@/lib/theme-transition'

function readStoredTheme(): boolean {
  if (typeof window === 'undefined') return false
  return readUserTheme() === 'dark'
}

function applyThemeClass(isDark: boolean) {
  suppressThemeTransitions()
  document.documentElement.classList.toggle('dark', isDark)
}

// Inner component — only mounts after syncFromClerk has written mypayboard-user,
// so useUserPrefs() initializes with the correct userId from the start.
function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { prefs, patch: patchPrefs } = useUserPrefs()
  const [mounted, setMounted] = useState(false)
  // prefs.theme is a synchronous localStorage read — always null on the
  // server (no window during SSR), but can already hold a real value on the
  // client's very first render (before hydration reconciles), which would
  // mismatch the server-rendered icon/aria-pressed. Gating on `mounted`
  // (false on both server and the client's first paint) keeps that first
  // render identical; the real value takes over right after mount.
  const isDarkMode = mounted && prefs.theme === 'dark'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const { data } = useMyPayBoard()
  const currentUser = useMemo<User | null>(
    () => data.users.find(u => u.id === data.currentUserId) ?? null,
    [data.users, data.currentUserId]
  )

  useEffect(() => {
    setMounted(true)
    const dark = readStoredTheme()
    applyThemeClass(dark)
  }, [])

  useEffect(() => {
    queueMicrotask(() => setMobileSidebarOpen(false))
    if (currentUser) storeLastDashboardPath(pathname, currentUser.id)
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname, currentUser])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handleBreakpoint = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setMobileSidebarOpen(false)
    }
    mql.addEventListener('change', handleBreakpoint as (e: MediaQueryListEvent) => void)
    return () => mql.removeEventListener('change', handleBreakpoint as (e: MediaQueryListEvent) => void)
  }, [])

  const currentPageTitle = useMemo(() => {
    if (pathname.startsWith(`${DASHBOARD_PATHS.settingsTemplates}/`) && pathname.endsWith('/edit')) {
      return 'Edit Template'
    }
    if (pathname.startsWith(DASHBOARD_PATHS.settingsTemplates)) return 'Templates'
    if (pathname.startsWith(DASHBOARD_PATHS.settingsOrganize)) return 'Organize Lists'
    const item = DASHBOARD_NAV_ITEMS.find(nav =>
      nav.href === DASHBOARD_PATHS.home
        ? pathname === nav.href
        : pathname.startsWith(nav.href)
    )
    return item?.title ?? 'Dashboard'
  }, [pathname])

  function handleThemeToggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const next = !isDarkMode
    applyThemeClass(next)
    patchPrefs({ theme: next ? 'dark' : 'light' })
  }

  async function handleSignOut() {
    clearSessionUser()
    await signOut({ redirectUrl: '/sign-in' })
  }

  const avatarStyle = resolveUserAvatarStyle(currentUser?.avatarColor)

  return (
    <div className="h-screen bg-(--bg-secondary) text-(--text-primary)">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-slate-900/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-(--sidebar-width) flex-col border-r border-border bg-(--sidebar-bg) shadow-(--shadow-sm) transition-transform duration-200 ease-out lg:pointer-events-auto lg:translate-x-0 ${
          mobileSidebarOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-3 pb-4">
          <Link
            href="/dashboard"
            className="mb-4 px-2 py-3 no-underline"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <Logo size="md" />
          </Link>

          <DashboardSidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </div>

        <div className="mt-auto shrink-0 border-t border-border bg-(--bg-primary) p-3 shadow-[0_-4px_12px_-4px_rgb(0_0_0/0.07)]">
          {currentUser && (
            <div className="mb-2 flex items-center gap-2">
              <div className="avatar" style={avatarStyle}>{currentUser.name[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-(--text-primary)">{currentUser.name}</div>
                <div className="truncate text-xs capitalize text-(--text-tertiary)">{currentUser.role}</div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full min-h-[44px] lg:min-h-0 cursor-pointer items-center justify-center gap-2 rounded-input border border-border bg-(--bg-secondary) px-2 py-1.5 text-xs font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex h-screen flex-col overflow-x-hidden bg-(--bg-secondary) lg:ml-(--sidebar-width)">
        <header className="sticky top-0 z-20 flex h-(--topbar-height) shrink-0 items-center justify-between border-b border-border bg-(--bg-primary) px-4 shadow-(--shadow-sm)">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-input border border-border bg-(--bg-secondary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) lg:hidden"
              onClick={() => setMobileSidebarOpen(open => !open)}
              aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="truncate text-lg font-semibold text-(--text-primary)">{currentPageTitle}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-11 w-11 xl:h-9 xl:w-9 cursor-pointer items-center justify-center rounded-input border border-border bg-(--bg-secondary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto bg-(--bg-secondary) scrollbar-gutter-stable"
        >
          <div className="page-container min-h-full">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * Client shell for the dashboard. Receives the confirmed Clerk userId from the
 * server layout and writes it to mypayboard-user before DashboardContent mounts,
 * ensuring getSessionUserId() is ready when useUserPrefs initializes.
 */
export function DashboardShell({ userId, children }: { userId: string; children: ReactNode }) {
  useState(() => { syncFromClerk(userId) })

  return (
    <MyPayBoardProvider>
      <DashboardContent>{children}</DashboardContent>
    </MyPayBoardProvider>
  )
}
