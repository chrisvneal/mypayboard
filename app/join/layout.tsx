import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join Household | MyPayBoard',
  description: 'Accept an invitation to join a household workspace on MyPayBoard.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Join Household | MyPayBoard',
    description: 'Accept an invitation to join a household workspace on MyPayBoard.',
    url: 'https://www.mypayboard.com/join',
    siteName: 'MyPayBoard',
  },
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}
