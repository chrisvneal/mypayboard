'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { validateInviteToken, acceptInvite } from '@/app/actions/invites'
import type { InviteValidation } from '@/lib/types'
import { Logo } from '@/components/ui/Logo'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  const token = searchParams.get('token') ?? ''

  const [validation, setValidation] = useState<InviteValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const result = await validateInviteToken(token)
      if (cancelled) return
      setValidation(result)
      setLoading(false)

      if (isSignedIn && result.valid) {
        setAccepting(true)
        const acceptResult = await acceptInvite(token)
        if (cancelled) return
        if (acceptResult.success) {
          router.push(acceptResult.redirectTo || '/dashboard')
        } else {
          setAcceptError(acceptResult.message)
          setAccepting(false)
        }
      }
    }

    if (isLoaded) void run()
    return () => { cancelled = true }
  }, [token, isSignedIn, isLoaded, router])

  if (loading || !isLoaded) {
    return <CenteredCard><Spinner /><p className="mt-4 text-sm text-gray-500">Loading invitation…</p></CenteredCard>
  }

  if (!validation?.valid || acceptError) {
    return (
      <CenteredCard>
        <h1 className="text-xl font-semibold text-gray-900">Invitation invalid</h1>
        <p className="mt-2 text-sm text-gray-500">
          {acceptError || validation?.message || 'This invitation could not be found or is no longer valid.'}
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-input px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#185FA5' }}
        >
          Go to MyPayBoard
        </a>
      </CenteredCard>
    )
  }

  if (accepting) {
    return (
      <CenteredCard><Spinner /><p className="mt-4 text-sm text-gray-500">Joining household…</p></CenteredCard>
    )
  }

  if (!isSignedIn) {
    const redirectTarget = `/join?token=${encodeURIComponent(token)}`
    return (
      <CenteredCard>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited!</h1>
        <p className="mt-3 text-sm text-gray-500">
          {validation.inviterName || 'Someone'} invited you to join
          {validation.householdName ? ` "${validation.householdName}"` : ' their household'} on MyPayBoard.
        </p>
        <a
          href={`/sign-up?redirect_url=${encodeURIComponent(redirectTarget)}`}
          className="mt-6 block w-full rounded-input px-4 py-2.5 text-center text-sm font-medium text-white"
          style={{ backgroundColor: '#185FA5' }}
        >
          Sign up to accept
        </a>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a
            href={`/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}`}
            className="font-medium hover:underline"
            style={{ color: '#185FA5' }}
          >
            Sign in
          </a>
        </p>
      </CenteredCard>
    )
  }

  return null
}

function Spinner() {
  return (
    <div
      className="mx-auto size-10 animate-spin rounded-full border-2 border-t-transparent"
      style={{ borderColor: '#185FA5', borderTopColor: 'transparent' }}
    />
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        {children}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<CenteredCard><Spinner /></CenteredCard>}>
      <JoinContent />
    </Suspense>
  )
}
