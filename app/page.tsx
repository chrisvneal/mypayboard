import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/marketing/LandingPage'

export const metadata: Metadata = {
  title: 'MyPayBoard — Paycheck-First Household Budgeting',
  description:
    'Plan what needs to be paid when you get paid. MyPayBoard is a paycheck-first budgeting workspace for couples and households — no calendar-month guesswork.',
  openGraph: {
    title: 'MyPayBoard — Paycheck-First Household Budgeting',
    description:
      'Plan what needs to be paid when you get paid. MyPayBoard is a paycheck-first budgeting workspace for couples and households — no calendar-month guesswork.',
    url: 'https://www.mypayboard.com',
    siteName: 'MyPayBoard',
  },
}

export default async function RootPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingPage />
}
 