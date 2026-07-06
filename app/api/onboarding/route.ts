import { auth } from '@clerk/nextjs/server'
import { ensureOnboarded } from '@/lib/onboarding'
import { NextResponse } from 'next/server'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await ensureOnboarded(userId)
  if (!result) {
    return NextResponse.json({ error: 'Failed to onboard user' }, { status: 500 })
  }

  return NextResponse.json(result)
}
