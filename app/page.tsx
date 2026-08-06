import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/marketing/LandingPage'

export default async function RootPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingPage />
}
 