'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { useUserPrefs, writeUserTheme } from '@/lib/userPrefs'
import { suppressThemeTransitions } from '@/lib/theme-transition'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
      <div className="border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-(--text-tertiary)">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-[--module-divider-color]">{children}</div>
    </section>
  )
}

function SettingsRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-3.5', className)}>{children}</div>
}

const labelClass =
  'block text-[11px] font-medium uppercase tracking-wider text-(--text-tertiary) mb-1.5'

const inputClass =
  'field-control h-9 w-full rounded-lg border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary) focus:border-(--navy)'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: User }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      style={{ backgroundColor: user.avatarColor }}
    >
      {userInitials(user.displayName ?? user.name)}
    </span>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-(--navy)' : 'border border-[--module-divider-color] bg-(--bg-tertiary)'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data, getCurrentUser, updateUser, updateWorkspaceName } = useMyPayBoard()
  const { prefs } = useUserPrefs()

  const currentUser = getCurrentUser()

  // Profile draft
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? currentUser?.name ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [profileSaved, setProfileSaved] = useState(false)
  const profileSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Workspace draft
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSaved, setWorkspaceSaved] = useState(false)
  const workspaceSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Theme — derived directly from prefs, no local state needed
  const isDark = prefs.theme === 'dark'

  function handleThemeToggle(next: boolean) {
    suppressThemeTransitions()
    document.documentElement.classList.toggle('dark', next)
    writeUserTheme(next ? 'dark' : 'light')
  }

  function handleSaveProfile() {
    if (!currentUser) return
    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()
    updateUser(currentUser.id, {
      displayName: trimmedName || undefined,
      name: trimmedName || currentUser.name,
      email: trimmedEmail || undefined,
    })
    setProfileSaved(true)
    if (profileSavedTimer.current) clearTimeout(profileSavedTimer.current)
    profileSavedTimer.current = setTimeout(() => setProfileSaved(false), 1500)
  }

  function handleSaveWorkspace() {
    updateWorkspaceName(workspaceName.trim())
    setWorkspaceSaved(true)
    if (workspaceSavedTimer.current) clearTimeout(workspaceSavedTimer.current)
    workspaceSavedTimer.current = setTimeout(() => setWorkspaceSaved(false), 1500)
  }

  if (!currentUser) return null

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Settings</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-(--text-secondary)">
          Manage your profile, appearance, and workspace.
        </p>
      </header>

      <div className="space-y-5 max-w-lg">

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <SettingsCard title="Profile">

          {/* Current user identity — display only */}
          <SettingsRow className="flex items-center gap-3">
            <UserAvatar user={currentUser} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-(--text-primary)">
                {currentUser.displayName ?? currentUser.name}
              </p>
              <p className="text-[12px] text-(--text-tertiary) capitalize">{currentUser.role}</p>
            </div>
          </SettingsRow>

          {/* Display name + Email — side by side */}
          <SettingsRow className="flex items-start gap-4">
            <div className="flex-1">
              <label htmlFor="settings-display-name" className={labelClass}>
                Display name
              </label>
              <input
                id="settings-display-name"
                className={inputClass}
                value={displayName}
                placeholder={currentUser.name}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="settings-email" className={labelClass}>
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                className={inputClass}
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </SettingsRow>

          {/* Save */}
          <SettingsRow className="flex items-center justify-end gap-3">
            {profileSaved && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-(--green)">
                <Check className="size-3.5" strokeWidth={2.5} />
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
            >
              Save
            </button>
          </SettingsRow>
        </SettingsCard>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <SettingsCard title="Appearance">
          <SettingsRow className="flex items-center justify-between gap-4">
            <label htmlFor="settings-dark-mode" className="flex items-center gap-2.5 cursor-pointer">
              {isDark
                ? <Moon className="size-4 text-(--text-secondary)" strokeWidth={1.75} />
                : <Sun className="size-4 text-(--text-secondary)" strokeWidth={1.75} />
              }
              <span className="text-[13px] font-medium text-(--text-primary)">
                {isDark ? 'Dark mode' : 'Light mode'}
              </span>
            </label>
            <ToggleSwitch
              id="settings-dark-mode"
              checked={isDark}
              onChange={handleThemeToggle}
            />
          </SettingsRow>
        </SettingsCard>

        {/* ── Workspace ───────────────────────────────────────────────────── */}
        <SettingsCard title="Workspace">

          {/* Current name + Rename — side by side */}
          <SettingsRow className="flex items-start gap-6">
            <div className="flex-1">
              <p className={labelClass}>Current name</p>
              <p className="text-[14px] font-semibold text-(--text-primary)">
                {data.workspaceName
                  ? data.workspaceName
                  : <span className="font-normal italic text-(--text-tertiary)">Not set</span>
                }
              </p>
            </div>
            <div className="flex-1">
              <label htmlFor="settings-workspace-name" className={labelClass}>
                Rename workspace
              </label>
              <input
                id="settings-workspace-name"
                className={inputClass}
                value={workspaceName}
                placeholder="Type a new name…"
                onChange={e => setWorkspaceName(e.target.value)}
              />
            </div>
          </SettingsRow>

          {/* Save workspace */}
          <SettingsRow className="flex items-center justify-end gap-3">
            {workspaceSaved && (
              <span className="flex items-center gap-1 text-[12px] font-medium text-(--green)">
                <Check className="size-3.5" strokeWidth={2.5} />
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveWorkspace}
              className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
            >
              Save
            </button>
          </SettingsRow>

          {/* Members */}
          <div className="border-t border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-(--text-tertiary)">
              Members
            </h3>
          </div>
          {data.users.map(member => (
            <SettingsRow key={member.id} className="flex items-center gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ backgroundColor: member.avatarColor }}
              >
                {userInitials(member.displayName ?? member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-(--text-primary)">
                  {member.displayName ?? member.name}
                </p>
                {member.email && (
                  <p className="text-[11px] text-(--text-tertiary)">{member.email}</p>
                )}
              </div>
              {member.id === currentUser.id && (
                <span className="shrink-0 rounded-full bg-(--navy-light) px-2 py-0.5 text-[10px] font-medium text-(--navy)">
                  You
                </span>
              )}
            </SettingsRow>
          ))}
        </SettingsCard>

      </div>
    </div>
  )
}
