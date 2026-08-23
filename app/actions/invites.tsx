'use server'

import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveHouseholdId } from '@/lib/supabase/household'
import { getResend } from '@/lib/resend'
import { InviteEmail } from '@/components/emails/InviteEmail'
import { randomAvatarColor } from '@/components/modules/header-colors'
import { checkRateLimit, formatRetryAfter } from '@/lib/rate-limit'
import type { InviteActionResult, InviteValidation } from '@/lib/types'

// lib/utils.ts pulls in client-only hooks (useIsClient, etc.) — importing it
// here would drag those into this server-only module's bundle, so this file
// keeps its own tiny copy instead of sharing lib/utils.errorMessage.
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const MEMBER_LIMIT = 2
const INVITE_EXPIRY_DAYS = 7
const INVITE_RATE_LIMIT = 5
const INVITE_RATE_WINDOW_MS = 60 * 60 * 1000

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Enter a valid email address.')
  .pipe(z.string().email('Enter a valid email address.'))

// Random hex tokens (see randomBytes(24).toString('hex') below) are 48 chars —
// generous upper bound just to reject garbage before it reaches Supabase.
const tokenSchema = z
  .string()
  .trim()
  .min(1, 'No invitation token provided.')
  .max(128, 'This invitation is no longer valid.')

async function getAppOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'mypayboard.com'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

type OwnerLookup =
  | { ok: true; me: { id: string; householdId: string; name: string; email: string | null } }
  | { ok: false; message: string }

/** Resolves the signed-in Clerk user and confirms they own their household — shared by every invite-management action below. */
async function resolveInviteOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clerkId: string
): Promise<OwnerLookup> {
  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { ok: false, message: 'Could not resolve your account.' }

  const householdId = await resolveHouseholdId(supabase, me.id)
  if (!householdId) return { ok: false, message: 'Could not resolve your household.' }

  const { data: membership, error: membershipError } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', me.id)
    .single()

  if (membershipError || membership?.role !== 'owner') {
    return { ok: false, message: 'Only the household owner can manage invites.' }
  }

  return { ok: true, me: { ...me, householdId } }
}

/**
 * A household is "trivial" — safe to silently abandon when its sole member
 * switches into an invited household — only when it has no budgeting data
 * of its own and no one else in it. Checked before ever repointing
 * users.household_id, since that's a one-way move (multi-household isn't
 * supported, so there's no going back without another manual switch).
 */
async function isHouseholdTrivial(
  admin: ReturnType<typeof createAdminClient>,
  householdId: string
): Promise<boolean> {
  const [{ count: creditorCount }, { count: incomeCount }, { count: boardCount }, { count: memberCount }] =
    await Promise.all([
      admin.from('creditors').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
      admin.from('incomes').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
      admin.from('boards').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
      admin.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', householdId),
    ])

  return (
    (creditorCount ?? 0) === 0 &&
    (incomeCount ?? 0) === 0 &&
    (boardCount ?? 0) === 0 &&
    (memberCount ?? 0) <= 1
  )
}

