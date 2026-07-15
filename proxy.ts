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

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up/sso-callback'])

export default clerkMiddleware(async (auth, request) => {
  // Gate the sign-up page, but allow the OAuth callback route Clerk redirects to.
  if (
    request.nextUrl.pathname.startsWith('/sign-up') &&
    !request.nextUrl.pathname.startsWith('/sign-up/sso-callback')
  ) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
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
