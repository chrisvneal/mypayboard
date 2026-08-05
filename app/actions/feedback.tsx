'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { FeedbackEmail } from '@/components/emails/FeedbackEmail'
import type { FeedbackCategory, FeedbackResponse } from '@/lib/types'

const FEEDBACK_RECIPIENT = 'chrisvneal@gmail.com'
const MIN_LENGTH = 5
const MAX_LENGTH = 5000

interface SubmitFeedbackInput {
  category: FeedbackCategory
  message: string
}

export async function submitFeedback({ category, message }: SubmitFeedbackInput): Promise<FeedbackResponse> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const trimmedMessage = message.trim()
  if (trimmedMessage.length < MIN_LENGTH) {
    return { success: false, message: 'Please write at least a few words of feedback.' }
  }
  if (trimmedMessage.length > MAX_LENGTH) {
    return { success: false, message: `Feedback is too long (max ${MAX_LENGTH} characters).` }
  }

  const supabase = await createClient()

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('name, email')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  try {
    const { error: sendError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: FEEDBACK_RECIPIENT,
      subject: `MyPayBoard feedback: ${category}`,
      react: (
        <FeedbackEmail
          senderName={me.name}
          senderEmail={me.email ?? 'unknown'}
          category={category}
          message={trimmedMessage}
        />
      ),
    })

    if (sendError) {
      console.error('submitFeedback: resend error', sendError)
      return { success: false, message: 'Failed to send feedback. Please try again.' }
    }
  } catch (err) {
    console.error('submitFeedback: resend threw', err instanceof Error ? err.message : String(err))
    return { success: false, message: 'Failed to send feedback. Please try again.' }
  }

  return { success: true, message: 'Thanks for your feedback!' }
}
