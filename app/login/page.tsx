'use client'

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { USERS } from '@/lib/mockData'
import type { User } from '@/lib/types'
import { readLastDashboardPath } from '@/lib/dashboard-route-storage'

const SHARED_PASSWORD = 'family2026'
const DATA_STORAGE_KEY = 'mypayboard-data'
const SESSION_USER_KEY = 'mypayboard-user'

export default function LoginPage() {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<User>(USERS[0])
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useLayoutEffect(() => {
    const existingUser = getStoredUser()
    if (existingUser) {
      router.replace(readLastDashboardPath())
      return
    }
    queueMicrotask(() => setSessionChecked(true))
  }, [router])

  function handleLogin() {
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (password !== SHARED_PASSWORD) {
      setError('Incorrect password. Please try again.')
      return
    }
    setLoading(true)
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(selectedUser))
    syncCurrentUser(selectedUser.id)
    setTimeout(() => router.push(readLastDashboardPath()), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  if (!sessionChecked) {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E6F1FB 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              background: '#185FA5',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>💰</div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#185FA5', lineHeight: 1 }}>
                My<span style={{ color: '#3A9D5D' }}>Pay</span>Board
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Household financial command center
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)',
          border: '1px solid #E2E8F0',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '6px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>
            Who&apos;s signing in today?
          </p>

          {/* User selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {USERS.map(user => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); setError('') }}
                style={{
                  padding: '16px 12px',
                  borderRadius: '12px',
                  border: `2px solid ${selectedUser.id === user.id ? '#185FA5' : '#E2E8F0'}`,
                  background: selectedUser.id === user.id ? '#E6F1FB' : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: user.id === 'user-chris' ? '#E6F1FB' : '#E8F7EE',
                  color: user.id === 'user-chris' ? '#185FA5' : '#2A7A47',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  margin: '0 auto 8px',
                  border: `2px solid ${user.id === 'user-chris' ? '#185FA5' : '#2A7A47'}`,
                }}>
                  {user.name[0]}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: selectedUser.id === user.id ? '#185FA5' : '#0F172A',
                }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', textTransform: 'capitalize' }}>
                  {user.role}
                </div>
              </button>
            ))}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: '#475569',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Enter shared password"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1px solid ${error ? '#DC2626' : '#E2E8F0'}`,
                fontSize: '14px',
                color: '#0F172A',
                outline: 'none',
                background: '#F8FAFC',
                transition: 'border-color 0.15s',
              }}
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              fontSize: '12px',
              color: '#DC2626',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              background: loading ? '#94A3B8' : '#185FA5',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in...' : `Sign in as ${selectedUser.name}`}
          </button>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#CBD5E1', marginTop: '20px' }}>
          MyPayBoard · Private household use only
        </p>
      </div>
    </div>
  )
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<User>
    return USERS.find(user => user.id === parsed.id) ?? null
  } catch {
    return null
  }
}

function syncCurrentUser(userId: string) {
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { currentUserId?: string }
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify({ ...data, currentUserId: userId }))
  } catch {
    // The app can safely fall back to seed data if stored data is malformed.
  }
}