/** Household owner invites someone by email. Owner-only, capped at MEMBER_LIMIT. */
export async function createInvite(email: string): Promise<InviteActionResult> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const rateLimit = checkRateLimit(`createInvite:${clerkId}`, INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too many invites sent. Please try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`,
    }
  }

  const parsedEmail = emailSchema.safeParse(email)
  if (!parsedEmail.success) {
    return { success: false, message: parsedEmail.error.issues[0]?.message ?? 'Enter a valid email address.' }
  }
  const trimmedEmail = parsedEmail.data

  const supabase = await createClient()

  const ownerLookup = await resolveInviteOwner(supabase, clerkId)
  if (!ownerLookup.ok) return { success: false, message: ownerLookup.message }
  const me = ownerLookup.me

  if (me.email && trimmedEmail === me.email.trim().toLowerCase()) {
    return {
      success: false,
      message: "You can't invite yourself — you're already a member of this household.",
    }
  }

  const { count: memberCount, error: countError } = await supabase
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', me.householdId)

  if (countError) {
    return { success: false, message: 'Could not verify member limit. Please try again.' }
  }
  if ((memberCount ?? 0) >= MEMBER_LIMIT) {
    return {
      success: false,
      message: "You've reached the member limit for your plan. Upgrade to add more members.",
    }
  }

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', me.householdId)
    .single()

  // household_invites has no client-facing insert policy yet (Phase 1 was
  // select-only) — write via the service-role client, same pattern as
  // lib/onboarding.ts. Authorization is already enforced above via the
  // RLS-scoped owner/limit checks.
  const admin = createAdminClient()

  const { data: existingInvite } = await admin
    .from('household_invites')
    .select('id, expires_at')
    .eq('household_id', me.householdId)
    .eq('email', trimmedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
    return { success: false, message: `An invite is already pending for ${trimmedEmail}.` }
  }

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await admin.from('household_invites').insert({
    household_id: me.householdId,
    email: trimmedEmail,
    token,
    status: 'pending',
    invited_by: me.id,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('createInvite: insert failed', insertError)
    return { success: false, message: 'Failed to create invite. Please try again.' }
  }

  const origin = await getAppOrigin()
  const joinUrl = `${origin}/join?token=${token}`

  try {
    const { error: sendError } = await getResend().emails.send({
      from: 'MyPayBoard <support@mypayboard.com>',
      to: trimmedEmail,
      subject: `${me.name} invited you to MyPayBoard`,
      react: (
        <InviteEmail
          inviterName={me.name}
          householdName={household?.name ?? undefined}
          joinUrl={joinUrl}
        />
      ),
    })
    if (sendError) {
      console.error('createInvite: resend error', sendError)
      return { success: false, message: 'Invite saved, but the email failed to send. Please try again.' }
    }
  } catch (err) {
    console.error('createInvite: resend threw', errorMessage(err))
    return { success: false, message: 'Invite saved, but the email failed to send. Please try again.' }
  }

  return { success: true, message: `Invitation sent to ${trimmedEmail}.` }
}

/** Household owner revokes a pending invite, freeing its email up to be re-invited immediately. */
export async function cancelInvite(inviteId: string): Promise<InviteActionResult> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const supabase = await createClient()
  const ownerLookup = await resolveInviteOwner(supabase, clerkId)
  if (!ownerLookup.ok) return { success: false, message: ownerLookup.message }

  // household_invites has no client-facing update policy — same service-role
  // pattern as the insert in createInvite. The household_id + status filters
  // keep this scoped to the caller's own pending invite even though the
  // admin client bypasses RLS.
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('household_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('household_id', ownerLookup.me.householdId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('cancelInvite: update failed', updateError)
    return { success: false, message: 'Failed to cancel invite. Please try again.' }
  }

  return { success: true, message: 'Invite canceled.' }
}

/** Household owner re-sends a pending invite with a fresh token and expiry, in case the original email never arrived or expired. */
export async function resendInvite(inviteId: string): Promise<InviteActionResult> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const rateLimit = checkRateLimit(`createInvite:${clerkId}`, INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS)
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: `Too many invites sent. Please try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`,
    }
  }

  const supabase = await createClient()
  const ownerLookup = await resolveInviteOwner(supabase, clerkId)
  if (!ownerLookup.ok) return { success: false, message: ownerLookup.message }
  const me = ownerLookup.me

  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin
    .from('household_invites')
    .select('id, email, status')
    .eq('id', inviteId)
    .eq('household_id', me.householdId)
    .maybeSingle()

  if (inviteError || !invite || invite.status !== 'pending') {
    return { success: false, message: 'This invite is no longer available to resend.' }
  }

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', me.householdId)
    .single()

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await admin
    .from('household_invites')
    .update({ token, expires_at: expiresAt })
    .eq('id', invite.id)

  if (updateError) {
    console.error('resendInvite: update failed', updateError)
    return { success: false, message: 'Failed to resend invite. Please try again.' }
  }

  const origin = await getAppOrigin()
  const joinUrl = `${origin}/join?token=${token}`

  try {
    const { error: sendError } = await getResend().emails.send({
      from: 'MyPayBoard <support@mypayboard.com>',
      to: invite.email,
      subject: `${me.name} invited you to MyPayBoard`,
      react: (
        <InviteEmail
          inviterName={me.name}
          householdName={household?.name ?? undefined}
          joinUrl={joinUrl}
        />
      ),
    })
    if (sendError) {
      console.error('resendInvite: resend error', sendError)
      return { success: false, message: 'Failed to resend the email. Please try again.' }
    }
  } catch (err) {
    console.error('resendInvite: resend threw', errorMessage(err))
    return { success: false, message: 'Failed to resend the email. Please try again.' }
  }

  return { success: true, message: `Invitation resent to ${invite.email}.` }
}

/** Public lookup for the /join landing screen — no auth required. */
export async function validateInviteToken(token: string): Promise<InviteValidation> {
  const parsedToken = tokenSchema.safeParse(token)
  if (!parsedToken.success) {
    return { valid: false, message: parsedToken.error.issues[0]?.message ?? 'No invitation token provided.' }
  }

  const admin = createAdminClient()

  const { data: invite, error } = await admin
    .from('household_invites')
    .select('id, household_id, status, expires_at, invited_by')
    .eq('token', parsedToken.data)
    .maybeSingle()

  if (error || !invite) {
    return { valid: false, message: 'This invitation is no longer valid.' }
  }
  if (invite.status !== 'pending') {
    return { valid: false, message: 'This invitation is no longer valid.' }
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { valid: false, message: 'This invitation has expired.' }
  }

  const [{ data: household }, { data: inviter }] = await Promise.all([
    admin.from('households').select('name').eq('id', invite.household_id).maybeSingle(),
    invite.invited_by
      ? admin.from('users').select('name').eq('id', invite.invited_by).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ])

  return {
    valid: true,
    householdName: household?.name ?? undefined,
    inviterName: inviter?.name ?? undefined,
  }
}

/**
 * Accepts a pending invite for the signed-in Clerk user. A brand-new
 * invitee (arrived via /join before ever hitting /dashboard) has no Supabase
 * `users` row yet — ensureOnboarded's solo-household RPC never ran, so this
 * creates their row directly under the inviter's household instead of a
 * throwaway household of their own.
 */
export async function acceptInvite(token: string): Promise<InviteActionResult> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const parsedToken = tokenSchema.safeParse(token)
  if (!parsedToken.success) {
    return { success: false, message: parsedToken.error.issues[0]?.message ?? 'This invitation is no longer valid.' }
  }

  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin
    .from('household_invites')
    .select('id, household_id, status, expires_at')
    .eq('token', parsedToken.data)
    .maybeSingle()

  if (inviteError || !invite) return { success: false, message: 'This invitation is no longer valid.' }
  if (invite.status !== 'pending') return { success: false, message: 'This invitation is no longer valid.' }
  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, message: 'This invitation has expired.' }
  }

  const supabase = await createClient()
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .maybeSingle()

  // Admin client — RLS's is_household_member() would otherwise gate this on
  // the very membership row being resolved.
  const existingHouseholdId = existingUser ? await resolveHouseholdId(admin, existingUser.id) : null

  if (existingUser && existingHouseholdId === invite.household_id) {
    return { success: true, message: 'You are already a member of this household.', redirectTo: '/dashboard' }
  }

  if (existingUser && existingHouseholdId) {
    // Multi-household isn't supported yet, so switching households means
    // abandoning the old one entirely — only safe to do that silently when
    // there's nothing of theirs to lose (no bills/income/boards, and no one
    // else in that household depending on it).
    const trivial = await isHouseholdTrivial(admin, existingHouseholdId)
    if (!trivial) {
      return {
        success: false,
        message: 'Your account is already linked to another workspace. Multi-workspace support is coming soon.',
      }
    }
  }

  const { count: memberCount } = await admin
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', invite.household_id)

  if ((memberCount ?? 0) >= MEMBER_LIMIT) {
    return { success: false, message: 'This household has reached its member limit.' }
  }

  let userId: string

  if (existingUser) {
    if (!existingHouseholdId) {
      // Stale account with no household_members row at all (see
      // create_household_for_user's backfill note) — nothing to abandon,
      // just proceed to join below.
      console.warn('acceptInvite: existing user had no household_members row', existingUser.id)
    }

    // Empty household confirmed above (when one existed) — repoint their
    // existing row rather than creating a duplicate. household_id remains
    // required (NOT NULL) on `users` until it's dropped, so this write
    // stays even though the app no longer reads it as the source of truth.
    const { error: updateError } = await admin
      .from('users')
      .update({ household_id: invite.household_id })
      .eq('id', existingUser.id)

    if (updateError) {
      console.error('acceptInvite: household switch failed', updateError)
      return { success: false, message: 'Failed to join household. Please try again.' }
    }
    userId = existingUser.id

    if (existingHouseholdId) {
      const { error: cleanupError } = await admin
        .from('household_members')
        .delete()
        .eq('household_id', existingHouseholdId)
        .eq('user_id', existingUser.id)

      if (cleanupError) {
        // Non-fatal — the switch itself already succeeded; this would just
        // leave a stale membership row on the abandoned (trivial) household.
        console.error('acceptInvite: failed to clean up old membership', cleanupError)
      }
    }
  } else {
    const clerkUser = await clerkCurrentUser()
    if (!clerkUser) return { success: false, message: 'Could not resolve your account.' }

    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? null
    const displayName = clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
      : (primaryEmail ?? 'User')

    const { data: newUser, error: insertUserError } = await admin
      .from('users')
      .insert({
        household_id: invite.household_id,
        clerk_id: clerkId,
        name: displayName,
        avatar_color: randomAvatarColor(),
        email: primaryEmail,
      })
      .select('id')
      .single()

    if (insertUserError || !newUser) {
      console.error('acceptInvite: user insert failed', insertUserError)
      return { success: false, message: 'Failed to join household. Please try again.' }
    }
    userId = newUser.id
  }

  const { error: memberError } = await admin
    .from('household_members')
    .upsert(
      { household_id: invite.household_id, user_id: userId, role: 'member' },
      { onConflict: 'household_id,user_id', ignoreDuplicates: true }
    )

  if (memberError) {
    console.error('acceptInvite: membership insert failed', memberError)
    return { success: false, message: 'Failed to join household. Please try again.' }
  }

  await admin
    .from('household_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('status', 'pending')

  return { success: true, message: 'You have joined the household!', redirectTo: '/dashboard' }
}
