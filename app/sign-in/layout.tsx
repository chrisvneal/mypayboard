import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | MyPayBoard',
  description: 'Sign in to your MyPayBoard household workspace.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Sign In | MyPayBoard',
    description: 'Sign in to your MyPayBoard household workspace.',
    url: 'https://www.mypayboard.com/sign-in',
    siteName: 'MyPayBoard',
  },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
