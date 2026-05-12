'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Archive,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  Settings,
  Sun,
  WalletCards,
  X,
  LogOut,
} from 'lucide-react'
import type { User } from '@/lib/types'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  title: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Current Month', icon: LayoutDashboard, title: 'Current Month' },
  { href: '/dashboard/templates', label: 'Templates', icon: ListChecks, title: 'Templates' },
  { href: '/dashboard/master-list', label: 'Master List', icon: WalletCards, title: 'Master List' },
  { href: '/dashboard/debt-overview', label: 'Debt Overview', icon: CreditCard, title: 'Debt Overview' },
  { href: '/dashboard/archive', label: 'Archive', icon: Archive, title: 'Archive' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, title: 'Settings' },
]

function getUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem('mypayboard-user')
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [currentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    return getUserFromStorage()
  })
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const storedTheme = localStorage.getItem('mypayboard-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return storedTheme ? storedTheme === 'dark' : prefersDark
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login')
    }
  }, [currentUser, router])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('mypayboard-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const currentPageTitle = useMemo(() => {
    const item = NAV_ITEMS.find(nav => nav.href === pathname)
    return item?.title ?? 'Dashboard'
  }, [pathname])

  function isActivePath(href: string): boolean {
    return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  function handleThemeToggle() {
    setIsDarkMode(prev => !prev)
  }

  function handleSignOut() {
    localStorage.removeItem('mypayboard-user')
    router.replace('/login')
  }

  if (!currentUser) {
    return null
  }

  const avatarClass = currentUser.name.toLowerCase() === 'nicole' ? 'avatar-nicole' : 'avatar-chris'

  return (
    <div className="h-screen bg-(--bg-secondary) text-(--text-primary)">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-[220px] border-r border-(--border) bg-slate-50 shadow-sm transition-transform duration-200 md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-3">
          <div className="mb-4 px-2 py-3 text-xl font-semibold tracking-tight">
            <span className="text-[#185FA5]">My</span>
            <span className="text-[#3A9D5D]">Pay</span>
            <span className="text-[#185FA5]">Board</span>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = isActivePath(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`nav-item rounded-r-md rounded-l-none border-l-[3px] ${
                    active
                      ? 'border-l-[#185FA5] bg-[#E6F1FB] text-[#185FA5] font-medium'
                      : 'border-l-transparent text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-(--border) bg-white p-2 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className={`avatar ${avatarClass}`}>{currentUser.name[0]}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{currentUser.name}</div>
                <div className="text-xs text-slate-500 capitalize">{currentUser.role}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-(--border) px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="h-full md:ml-[220px]">
        <header className="sticky top-0 z-20 flex h-[56px] items-center justify-between border-b border-(--border) bg-white px-4 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--border) text-slate-600 hover:bg-slate-50 md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">{currentPageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--border) text-slate-600 hover:bg-slate-50"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden h-9 min-w-20 items-center justify-end rounded-md border border-dashed border-(--border) px-3 text-xs text-slate-400 sm:flex">
              Action
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-(--border) text-slate-600 hover:bg-slate-50 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="h-[calc(100vh-56px)] overflow-y-auto">
          <div className="page-container">{children}</div>
        </main>
      </div>
    </div>
  )
}
