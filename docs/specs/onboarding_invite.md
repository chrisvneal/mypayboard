# Onboarding & Invitation System — Spec

**Status:** Mostly implemented — see inline ✅ notes (updated August 7, 2026). Remaining gaps: `/help` route (Section 4), landing page SEO pass (Section 5).
**Owner:** Chris
**Depends on:** Existing Clerk ↔ Supabase identity bridge (Session 2), existing household creation trigger, existing user_prefs jsonb pattern

## Goal

Get a first-time visitor from the landing page, through Google sign-up, into a populated first Pay Date Card in under a minute — then let a household grow to two collaborators for free before any paid tier applies.

No anonymous/guest state. No local-only data layer. Sign-up is the front door.

---

## 1. Sign-Up & Identity

- Google OAuth via Clerk only for v1. Do not build email/password or magic-link flows now — Clerk supports adding additional sign-in methods later without a migration, so this is a cheap door to reopen, not a permanent limitation.
- No anonymous/guest session of any kind. The first meaningful entry point into the app is immediately after Google sign-up completes.
- The existing Clerk → Supabase identity bridge (household + user_prefs row created on first login) stays exactly as it currently works. **Do not add a claim/merge branch** — that was only needed for the anonymous-workspace approach, which is not being built.

## 2. Household Creation + Sample Data Seeding

When the first-login trigger creates the household and user_prefs row, extend that same step (same transaction if practical) to also seed sample data:

- One default template
- A small set of sample categories
- 1–2 sample creditors / bills
- One sample income source
- One populated Pay Date Card built from the above, so the user's first view of the app is not empty

**Tagging:** seeded rows need to be identifiable later for the "start fresh" wipe (Section 7). Use whatever flagging mechanism is most consistent with the current schema conventions — confirm the actual approach against the live schema before implementing, rather than assuming a specific column name here.

**Idempotency:** reuse the existing `.maybeSingle()`-style existence check already in place for household/user_prefs creation, so seeding never double-fires on a session refresh or repeated first-login trigger.

## 3. Onboarding Tour — React Joyride

- Fires after sample data exists, walking the user through the interface using DOM anchor points. A prior session scoped these anchors (`create-month-button`, `pay-date-card`, `add-bill-button`, `remaining-balance`) — confirm these still exist and are named consistently in the current codebase before wiring the tour, rather than assuming the prior naming is still accurate.
- On completion or skip, release the user directly onto their seeded Pay Date Card. That *is* the reward moment — no separate congratulations screen needed.
- Store tour-completed state in the existing `user_prefs` jsonb blob so it never re-fires on subsequent logins.

## 4. FAQ / Help

- Single `/help` route. Not a documentation site, not a CMS.
- One short section per core product surface: Pay Boards, Bills & Income, Templates, Debt Tracker.
- 2–3 sentences and an optional single screenshot per section.
- Static content (markdown or hardcoded components) is sufficient for v1.

## 5. Landing Page

✅ **Implemented** at `/` (`components/marketing/*`) — see `docs/specs/payboard.md` → **Public Pages (Pre-Authentication)** for the full component breakdown.

- Minimal: hero, one-sentence value proposition, CTA straight into Google sign-up. ✅
- Visual: illustrated mock Pay Date Cards (`CardShowcase.tsx`), not a live connected demo — matches the static-media requirement below. ✅
- Links to Privacy Policy and Terms of Service — both now fully written (`/privacy`, `/terms`), not just linked. ✅
- Light SEO pass: meta description, title tag, OG tags. **Not done** — landing page still inherits the generic root `app/layout.tsx` metadata.

## 6. Household Collaboration / Invitations

- **Free tier:** one household, up to 2 members. Collaboration itself is not gated — only growth beyond that is.
- **Paid tier:** additional members and/or multiple workspaces. Exact limits are a pricing decision, not a blocker for this spec.

