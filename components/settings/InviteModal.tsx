'use client'

import { useState } from 'react'
import { AppModal } from '@/components/AppModal'
import { createInvite } from '@/app/actions/invites'
import { errorMessage } from '@/lib/utils'

export type InviteModalProps = {
  open: boolean
  onClose: () => void
  onSent: (message: string) => void
}

const labelClass = 'block text-[12px] font-medium tracking-normal text-(--text-secondary) mb-1.5'

const inputClass =
  'field-control h-9 w-full border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary) focus:border-(--navy)'

export function InviteModal({ open, onClose, onSent }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (pending) return
    setEmail('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      const result = await createInvite(email)
      if (!result.success) {
        setError(result.message)
        setPending(false)
        return
      }
      setEmail('')
      setPending(false)
      onSent(result.message)
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Invite a member"
      description="They'll get an email with a link to join your household. The invite expires in 7 days."
      footer={
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
            form="invite-member-form"
            disabled={pending || !email}
            className="btn-navy inline-flex h-9 cursor-pointer items-center px-4 text-[13px] font-medium shadow-(--shadow-sm) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send invite'}
          </button>
        </>
      }
    >
      <form id="invite-member-form" onSubmit={handleSubmit}>
        <label htmlFor="invite-email" className={labelClass}>
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          required
          autoFocus
          disabled={pending}
          className={inputClass}
          placeholder="partner@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <p className="mt-2 text-[12px] text-(--danger)">{error}</p>}
      </form>
    </AppModal>
  )
}
