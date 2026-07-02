'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Check, Moon } from 'lucide-react'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { useUserPrefs } from '@/lib/userPrefs'
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
        <h2 className="text-[11px] font-semibold tracking-normal text-(--text-secondary)">
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

// Fields + save button as one undivided block — matches the Workspace form pattern
function SettingsFormBlock({
  children,
  saved,
  onSave,
}: {
  children: ReactNode
  saved: boolean
  onSave: () => void
}) {
  return (
    <form
      className="px-4 py-5 space-y-4"
      onSubmit={e => { e.preventDefault(); onSave() }}
      noValidate={false}
    >
      {children}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-[12px] font-medium text-(--green)">
            <Check className="size-3.5" strokeWidth={2.5} />
            Saved
          </span>
        )}
        <button
          type="submit"
          className="btn-navy inline-flex h-8 cursor-pointer items-center px-4 text-[13px] font-medium shadow-(--shadow-sm)"
        >
          Save
        </button>
      </div>
    </form>
  )
}

const labelClass =
  'block text-[12px] font-medium tracking-normal text-(--text-secondary) mb-1.5'

const inputClass =
  'field-control h-9 w-full border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary) focus:border-(--navy)'

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: User }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      style={{ backgroundColor: user.avatarColor }}
    >
      {userInitials(user.name)}
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
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center"
    >
      <span
        className={cn(
          'relative h-6 w-10 rounded-full transition-colors duration-200',
          checked ? 'bg-(--navy)' : 'border border-[--module-divider-color] bg-(--bg-tertiary)'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left] duration-200',
            checked ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </span>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data, getCurrentUser, updateUser, updateWorkspaceName } = useMyPayBoard()
  const { prefs, patch: patchPrefs } = useUserPrefs()

  const currentUser = getCurrentUser()

  // Profile draft
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
    patchPrefs({ theme: next ? 'dark' : 'light' })
  }

  function handleSaveProfile() {
    if (!currentUser) return
    const trimmedEmail = email.trim()
    updateUser(currentUser.id, {
      email: trimmedEmail || undefined,
    })
    setEmail('')
    setProfileSaved(true)
    if (profileSavedTimer.current) clearTimeout(profileSavedTimer.current)
    profileSavedTimer.current = setTimeout(() => setProfileSaved(false), 1500)
  }

  function handleSaveWorkspace() {
    updateWorkspaceName(workspaceName.trim())
    setWorkspaceName('')
    setWorkspaceSaved(true)
    if (workspaceSavedTimer.current) clearTimeout(workspaceSavedTimer.current)
    workspaceSavedTimer.current = setTimeout(() => setWorkspaceSaved(false), 1500)
  }

  if (!currentUser) return null

  return (
    <div className="mx-auto max-w-lg space-y-8 md:mx-0">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Settings</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-(--text-secondary)">
          Manage your profile, appearance, and workspace.
        </p>
      </header>

      <div className="space-y-5">

        {/* ── Profile ─────────────────────────────────────────────────────── */}
        <SettingsCard title="Profile">

          {/* Current user identity — display only */}
          <SettingsRow className="flex items-center gap-3">
            <UserAvatar user={currentUser} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-(--text-primary)">
                {currentUser.name}
              </p>
              <p className="text-[12px] text-(--text-tertiary) capitalize">{currentUser.role}</p>
            </div>
          </SettingsRow>

          <SettingsFormBlock saved={profileSaved} onSave={handleSaveProfile}>
            <div className="flex-1">
              <label htmlFor="settings-email" className={labelClass}>
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                required
                className={inputClass}
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </SettingsFormBlock>
        </SettingsCard>

        {/* ── Workspace ───────────────────────────────────────────────────── */}
        <SettingsCard title="Workspace">

          <SettingsFormBlock saved={workspaceSaved} onSave={handleSaveWorkspace}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
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
                  placeholder={data.workspaceName ? '' : 'Type a new name…'}
                  onChange={e => setWorkspaceName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveWorkspace() }}
                />
              </div>
            </div>
          </SettingsFormBlock>

          {/* Members — single wrapper so divide-y only draws one line above the whole block */}
          <div className="border-t border-[--module-divider-color]">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[11px] font-semibold tracking-normal text-(--text-secondary)">
                Members
              </p>
            </div>
            {data.users.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {userInitials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-(--text-primary)">
                    {member.name}
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
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <SettingsCard title="Appearance">
          <SettingsRow className="flex items-center justify-between gap-4">
            <label htmlFor="settings-dark-mode" className="flex items-center gap-2.5 cursor-pointer">
              <Moon className="size-4 text-(--text-secondary)" strokeWidth={1.75} />
              <span className="text-[13px] font-medium text-(--text-primary)">Dark mode</span>
            </label>
            <ToggleSwitch
              id="settings-dark-mode"
              checked={isDark}
              onChange={handleThemeToggle}
            />
          </SettingsRow>
        </SettingsCard>

      </div>
    </div>
  )
}
