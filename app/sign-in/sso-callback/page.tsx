'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/sign-in"
        signUpFallbackRedirectUrl="/sign-in"
        continueSignUpUrl="/sign-in"
      />
      <div id="clerk-captcha" />
    </>
  )
}
