import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | MyPayBoard',
  description: 'Create a MyPayBoard account and start planning your household paychecks.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Sign Up | MyPayBoard',
    description: 'Create a MyPayBoard account and start planning your household paychecks.',
    url: 'https://www.mypayboard.com/sign-up',
    siteName: 'MyPayBoard',
  },
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children
}
