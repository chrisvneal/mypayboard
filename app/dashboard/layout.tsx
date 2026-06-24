import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { DashboardShell } from './_components/DashboardShell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return <DashboardShell userId={userId}>{children}</DashboardShell>
}
