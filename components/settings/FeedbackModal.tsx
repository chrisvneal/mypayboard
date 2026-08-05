'use client'

import { useState } from 'react'
import { AppModal } from '@/components/AppModal'
import { submitFeedback } from '@/app/actions/feedback'
import { errorMessage } from '@/lib/utils'
import type { FeedbackCategory } from '@/lib/types'

export type FeedbackModalProps = {
  open: boolean
  onClose: () => void
}

const labelClass = 'block text-[12px] font-medium tracking-normal text-(--text-secondary) mb-1.5'

const inputClass =
  'field-control h-9 w-full border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none focus:border-(--navy)'

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'general', label: 'General feedback' },
  { value: 'feature', label: 'Feature request' },
  { value: 'bug', label: 'Bug report' },
]

const MAX_LENGTH = 5000

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('general')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function reset() {
    setCategory('general')
    setMessage('')
    setError(null)
    setSent(false)
  }

  function handleClose() {
    if (pending) return
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      const result = await submitFeedback({ category, message })
      if (!result.success) {
        setError(result.message)
        setPending(false)
        return
      }
      setSent(true)
      setPending(false)
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Send feedback"
      description={sent ? undefined : 'Bugs, feature requests, or anything else on your mind.'}
      footer={
        sent ? (
          <button
            type="button"
            onClick={handleClose}
            className="btn-navy inline-flex h-9 cursor-pointer items-center px-4 text-[13px] font-medium shadow-(--shadow-sm)"
          >
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="inline-flex h-9 cursor-pointer items-center rounded-input border border-[--module-divider-color] px-4 text-[13px] font-medium text-(--text-primary) hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="feedback-form"
              disabled={pending || !message.trim()}
              className="btn-navy inline-flex h-9 cursor-pointer items-center px-4 text-[13px] font-medium shadow-(--shadow-sm) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Sending…' : 'Send'}
            </button>
          </>
        )
      }
    >
      {sent ? (
        <p className="text-[13px] text-(--text-primary)">Thanks for your feedback!</p>
      ) : (
        <form id="feedback-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-category" className={labelClass}>
              Feedback type
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={e => setCategory(e.target.value as FeedbackCategory)}
              disabled={pending}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="feedback-message" className={labelClass}>
              Your message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what you think…"
              rows={5}
              maxLength={MAX_LENGTH}
              disabled={pending}
              autoFocus
              className="field-control w-full resize-none border border-[--module-divider-color] bg-(--bg-primary) px-3 py-2 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none focus:border-(--navy)"
            />
            <p className="mt-1 text-[11px] text-(--text-tertiary)">
              {message.length}/{MAX_LENGTH}
            </p>
            {error && <p className="mt-2 text-[12px] text-(--danger)">{error}</p>}
          </div>
        </form>
      )}
    </AppModal>
  )
}
