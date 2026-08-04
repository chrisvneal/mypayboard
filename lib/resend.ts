import { Resend } from 'resend'

/** Shared Resend client — server-only, reads RESEND_API_KEY. */
export const resend = new Resend(process.env.RESEND_API_KEY)
