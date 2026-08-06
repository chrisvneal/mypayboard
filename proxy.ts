import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Private beta: sign-up is gated.
//
// Option A (preferred) — disable "Allow sign-ups" in the Clerk Dashboard and
//   restrict to invited users only. No code gate needed here.
//
// Option B (active) — redirect /sign-up to /sign-in at the edge so the route
//   is unreachable regardless of Clerk dashboard settings. Switch to Option A
//   once the Clerk Dashboard is configured and remove the redirect below.

// /join is public so an invitee can see who invited them and to what
// household before ever signing in. /sign-up stays gated except when arriving
// via a real invite link (redirect_url pointing back to /join) — everyone
// else still bounces to /sign-in, same as before.
const isPublicRoute = createRouteMatcher(['/', '/privacy', '/terms', '/sign-in(.*)', '/sign-up(.*)', '/join(.*)'])

export default clerkMiddleware(async (auth, request) => {
  const isSignUpRoute =
    request.nextUrl.pathname.startsWith('/sign-up') &&
    !request.nextUrl.pathname.startsWith('/sign-up/sso-callback')

  if (isSignUpRoute) {
    const redirectParam = request.nextUrl.searchParams.get('redirect_url') ?? ''
    const isInviteSignUp = redirectParam.startsWith('/join')
    if (!isInviteSignUp) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
