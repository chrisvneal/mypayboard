-- ============================================================================
-- Fix: race condition in first-login onboarding creates duplicate households
-- when two requests for the same new Clerk user fire concurrently.
--
-- Run this in the Supabase SQL editor. Serializes household/user/user_prefs
-- creation per clerk_id with a transaction-scoped advisory lock so the
-- second concurrent request waits, re-checks, and returns the first
-- request's result instead of creating a second household.
--
-- Note: uses pg_advisory_xact_lock (transaction-scoped), not
-- pg_advisory_lock/pg_advisory_unlock (session-scoped). Supabase's pooler
-- runs in transaction mode, where session-scoped advisory locks do not
-- reliably span statements on the same logical session — xact-scoped locks
-- are the safe choice and release automatically when the function's
-- implicit transaction ends, even on error.
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