**New tables:**
- `household_members` — does not replace `users.household_id`, which remains the single authoritative column for all household-scoped data access (creditors, incomes, boards, bills, etc.). Instead it backs `is_household_member()` / `is_household_owner()` (`SECURITY DEFINER`, see `docs/supabase/SCHEMA_DDL.sql`), used for: (1) the `users` table's own SELECT policy, since a self-referential subquery on `users` for "can I see my household-mates' rows" hit RLS recursion — routing through `household_members` instead avoids that; and (2) invite-management authorization (who may send/accept invites, enforcing the free-tier 2-member cap). See `docs/specs/payboard.md` → **Household model**.
- `household_invites` — `email`, `token`, `expires_at`, `status` (`pending` / `accepted` / `expired` / `revoked`)

**Flow:**
1. Household owner enters an invite email from Settings.
2. Server action generates a token, writes a `household_invites` row, sends the invite via Resend (reuse the pattern already planned for the feedback route).
3. Invitee opens `/join?token=...`.
4. If they don't have a Clerk account, they sign up (Google) first.
5. Token is validated server-side — not expired, not already used.
6. A `household_members` row is created linking the new user to the household; the invite is marked accepted.
7. Invitee is routed to the **invitee-specific onboarding path**: skip sample-data seeding and skip the Joyride "first card" steps entirely — they're landing in an already-populated household, not an empty one.

**Enforcement:** a server action checks current member count against the tier limit before allowing an invite to be sent or accepted.

✅ **Hardened (August 2026):** `createInvite` is now rate-limited (5/hour per user, `lib/rate-limit.ts`) and validates email/token input via Zod before touching Supabase or Resend. Resend's client is now a lazy singleton (`lib/resend.ts`) so a missing API key only breaks the send path. See `docs/specs/payboard.md` → **Security & Server Action Hardening**.

**Edge cases to handle explicitly:**
- Invalid, expired, or already-used token → generic "this invite is no longer valid" message. Don't be more specific than that (avoids leaking whether an email already has an account).
- A user who already belongs to a household clicks an invite → block with a clear message. Multi-household support isn't built yet, so don't attempt to silently handle it.

## 7. Sample Data Cleanup ("Start Fresh")

✅ **Implemented.** Settings → Overview → Data card, shown only while seeded rows remain. `startFresh()` (`app/actions/sample-data.ts`) calls a single Postgres RPC (`wipe_sample_data`) that deletes every `is_sample = true` row across `creditors`, `incomes`, `board_templates`, and `boards` for the household as one transaction — household shell and `user_prefs` untouched, matching the spec below. Two-step confirm in the UI. See `docs/specs/payboard.md` → **Sample Data & Start Fresh**.

- Already scoped as a pre-launch product gap; this section is what it actually needs to do.
- One Settings action that deletes all sample-tagged rows (per Section 2) for the household, leaving the household shell and user_prefs intact.

---

## Phasing

| Phase | Scope | Notes |
|---|---|---|
| 1 | `household_members` + `household_invites` schema, RLS coverage confirmed | Everything else in Section 6 depends on this existing first |
| 2 | Sample data seeding hook into existing first-login trigger | Build seed content + tagging mechanism |
| 3 | Joyride tour wiring against current DOM anchors + `user_prefs` completion flag | Confirm anchors against live code first |
| 4 | Invite flow: server actions, `/join` route, Resend email template, tier-limit enforcement | Depends on Phase 1 |
| 5 | Landing page, `/help` page, Privacy Policy, Terms | Lowest technical risk — can run in parallel with 1–4 |
| 6 | "Start fresh" wipe action | Depends on Phase 2's tagging mechanism |

## Do Not Touch

- Existing dual-write / Supabase-first read logic
- Existing Pay Date Card component internals, beyond adding `data-tour` attributes needed for Phase 3
- Existing Session 2 bridge logic, beyond adding the seeding call from Phase 2 — no claim/merge branching, no anonymous-session handling
