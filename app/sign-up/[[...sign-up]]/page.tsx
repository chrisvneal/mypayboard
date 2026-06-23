'use client'

import { useSignUp } from '@clerk/nextjs/legacy'
import { useState } from 'react'
import { Logo } from '@/components/ui/Logo'

export default function SignUpPage() {
  const { signUp } = useSignUp()
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignUp() {
    if (!signUp) return
    setError(null)
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sign-in/sso-callback',
        redirectUrlComplete: '/dashboard',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
      console.error('Sign-up error:', err)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-[280px] xl:w-[320px] shrink-0 flex-col justify-between p-10"
        style={{ background: '#185FA5' }}
      >
        <Logo size="md" onDark />

        <div>
          <p className="text-3xl font-bold leading-snug text-white">
            Plan together.<br />
            <span style={{ color: '#3A9D5D' }}>Move forward.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            The paycheck-first budgeting tool built for households that move as a team.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          MyPayBoard · Household financial command center
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <Logo size="md" />
          </div>

          <h3 className="text-2xl font-semibold text-gray-900">Create an account</h3>
          <p className="mt-1.5 text-sm text-gray-500">Join your household on MyPayBoard</p>

          <div className="mt-8">
            <button
              onClick={handleGoogleSignUp}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            {error && (
              <p className="mt-3 text-center text-sm text-red-500">{error}</p>
            )}
          </div>

          <p className="mt-8 text-center text-sm" style={{ color: '#94A3B8' }}>
            Already have an account?{' '}
            <a href="/sign-in" className="font-medium hover:underline" style={{ color: '#185FA5' }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
