-- ============================================================================
-- Current definition of create_household_for_user(). Run this in the
-- Supabase SQL editor (create or replace) to (re)apply it in full.
--
-- Fix 1 — concurrent first logins: two requests for the same new Clerk user
-- firing at once used to create two households. Serialized per clerk_id with
-- a transaction-scoped advisory lock, so the second concurrent request waits,
-- re-checks, and returns the first request's result instead of creating a
-- second household.
--
-- Note: uses pg_advisory_xact_lock (transaction-scoped), not
-- pg_advisory_lock/pg_advisory_unlock (session-scoped). Supabase's pooler
-- runs in transaction mode, where session-scoped advisory locks do not
-- reliably span statements on the same logical session — xact-scoped locks
-- are the safe choice and release automatically when the function's
-- implicit transaction ends, even on error.
--
-- Fix 2 — clerk_id churn on the same person: if a user's Clerk userId
-- changes between sign-ins (observed switching sign-in method/session in
-- development), the clerk_id lookup below misses and a first-login-shaped
-- request creates a brand new household even though the person already has
-- one. Before creating anything, fall back to matching an existing user row
-- by verified email; if found, re-link its clerk_id instead of creating a
-- duplicate household. Only creates a new household when neither clerk_id
-- nor email match any existing user, so this stays correct once multiple
-- real households exist (no "just pick the only household" shortcut).
-- ============================================================================

create or replace function create_household_for_user(
  p_clerk_id text,
  p_name text,
  p_email text,
  p_avatar_color text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    return jsonb_build_object(
      'userId', v_existing_user_id,
      'householdId', v_existing_household_id,
      'created', false
    );
  end if;

  -- No clerk_id match — before treating this as a first login, check
  -- whether a user row already exists under this email with a stale
  -- clerk_id. If so, re-link it rather than creating a duplicate household.
  if p_email is not null then
    select id, household_id into v_existing_user_id, v_existing_household_id
    from users
    where email = p_email
    order by created_at desc
    limit 1;

    if v_existing_user_id is not null then
      update users
      set clerk_id = p_clerk_id
      where id = v_existing_user_id;

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
$$;

-- security definer + an attacker-controlled p_clerk_id would let any
-- authenticated/anon client mint households and steal the mapping for
-- someone else's clerk_id if this were callable client-side. Restrict
-- execution to the service role (server-only, matches createAdminClient()).
revoke execute on function create_household_for_user(text, text, text, text) from public;
revoke execute on function create_household_for_user(text, text, text, text) from anon;
revoke execute on function create_household_for_user(text, text, text, text) from authenticated;
grant execute on function create_household_for_user(text, text, text, text) to service_role;
