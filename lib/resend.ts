import { Resend } from 'resend'

// Lazy singleton — the Resend constructor throws synchronously if
// RESEND_API_KEY is missing. Next.js bundles server actions used on the
// same page together, so a top-level `new Resend(...)` here would crash
// every action sharing a bundle with an email-sending one (e.g. the
// Settings page's member loading, which has nothing to do with email) the
// moment RESEND_API_KEY is unset in an environment — not just the send
// itself. Constructing on first use confines that failure to whichever
// action actually tries to send.
let client: Resend | null = null

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}
