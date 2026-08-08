'use server'

import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend'
import { FeedbackEmail } from '@/components/emails/FeedbackEmail'
import { checkRateLimit, formatRetryAfter } from '@/lib/rate-limit'
import type { FeedbackCategory, FeedbackResponse } from '@/lib/types'

const FEEDBACK_RECIPIENT = 'chrisvneal@gmail.com'
const MIN_LENGTH = 5
const MAX_LENGTH = 5000
const FEEDBACK_RATE_LIMIT = 5
const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000

interface SubmitFeedbackInput {
  category: FeedbackCategory
  message: string
}

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'general']),
  message: z
    .string()
    .trim()
    .min(MIN_LENGTH, 'Please write at least a few words of feedback.')
    .max(MAX_LENGTH, `Feedback is too long (max ${MAX_LENGTH} characters).`),
})

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackResponse> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const rateLimit = checkRateLimit(`submitFeedback:${clerkId}`, FEEDBACK_RATE_LIMIT, FEEDBACK_RATE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too much feedback sent recently. Please try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`,
    }
  }

  const parsed = feedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid feedback.' }
  }
  const { category, message: trimmedMessage } = parsed.data

  const supabase = await createClient()

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('name, email')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  try {
    const { error: sendError } = await getResend().emails.send({
      from: 'MyPayBoard <support@mypayboard.com>',
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
