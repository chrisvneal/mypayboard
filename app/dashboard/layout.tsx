'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Archive,
  CalendarRange,
  CreditCard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Wallet,
  X,
} from 'lucide-react'
import type { User } from '@/lib/types'
import { USERS } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { EXPENSES_AND_INCOME_PATH, storeLastDashboardPath } from '@/lib/dashboard-route-storage'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-pages'
import { MyPayBoardProvider } from '@/lib/MyPayBoardProvider'
import { readUserTheme, writeUserTheme } from '@/lib/userPrefs'

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': CalendarRange,
  '/dashboard/templates': ListChecks,
  [EXPENSES_AND_INCOME_PATH]: Wallet,
  '/dashboard/debt-overview': CreditCard,
  '/dashboard/archive': Archive,
  '/dashboard/settings': Settings,
}

const SESSION_USER_KEY = 'mypayboard-user'

function getUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<User>
    return USERS.find(user => user.id === parsed.id) ?? null
  } catch {
    return null
  }
}

function readStoredTheme(): boolean {
  if (typeof window === 'undefined') return false
  // Per-user preference; defaults to light when the current user has no saved theme.
  return readUserTheme() === 'dark'
}

function applyThemeClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  writeUserTheme(isDark ? 'dark' : 'light')
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const user = getUserFromStorage()
      setCurrentUser(user)
      setAuthChecked(true)

      const dark = readStoredTheme()
      setIsDarkMode(dark)
      applyThemeClass(dark)
    })
  }, [])

  useEffect(() => {
    if (!authChecked) return
    if (!currentUser) router.replace('/login')
  }, [authChecked, currentUser, router])

  useEffect(() => {
    queueMicrotask(() => setMobileSidebarOpen(false))
    storeLastDashboardPath(pathname)
  }, [pathname])

  const currentPageTitle = useMemo(() => {
    const item = DASHBOARD_NAV_ITEMS.find(nav => nav.href === pathname)
    return item?.title ?? 'Dashboard'
  }, [pathname])

  function isActivePath(href: string): boolean {
    return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  function handleThemeToggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDarkMode(prev => {
      const next = !prev
      applyThemeClass(next)
      return next
    })
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_USER_KEY)
    setCurrentUser(null)
    router.replace('/login')
  }

  const activeUser = currentUser
  if (!authChecked || !activeUser) {
    return null
  }

  const avatarClass = activeUser.id === 'user-nicole' ? 'avatar-nicole' : 'avatar-chris'

  return (
    <MyPayBoardProvider>
    <div className="h-screen bg-(--bg-secondary) text-(--text-primary)">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-slate-900/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-(--sidebar-width) flex-col border-r border-border bg-(--sidebar-bg) shadow-(--shadow-sm) transition-transform duration-200 ease-out md:pointer-events-auto md:translate-x-0 ${
          mobileSidebarOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full md:translate-x-0'
        }`}
      >
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-3 pb-4">
          <Link
            href="/dashboard"
            className="mb-4 px-2 py-3 text-xl font-semibold tracking-tight no-underline"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="text-[#185FA5]">My</span>
            <span className="text-[#3A9D5D]">Pay</span>
            <span className="text-[#185FA5]">Board</span>
          </Link>

          <nav className="flex-1 space-y-1">
            {DASHBOARD_NAV_ITEMS.map(item => {
              const Icon = NAV_ICONS[item.href] ?? CalendarRange
              const active = isActivePath(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={cn(
                    'nav-item rounded-l-none rounded-r-md',
                    active && 'active'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto shrink-0 border-t border-border bg-(--bg-primary) p-3 shadow-[0_-4px_12px_-4px_rgb(0_0_0/0.07)]">
          <div className="mb-2 flex items-center gap-2">
            <div className={`avatar ${avatarClass}`}>{activeUser.name[0]?.toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-(--text-primary)">{activeUser.name}</div>
              <div className="truncate text-xs capitalize text-(--text-tertiary)">{activeUser.role}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-(--bg-secondary) px-2 py-1.5 text-xs font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex h-screen flex-col bg-(--bg-secondary) md:ml-(--sidebar-width)">
        <header className="sticky top-0 z-20 flex h-(--topbar-height) shrink-0 items-center justify-between border-b border-border bg-(--bg-primary) px-4 shadow-(--shadow-sm)">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-(--bg-secondary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) md:hidden"
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
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-(--bg-secondary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-(--bg-secondary) scrollbar-gutter-stable">
          <div className="page-container min-h-full">{children}</div>
        </main>
      </div>
    </div>
    </MyPayBoardProvider>
  )
}
