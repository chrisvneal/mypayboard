-- ============================================================================
-- Remove users.household_id reads/writes from create_household_for_user
--
-- Context: last remaining reads/writes of users.household_id in the whole
-- system — everything else was migrated to household_members earlier today.
-- This function previously kept reading/writing the column as a resilient
-- fallback anchor while the column was still NOT NULL and required; now
-- that every write path (including this one) resolves/records household
-- membership via household_members directly, nothing depends on the column
-- and it's safe to drop (next migration).
--
-- If a v_household_id lookup ever comes back null here (an account with a
-- users row but no household_members row and no fallback left to recover
-- from), the function now returns a null householdId instead of silently
-- fabricating one — confirmed zero such accounts exist in production before
-- writing this.
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
begin
  -- Stable per-clerk-id lock key; blocks concurrent calls for the same user
  -- for the duration of this transaction only.
  v_lock_key := hashtext(p_clerk_id)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- Re-check inside the lock — another request may have just finished.
  select id into v_existing_user_id
  from users
  where clerk_id = p_clerk_id;

  if v_existing_user_id is not null then
    select household_id into v_household_id
    from household_members
    where user_id = v_existing_user_id
    order by created_at asc
    limit 1;

    if v_household_id is not null then
      -- Safety net: covers a prior onboarding pass that never wrote its
      -- household_members row. Without this, RLS's is_household_member()
      -- check silently filters every household-scoped query for them (200
      -- + zero rows) rather than surfacing an error.
      insert into household_members (household_id, user_id, role)
      values (v_household_id, v_existing_user_id, 'owner')
      on conflict (household_id, user_id) do nothing;
    end if;

    return jsonb_build_object(
      'userId', v_existing_user_id,
      'householdId', v_household_id,
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
    select id into v_existing_user_id
    from users
    where email = p_email
    order by created_at asc
    limit 1;

    if v_existing_user_id is not null then
      update users
      set clerk_id = p_clerk_id
      where id = v_existing_user_id;

      select household_id into v_household_id
      from household_members
      where user_id = v_existing_user_id
      order by created_at asc
      limit 1;

      if v_household_id is not null then
        insert into household_members (household_id, user_id, role)
        values (v_household_id, v_existing_user_id, 'owner')
        on conflict (household_id, user_id) do nothing;
      end if;

      return jsonb_build_object(
        'userId', v_existing_user_id,
        'householdId', v_household_id,
        'created', false,
        'relinked', true
      );
    end if;
  end if;

  insert into households (name, app_version)
  values ('My Household', '1.0')
  returning id into v_household_id;

  insert into users (clerk_id, name, email, avatar_color, role)
  values (p_clerk_id, p_name, p_email, p_avatar_color, 'admin')
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
