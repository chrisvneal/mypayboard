-- ============================================================================
-- Phase 3 — household_members gains a write path
--
-- Context: migration 20260808041022_fix_users_select_household_visibility
-- repointed is_household_member() from querying `users` to querying
-- `household_members` (completing the Phase 4 repoint phase1 anticipated),
-- but nothing was updated to actually write to household_members at
-- onboarding time. Every user who signed up after that migration landed
-- with zero household_members rows, and is_household_member() silently
-- returned false for them — RLS filtered every household-scoped SELECT
-- down to zero rows (200, not an error), which surfaced in the app as
-- lib/hooks/useUsers.ts's "could not resolve Supabase user after retries"
-- log, misleadingly pointing at the Clerk JWT template instead of RLS.
--
-- This file documents (does not re-apply — already live via apply_migration)
-- two changes:
--   1. create_household_for_user() now inserts a household_members row
--      (role 'owner') for both the fresh-signup path and the email-relink
--      path.
--   2. A one-off backfill for accounts already stuck without a row.
-- ============================================================================

-- ============================================================================
-- create_household_for_user — adds household_members inserts.
-- Full definition kept here for reference; the two new INSERTs are the only
-- change from the version phase1/phase2 predate.
-- ============================================================================
create or replace function public.create_household_for_user(p_clerk_id text, p_name text, p_email text, p_avatar_color text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_lock_key bigint;
  v_household_id uuid;
  v_user_id uuid;
  v_existing_user_id uuid;
  v_existing_household_id uuid;
begin
  v_lock_key := hashtext(p_clerk_id)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  select id, household_id into v_existing_user_id, v_existing_household_id
  from users
  where clerk_id = p_clerk_id;

  if v_existing_user_id is not null then
    return jsonb_build_object(
      'userId', v_existing_user_id,
      'householdId', v_existing_household_id,
      'created', false
    );
  end if;

  if p_email is not null then
    select id, household_id into v_existing_user_id, v_existing_household_id
    from users
    where email = p_email
    order by created_at asc
    limit 1;

    if v_existing_user_id is not null then
      update users
      set clerk_id = p_clerk_id
      where id = v_existing_user_id;

      -- Safety net: this user predates household_members, or a prior
      -- onboarding pass never wrote its row.
      insert into household_members (household_id, user_id, role)
      values (v_existing_household_id, v_existing_user_id, 'owner')
      on conflict (household_id, user_id) do nothing;

      return jsonb_build_object(
        'userId', v_existing_user_id,
        'householdId', v_existing_household_id,
        'created', false,
        'relinked', true
      );
    end if;
  end if;

  insert into households (name, app_version)
  values ('My Household', '1.0')
  returning id into v_household_id;

  insert into users (household_id, clerk_id, name, email, avatar_color, role)
  values (v_household_id, p_clerk_id, p_name, p_email, p_avatar_color, 'admin')
  returning id into v_user_id;

  insert into household_members (household_id, user_id, role)
  values (v_household_id, v_user_id, 'owner');

  insert into user_prefs (user_id, household_id, prefs)
  values (
    v_user_id,
    v_household_id,
    jsonb_build_object('theme', 'daylight', 'has_seen_onboarding', false)
  );

  return jsonb_build_object(
    'userId', v_user_id,
    'householdId', v_household_id,
    'created', true
  );
end;
$function$;

-- ============================================================================
-- Backfill — one household_members row per users row still missing one.
-- NOT EXISTS, not NOT IN — household_members.user_id has a NOT NULL
-- constraint, but NOT EXISTS is used on principle since a NULL anywhere in
-- a NOT IN subquery silently matches zero rows.
-- ============================================================================
insert into household_members (household_id, user_id, role)
select u.household_id, u.id, 'owner'
from users u
where not exists (
  select 1 from household_members hm where hm.user_id = u.id
)
on conflict (household_id, user_id) do nothing;

-- ============================================================================
-- Verification — run after and report results back.
-- ============================================================================

-- Every user should now have a household_members row (0 rows = pass).
select u.id, u.household_id
from users u
where not exists (
  select 1 from household_members hm where hm.user_id = u.id
);
