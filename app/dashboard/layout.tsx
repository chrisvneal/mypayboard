import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardShell } from './_components/DashboardShell'
import { ensureOnboarded } from '@/lib/onboarding'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure a Supabase household/user record exists before rendering
  await ensureOnboarded(userId)

  return <DashboardShell userId={userId}>{children}</DashboardShell>
}
