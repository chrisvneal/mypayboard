-- ============================================================================
-- Self-heal household_members on the clerk_id-match path too
--
-- Context: create_household_for_user already self-heals a missing
-- household_members row on the email-relink path (added in
-- 20260808041022_fix_users_select_household_visibility /
-- 20260808093142_add_household_members_insert_to_create_household_for_user —
-- see docs/supabase/migrations/phase3_household_members_write_path.sql), but
-- the primary "user already exists by clerk_id" branch never got the same
-- treatment. A straggler account found via clerk_id match (rather than the
-- email-relink path) would stay silently missing its household_members row
-- forever, hitting the exact RLS-filters-to-zero-rows failure mode the
-- earlier fix was written to close.
--
-- This still reads users.household_id as the resilient anchor value for
-- this insert (that column remains NOT NULL and required until it's
-- dropped from `users` — this function's own reads of it aren't otherwise
-- being touched here, only the missing self-heal insert is added).
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
  -- Stable per-clerk-id lock key; blocks concurrent calls for the same user
  -- for the duration of this transaction only.
  v_lock_key := hashtext(p_clerk_id)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- Re-check inside the lock — another request may have just finished.
  select id, household_id into v_existing_user_id, v_existing_household_id
  from users
  where clerk_id = p_clerk_id;

  if v_existing_user_id is not null then
    -- Safety net: this user predates the household_members table, or a
    -- prior onboarding pass never wrote its row. Without this, RLS's
    -- is_household_member() check silently filters every household-scoped
    -- query for them (200 + zero rows) rather than surfacing an error.
    insert into household_members (household_id, user_id, role)
    values (v_existing_household_id, v_existing_user_id, 'owner')
    on conflict (household_id, user_id) do nothing;

    return jsonb_build_object(
      'userId', v_existing_user_id,
      'householdId', v_existing_household_id,
      'created', false
    );
  end if;

  -- No clerk_id match — before treating this as a first login, check
  -- whether a user row already exists under this email with a stale
  -- clerk_id. If so, re-link it rather than creating a duplicate household.
  -- Oldest row wins: if past duplicates exist for this email, the oldest is
  -- the original household with the real data — `desc` here would re-link
  -- into the newest (empty duplicate) and present as total data loss.
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

      -- Safety net: this user predates the household_members table, or a
      -- prior onboarding pass never wrote its row. Without this, RLS's
      -- is_household_member() check silently filters every household-scoped
      -- query for them (200 + zero rows) rather than surfacing an error.
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
